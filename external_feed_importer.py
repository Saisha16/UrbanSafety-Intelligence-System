#!/usr/bin/env python3
"""
Scheduled external feed importer for SafeGuard incidents.

Features:
- Polls JSON/CSV feed URL or local file on interval
- Maps incoming records to backend ingest schema
- Generates deterministic externalId when missing
- Posts to /api/incidents/ingest with X-Ingestion-Key header

Usage:
  python external_feed_importer.py --config external_feed_importer_config.json
  python external_feed_importer.py --config external_feed_importer_config.json --once
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from urllib import error, parse, request


DEFAULT_CONFIG_PATH = "external_feed_importer_config.json"


@dataclass
class ImporterConfig:
    source: str
    ingest_url: str
    ingestion_key: str
    poll_interval_seconds: int
    timeout_seconds: int
    format: str
    feed_url: Optional[str]
    feed_file: Optional[str]
    batch_size: int
    field_map: Dict[str, str]
    max_retries: int
    retry_initial_delay_seconds: int
    retry_max_delay_seconds: int
    dead_letter_file: str


def load_config(path: str) -> ImporterConfig:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    source = str(raw.get("source", "external-feed")).strip()
    ingest_url = str(raw.get("ingest_url", "http://localhost:8080/api/incidents/ingest")).strip()
    ingestion_key = str(raw.get("ingestion_key", "dev-ingestion-key")).strip()
    poll_interval_seconds = int(raw.get("poll_interval_seconds", 60))
    timeout_seconds = int(raw.get("timeout_seconds", 15))
    data_format = str(raw.get("format", "auto")).strip().lower()
    feed_url = raw.get("feed_url")
    feed_file = raw.get("feed_file")
    batch_size = int(raw.get("batch_size", 200))
    max_retries = int(raw.get("max_retries", 3))
    retry_initial_delay_seconds = int(raw.get("retry_initial_delay_seconds", 2))
    retry_max_delay_seconds = int(raw.get("retry_max_delay_seconds", 30))
    dead_letter_file = str(raw.get("dead_letter_file", "external_feed_dead_letter.jsonl")).strip()

    field_map = raw.get("field_map") or {
        "externalId": "externalId",
        "incidentType": "incidentType",
        "description": "description",
        "latitude": "latitude",
        "longitude": "longitude",
        "severity": "severity",
        "status": "status",
        "eventTimestamp": "eventTimestamp",
    }

    if not source:
        raise ValueError("config.source is required")
    if not ingest_url:
        raise ValueError("config.ingest_url is required")
    if not ingestion_key:
        raise ValueError("config.ingestion_key is required")
    if not feed_url and not feed_file:
        raise ValueError("Provide either config.feed_url or config.feed_file")

    return ImporterConfig(
        source=source,
        ingest_url=ingest_url,
        ingestion_key=ingestion_key,
        poll_interval_seconds=max(5, poll_interval_seconds),
        timeout_seconds=max(5, timeout_seconds),
        format=data_format,
        feed_url=str(feed_url).strip() if feed_url else None,
        feed_file=str(feed_file).strip() if feed_file else None,
        batch_size=max(1, batch_size),
        field_map={str(k): str(v) for k, v in field_map.items()},
        max_retries=max(0, max_retries),
        retry_initial_delay_seconds=max(1, retry_initial_delay_seconds),
        retry_max_delay_seconds=max(1, retry_max_delay_seconds),
        dead_letter_file=dead_letter_file,
    )


def fetch_feed_text(cfg: ImporterConfig) -> str:
    if cfg.feed_file:
        return Path(cfg.feed_file).read_text(encoding="utf-8")

    if not cfg.feed_url:
        raise ValueError("Missing feed_url")

    req = request.Request(cfg.feed_url, method="GET")
    with request.urlopen(req, timeout=cfg.timeout_seconds) as resp:
        body = resp.read()
        return body.decode("utf-8")


def detect_format(cfg: ImporterConfig, text: str) -> str:
    if cfg.format in ("json", "csv"):
        return cfg.format

    sample = text.lstrip()
    if sample.startswith("{") or sample.startswith("["):
        return "json"
    return "csv"


def parse_json_records(text: str) -> List[Dict[str, Any]]:
    payload = json.loads(text)
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]

    if isinstance(payload, dict):
        for key in ("incidents", "records", "data", "items"):
            rows = payload.get(key)
            if isinstance(rows, list):
                return [row for row in rows if isinstance(row, dict)]

    raise ValueError("JSON feed must be an array of objects or contain incidents/records/data/items array")


def parse_csv_records(text: str) -> List[Dict[str, Any]]:
    reader = csv.DictReader(text.splitlines())
    rows: List[Dict[str, Any]] = []
    for row in reader:
        if not isinstance(row, dict):
            continue
        rows.append({k: v for k, v in row.items()})
    return rows


def to_float(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def pick(src: Dict[str, Any], field_map: Dict[str, str], logical_name: str) -> Any:
    src_key = field_map.get(logical_name, logical_name)
    return src.get(src_key)


def build_external_id(source: str, row: Dict[str, Any], field_map: Dict[str, str]) -> str:
    raw = {
        "source": source,
        "incidentType": str(pick(row, field_map, "incidentType") or "").strip().lower(),
        "description": str(pick(row, field_map, "description") or "").strip().lower(),
        "latitude": str(pick(row, field_map, "latitude") or "").strip(),
        "longitude": str(pick(row, field_map, "longitude") or "").strip(),
        "eventTimestamp": str(pick(row, field_map, "eventTimestamp") or "").strip(),
    }
    digest = hashlib.sha1(json.dumps(raw, sort_keys=True).encode("utf-8")).hexdigest()
    return f"AUTO-{digest[:16]}"


def normalize_incident(source: str, row: Dict[str, Any], field_map: Dict[str, str]) -> Optional[Dict[str, Any]]:
    incident_type = str(pick(row, field_map, "incidentType") or "").strip()
    description = str(pick(row, field_map, "description") or "").strip()
    latitude = to_float(pick(row, field_map, "latitude"))
    longitude = to_float(pick(row, field_map, "longitude"))

    if not incident_type or not description or latitude is None or longitude is None:
        return None

    ext_id = str(pick(row, field_map, "externalId") or "").strip()
    if not ext_id:
        ext_id = build_external_id(source, row, field_map)

    out: Dict[str, Any] = {
        "externalId": ext_id,
        "incidentType": incident_type,
        "description": description,
        "latitude": latitude,
        "longitude": longitude,
    }

    severity = str(pick(row, field_map, "severity") or "").strip()
    if severity:
        out["severity"] = severity

    status = str(pick(row, field_map, "status") or "").strip()
    if status:
        out["status"] = status

    event_ts = str(pick(row, field_map, "eventTimestamp") or "").strip()
    if event_ts:
        out["eventTimestamp"] = event_ts

    return out


def chunked(items: List[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def post_ingest(cfg: ImporterConfig, incidents: List[Dict[str, Any]]) -> Dict[str, Any]:
    payload = {
        "source": cfg.source,
        "incidents": incidents,
    }
    body = json.dumps(payload).encode("utf-8")

    req = request.Request(
        cfg.ingest_url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Ingestion-Key": cfg.ingestion_key,
        },
    )

    try:
        with request.urlopen(req, timeout=cfg.timeout_seconds) as resp:
            text = resp.read().decode("utf-8")
            return json.loads(text) if text else {"success": True}
    except error.HTTPError as e:
        err_text = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ingest failed: status={e.code} body={err_text}") from e


def write_dead_letter(cfg: ImporterConfig, incidents: List[Dict[str, Any]], err_msg: str) -> None:
    entry = {
        "timestamp": int(time.time()),
        "source": cfg.source,
        "ingest_url": cfg.ingest_url,
        "error": err_msg,
        "count": len(incidents),
        "incidents": incidents,
    }
    dlq_path = Path(cfg.dead_letter_file)
    dlq_path.parent.mkdir(parents=True, exist_ok=True)
    with dlq_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=True) + "\n")


def post_ingest_with_retry(cfg: ImporterConfig, incidents: List[Dict[str, Any]]) -> Dict[str, Any]:
    attempt = 0
    last_error = "unknown"

    while attempt <= cfg.max_retries:
        try:
            return post_ingest(cfg, incidents)
        except Exception as e:
            last_error = str(e)
            if attempt == cfg.max_retries:
                write_dead_letter(cfg, incidents, last_error)
                raise

            delay = min(
                cfg.retry_max_delay_seconds,
                cfg.retry_initial_delay_seconds * (2 ** attempt),
            )
            print(
                f"[importer] ingest attempt {attempt + 1} failed, retrying in {delay}s: {last_error}"
            )
            time.sleep(delay)
            attempt += 1

    write_dead_letter(cfg, incidents, last_error)
    raise RuntimeError(last_error)


def run_once(cfg: ImporterConfig) -> None:
    raw_text = fetch_feed_text(cfg)
    fmt = detect_format(cfg, raw_text)

    rows = parse_json_records(raw_text) if fmt == "json" else parse_csv_records(raw_text)

    normalized: List[Dict[str, Any]] = []
    dropped = 0
    for row in rows:
        item = normalize_incident(cfg.source, row, cfg.field_map)
        if item is None:
            dropped += 1
            continue
        normalized.append(item)

    if not normalized:
        print(f"[importer] no valid incidents found (rows={len(rows)}, dropped={dropped})")
        return

    total_created = 0
    total_updated = 0

    for batch in chunked(normalized, cfg.batch_size):
        resp = post_ingest_with_retry(cfg, batch)
        total_created += int(resp.get("created", 0))
        total_updated += int(resp.get("updated", 0))

    print(
        "[importer] ingest ok "
        f"source={cfg.source} format={fmt} rows={len(rows)} valid={len(normalized)} dropped={dropped} "
        f"created={total_created} updated={total_updated}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Scheduled external feed importer")
    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH, help="Path to importer config JSON")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except Exception as e:
        print(f"[importer] config error: {e}")
        return 2

    print(
        "[importer] started "
        f"source={cfg.source} ingest_url={cfg.ingest_url} interval={cfg.poll_interval_seconds}s"
    )

    if args.once:
        try:
            run_once(cfg)
            return 0
        except Exception as e:
            print(f"[importer] run failed: {e}")
            return 1

    while True:
        start = time.time()
        try:
            run_once(cfg)
        except Exception as e:
            print(f"[importer] run failed: {e}")

        elapsed = int(time.time() - start)
        sleep_for = max(1, cfg.poll_interval_seconds - elapsed)
        time.sleep(sleep_for)


if __name__ == "__main__":
    sys.exit(main())
