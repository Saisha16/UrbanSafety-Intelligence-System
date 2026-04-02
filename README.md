
SAFEGUARD AI ADVANCED PROJECT

Tech Stack
React
Spring Boot
FastAPI
PostgreSQL
Leaflet Maps

Run order:

1 Start AI service
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

2 Start backend
cd backend-java
mvn spring-boot:run

3 Start frontend
cd frontend
npm install
npm start

External Incident Feed Ingestion

Endpoint:
POST http://localhost:8080/api/incidents/ingest

Auth header:
X-Ingestion-Key: dev-ingestion-key

Config key:
backend-java/src/main/resources/application.properties
ingestion.api-key=dev-ingestion-key

Sample payload:
{
	"source": "city-open-feed",
	"incidents": [
		{
			"externalId": "BLR-EXT-1001",
			"incidentType": "theft",
			"description": "Wallet snatch near bus stop",
			"latitude": 12.9762,
			"longitude": 77.6033,
			"severity": "HIGH",
			"status": "PENDING",
			"eventTimestamp": "2026-03-27T21:45:00+05:30"
		}
	]
}

Notes:
- `externalId` + `source` is used for upsert behavior (existing records are updated, not duplicated).
- Ingested records are visible in `GET /api/incidents` for POLICE and GOVERNMENT users.

Scheduled Importer (CSV/JSON URL -> ingest endpoint)

Files added:
- `external_feed_importer.py`
- `external_feed_importer_config.json`
- `external_feed_sample.json`

Run once:
python external_feed_importer.py --config external_feed_importer_config.json --once

Run continuously (polling):
python external_feed_importer.py --config external_feed_importer_config.json

Config notes (`external_feed_importer_config.json`):
- Set either `feed_url` or `feed_file`
- `format`: `auto`, `json`, or `csv`
- `poll_interval_seconds`: importer schedule interval
- `field_map`: map source field names to required ingest schema
- Retry and resilience:
	- `max_retries`
	- `retry_initial_delay_seconds`
	- `retry_max_delay_seconds`
	- `dead_letter_file` (failed batches are appended as JSON lines)

Windows Task Scheduler setup (background auto-run)

Create/update and start task:
powershell -ExecutionPolicy Bypass -File .\setup_importer_task.ps1

Optional arguments:
powershell -ExecutionPolicy Bypass -File .\setup_importer_task.ps1 -TaskName "SafeGuardExternalFeedImporter" -ConfigPath "external_feed_importer_config.json" -IntervalMinutes 1

Stop/remove task:
Stop-ScheduledTask -TaskName "SafeGuardExternalFeedImporter"
Unregister-ScheduledTask -TaskName "SafeGuardExternalFeedImporter" -Confirm:$false
