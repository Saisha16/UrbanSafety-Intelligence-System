package com.safeguard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safeguard.security.JwtUtil;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * Incident Reporting and SOS Emergency Controller
 * Handles citizen-submitted incidents and emergency alerts
 */
@RestController
@RequestMapping("/api")
@CrossOrigin
@Tag(name = "Incident Management", description = "Incident reporting and SOS emergency endpoints")
public class IncidentController {

    private static final Logger log = LoggerFactory.getLogger(IncidentController.class);
    private static final Object STORE_LOCK = new Object();
    
    // In-memory storage for demo (replace with database in production)
    private static final List<Map<String, Object>> incidents = Collections.synchronizedList(new ArrayList<>());
    private static final List<Map<String, Object>> sosAlerts = Collections.synchronizedList(new ArrayList<>());
    private static final List<Map<String, Object>> patrols = Collections.synchronizedList(new ArrayList<>());
    private static final List<Map<String, Object>> demands = Collections.synchronizedList(new ArrayList<>());
    
    private static int incidentIdCounter = 1;
    private static int sosIdCounter = 1;
    private static int patrolIdCounter = 1;
    private static int demandIdCounter = 1;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Value("${ingestion.api-key:dev-ingestion-key}")
    private String ingestionApiKey;

    @PostConstruct
    public void initStore() {
        loadStore();
    }

    private Path resolveStoreFile() {
        Path cwd = Paths.get(System.getProperty("user.dir"));
        Path repoRootStore = cwd.resolve("backend-java").resolve("data").resolve("incident_store.json");
        if (Files.exists(cwd.resolve("backend-java"))) {
            return repoRootStore;
        }
        return cwd.resolve("data").resolve("incident_store.json");
    }

    private void loadStore() {
        synchronized (STORE_LOCK) {
            try {
                IncidentStoreData loaded = null;

                if (jdbcTemplate != null) {
                    loaded = loadStoreFromDb();
                }

                if (loaded == null) {
                    Path storeFile = resolveStoreFile();
                    if (!Files.exists(storeFile)) {
                        log.info("Incident store not found, starting with empty in-memory store at {}", storeFile.toAbsolutePath());
                        return;
                    }
                    loaded = objectMapper.readValue(storeFile.toFile(), IncidentStoreData.class);
                }

                incidents.clear();
                sosAlerts.clear();
                patrols.clear();
                demands.clear();
                if (loaded.incidents != null) incidents.addAll(loaded.incidents);
                if (loaded.sosAlerts != null) sosAlerts.addAll(loaded.sosAlerts);
                if (loaded.patrols != null) patrols.addAll(loaded.patrols);
                if (loaded.demands != null) demands.addAll(loaded.demands);
                incidentIdCounter = loaded.incidentIdCounter <= 0 ? 1 : loaded.incidentIdCounter;
                sosIdCounter = loaded.sosIdCounter <= 0 ? 1 : loaded.sosIdCounter;
                patrolIdCounter = loaded.patrolIdCounter <= 0 ? 1 : loaded.patrolIdCounter;
                demandIdCounter = loaded.demandIdCounter <= 0 ? 1 : loaded.demandIdCounter;

                log.info(
                    "Loaded persisted store: {} incidents, {} sos alerts, {} patrols, {} demands",
                    incidents.size(),
                    sosAlerts.size(),
                    patrols.size(),
                    demands.size()
                );
            } catch (Exception e) {
                log.error("Failed loading incident store, continuing with empty in-memory store", e);
            }
        }
    }

    private void persistStore() {
        synchronized (STORE_LOCK) {
            try {
                IncidentStoreData data = new IncidentStoreData();
                data.incidentIdCounter = incidentIdCounter;
                data.sosIdCounter = sosIdCounter;
                data.patrolIdCounter = patrolIdCounter;
                data.demandIdCounter = demandIdCounter;
                data.incidents = new ArrayList<>(incidents);
                data.sosAlerts = new ArrayList<>(sosAlerts);
                data.patrols = new ArrayList<>(patrols);
                data.demands = new ArrayList<>(demands);

                if (jdbcTemplate != null) {
                    persistStoreToDb(data);
                } else {
                    Path storeFile = resolveStoreFile();
                    Files.createDirectories(storeFile.getParent());
                    objectMapper.writerWithDefaultPrettyPrinter().writeValue(storeFile.toFile(), data);
                }
            } catch (Exception e) {
                log.error("Failed persisting incident store", e);
            }
        }
    }

    private IncidentStoreData loadStoreFromDb() {
        try {
            ensureDbStoreTable();
            String json = jdbcTemplate.queryForObject(
                "SELECT payload_json FROM app_store WHERE store_key = ?",
                String.class,
                "incident_store"
            );
            if (json == null || json.trim().isEmpty()) {
                return null;
            }
            return objectMapper.readValue(json, IncidentStoreData.class);
        } catch (EmptyResultDataAccessException e) {
            return null;
        } catch (Exception e) {
            log.warn("Failed loading store from DB, will fallback to file if available", e);
            return null;
        }
    }

    private void persistStoreToDb(IncidentStoreData data) {
        ensureDbStoreTable();
        try {
            String payload = objectMapper.writeValueAsString(data);
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM app_store WHERE store_key = ?",
                Integer.class,
                "incident_store"
            );
            if (count != null && count > 0) {
                jdbcTemplate.update(
                    "UPDATE app_store SET payload_json = ?, updated_at = CURRENT_TIMESTAMP WHERE store_key = ?",
                    payload,
                    "incident_store"
                );
            } else {
                jdbcTemplate.update(
                    "INSERT INTO app_store (store_key, payload_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    "incident_store",
                    payload
                );
            }
        } catch (Exception e) {
            log.error("Failed persisting store to DB", e);
            throw new RuntimeException(e);
        }
    }

    private void ensureDbStoreTable() {
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS app_store (" +
            "store_key VARCHAR(128) PRIMARY KEY, " +
            "payload_json CLOB NOT NULL, " +
            "updated_at TIMESTAMP NOT NULL)"
        );
    }

    @PostMapping("/incidents")
    @Operation(summary = "Report Incident", description = "Submit a new incident report from citizens")
    public ResponseEntity<Map<String, Object>> reportIncident(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody IncidentReportDTO request) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "CITIZEN", "POLICE");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            log.info("Received incident report: type={}, location=({},{})", 
                request.incidentType, request.latitude, request.longitude);
            
            Map<String, Object> incident = new HashMap<>();
            incident.put("id", incidentIdCounter++);
            incident.put("type", request.incidentType);
            incident.put("description", request.description);
            incident.put("latitude", request.latitude);
            incident.put("longitude", request.longitude);
            incident.put("reportedBy", actor.email != null ? actor.email : request.reportedBy);
            incident.put("timestamp", new Date().toString());
            incident.put("status", "PENDING");
            incident.put("severity", determineSeverity(request.incidentType));
            addAuditEvent(incident, "INCIDENT_REPORTED", actor, request.description);
            
            incidents.add(incident);
            persistStore();
            
            log.info("Incident reported successfully - ID: {}", incident.get("id"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Incident reported successfully");
            response.put("incidentId", incident.get("id"));
            response.put("status", "PENDING");
            response.put("estimatedResponseTime", "15-30 minutes");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            log.error("Failed to report incident: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to submit incident report");
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/incidents")
    @Operation(summary = "Get Incidents", description = "Retrieve incident reports (with optional filtering)")
    public ResponseEntity<Map<String, Object>> getIncidents(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "limit", defaultValue = "50") int limit) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "POLICE", "GOVERNMENT");
        if (denied != null) return denied;
        try {
            log.info("Fetching incidents - status={}, type={}, limit={}", status, type, limit);
            
            List<Map<String, Object>> filtered = new ArrayList<>(incidents);
            
            // Filter by status
            if (status != null && !status.isEmpty()) {
                filtered.removeIf(inc -> !status.equalsIgnoreCase((String) inc.get("status")));
            }
            
            // Filter by type
            if (type != null && !type.isEmpty()) {
                filtered.removeIf(inc -> !type.equalsIgnoreCase((String) inc.get("type")));
            }
            
            // Limit results
            if (filtered.size() > limit) {
                filtered = filtered.subList(0, limit);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("total", filtered.size());
            response.put("incidents", filtered);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to fetch incidents: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to retrieve incidents");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/incidents/ingest")
    @Operation(summary = "Ingest External Incidents", description = "Ingest incidents from external feeds using API key authentication")
    public ResponseEntity<Map<String, Object>> ingestExternalIncidents(
            @RequestHeader(value = "X-Ingestion-Key", required = false) String apiKey,
            @Valid @RequestBody ExternalIncidentIngestRequest request) {
        if (!isValidIngestionKey(apiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorBody("Invalid ingestion key"));
        }

        try {
            int created = 0;
            int updated = 0;

            ActorInfo actor = new ActorInfo();
            actor.role = "EXTERNAL_FEED";
            actor.name = request.source == null ? "external-feed" : request.source;

            synchronized (incidents) {
                for (ExternalIncidentDTO ext : request.incidents) {
                    String externalSource = request.source == null ? "external" : request.source.trim();
                    String externalId = ext.externalId == null ? null : ext.externalId.trim();

                    Optional<Map<String, Object>> existing = Optional.empty();
                    if (externalId != null && !externalId.isEmpty()) {
                        existing = incidents.stream()
                            .filter(inc -> externalId.equals(String.valueOf(inc.get("externalId")))
                                && externalSource.equals(String.valueOf(inc.get("externalSource"))))
                            .findFirst();
                    }

                    Map<String, Object> row;
                    if (existing.isPresent()) {
                        row = existing.get();
                        updated++;
                    } else {
                        row = new HashMap<>();
                        row.put("id", incidentIdCounter++);
                        incidents.add(row);
                        created++;
                    }

                    row.put("type", ext.incidentType.toUpperCase(Locale.ROOT));
                    row.put("description", ext.description);
                    row.put("latitude", ext.latitude);
                    row.put("longitude", ext.longitude);
                    row.put("reportedBy", externalSource);
                    row.put("status", ext.status == null || ext.status.trim().isEmpty() ? "PENDING" : ext.status.toUpperCase(Locale.ROOT));
                    row.put("severity", ext.severity == null || ext.severity.trim().isEmpty() ? determineSeverity(ext.incidentType) : ext.severity);
                    row.put("timestamp", ext.eventTimestamp == null || ext.eventTimestamp.trim().isEmpty() ? new Date().toString() : ext.eventTimestamp);
                    row.put("updatedAt", new Date().toString());
                    row.put("externalSource", externalSource);
                    if (externalId != null && !externalId.isEmpty()) {
                        row.put("externalId", externalId);
                    }

                    addAuditEvent(
                        row,
                        existing.isPresent() ? "INCIDENT_INGEST_UPDATED" : "INCIDENT_INGESTED",
                        actor,
                        "source=" + externalSource + (externalId == null ? "" : (", externalId=" + externalId))
                    );
                }
            }

            persistStore();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("source", request.source);
            response.put("received", request.incidents.size());
            response.put("created", created);
            response.put("updated", updated);
            response.put("message", "External incidents ingested successfully");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to ingest external incidents", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody("Failed to ingest external incidents"));
        }
    }

    @PostMapping("/sos")
    @Operation(summary = "SOS Emergency Alert", description = "Send emergency SOS alert with current location")
    public ResponseEntity<Map<String, Object>> sendSOS(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody SOSAlertDTO request) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "CITIZEN", "POLICE");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            log.warn("⚠️ SOS EMERGENCY ALERT - User: {}, Location: ({},{})", 
                request.userId, request.latitude, request.longitude);
            
            Map<String, Object> sos = new HashMap<>();
            sos.put("id", sosIdCounter++);
            sos.put("userId", actor.email != null ? actor.email : request.userId);
            sos.put("latitude", request.latitude);
            sos.put("longitude", request.longitude);
            sos.put("timestamp", new Date().toString());
            sos.put("status", "ACTIVE");
            sos.put("priority", "CRITICAL");
            addAuditEvent(sos, "SOS_RAISED", actor, "Emergency alert raised");
            
            sosAlerts.add(sos);
            persistStore();
            
            // In production: Trigger immediate notifications to:
            // - Emergency contacts
            // - Nearby police officers
            // - Emergency services
            log.warn("🚨 SOS Alert dispatched - ID: {}, notifying emergency services", sos.get("id"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "SOS alert sent successfully");
            response.put("alertId", sos.get("id"));
            response.put("status", "ACTIVE");
            response.put("emergencyContacted", Arrays.asList("Police", "Emergency Contacts", "Medical Services"));
            response.put("estimatedArrival", "5-10 minutes");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            log.error("Failed to send SOS alert: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to send SOS alert");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/sos")
    @Operation(summary = "Get SOS Alerts", description = "Retrieve active SOS alerts (for police/emergency services)")
    public ResponseEntity<Map<String, Object>> getSOSAlerts(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "status", defaultValue = "ACTIVE") String status) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "POLICE", "GOVERNMENT");
        if (denied != null) return denied;
        try {
            log.info("Fetching SOS alerts - status={}", status);
            
            List<Map<String, Object>> filtered = new ArrayList<>(sosAlerts);
            
            if (!status.equals("ALL")) {
                filtered.removeIf(sos -> !status.equalsIgnoreCase((String) sos.get("status")));
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("total", filtered.size());
            response.put("alerts", filtered);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to fetch SOS alerts: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to retrieve SOS alerts");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PatchMapping("/incidents/{id}/status")
    @Operation(summary = "Update Incident Status", description = "Update the status of an incident (for police/admin)")
    public ResponseEntity<Map<String, Object>> updateIncidentStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable("id") int id,
            @RequestParam("status") String status) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "POLICE", "GOVERNMENT");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            log.info("Updating incident {} to status: {}", id, status);
            
            Optional<Map<String, Object>> incident = incidents.stream()
                .filter(inc -> (Integer) inc.get("id") == id)
                .findFirst();
            
            if (incident.isPresent()) {
                incident.get().put("status", status);
                incident.get().put("updatedAt", new Date().toString());
                addAuditEvent(incident.get(), "INCIDENT_STATUS_UPDATED", actor, "Status -> " + status);
                persistStore();
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Incident status updated");
                response.put("incident", incident.get());
                
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Incident not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            
        } catch (Exception e) {
            log.error("Failed to update incident status: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to update incident");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/patrols")
    @Operation(summary = "Create Patrol", description = "Create a police patrol task with measurable progress")
    public ResponseEntity<Map<String, Object>> createPatrol(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @Valid @RequestBody PatrolCreateDTO request) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "POLICE");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            Map<String, Object> patrol = new HashMap<>();
            patrol.put("id", patrolIdCounter++);
            patrol.put("title", request.title);
            patrol.put("zone", request.zone);
            patrol.put("latitude", request.latitude);
            patrol.put("longitude", request.longitude);
            patrol.put("assignedUnit", request.assignedUnit);
            patrol.put("createdBy", actor.email != null ? actor.email : (request.createdBy == null ? "police" : request.createdBy));
            patrol.put("status", "ASSIGNED");
            patrol.put("progress", 0);
            patrol.put("notes", request.notes == null ? "" : request.notes);
            patrol.put("createdAt", new Date().toString());
            patrol.put("updatedAt", new Date().toString());
            addAuditEvent(patrol, "PATROL_CREATED", actor, "Patrol created for zone " + request.zone);

            patrols.add(patrol);
            persistStore();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Patrol task created");
            response.put("patrol", patrol);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to create patrol: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to create patrol task");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/patrols")
    @Operation(summary = "Get Patrols", description = "Get patrol tasks with optional status filtering")
    public ResponseEntity<Map<String, Object>> getPatrols(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "limit", defaultValue = "50") int limit
    ) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "POLICE", "GOVERNMENT");
        if (denied != null) return denied;
        try {
            List<Map<String, Object>> filtered = new ArrayList<>(patrols);
            if (status != null && !status.isEmpty()) {
                filtered.removeIf(p -> !status.equalsIgnoreCase(String.valueOf(p.get("status"))));
            }

            filtered.sort((a, b) -> {
                int idB = ((Number) b.getOrDefault("id", 0)).intValue();
                int idA = ((Number) a.getOrDefault("id", 0)).intValue();
                return Integer.compare(idB, idA);
            });

            if (filtered.size() > limit) {
                filtered = filtered.subList(0, limit);
            }

            long completed = filtered.stream()
                .filter(p -> "COMPLETED".equalsIgnoreCase(String.valueOf(p.get("status"))))
                .count();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("total", filtered.size());
            response.put("completed", completed);
            response.put("patrols", filtered);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to fetch patrols: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to retrieve patrols");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PatchMapping("/patrols/{id}/progress")
    @Operation(summary = "Update Patrol Progress", description = "Update patrol progress and status")
    public ResponseEntity<Map<String, Object>> updatePatrolProgress(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @PathVariable("id") int id,
        @RequestParam("progress") int progress,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "note", required = false) String note
    ) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "POLICE", "GOVERNMENT");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            Optional<Map<String, Object>> patrol = patrols.stream()
                .filter(p -> ((Number) p.get("id")).intValue() == id)
                .findFirst();

            if (!patrol.isPresent()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Patrol not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }

            int sanitized = Math.max(0, Math.min(100, progress));
            Map<String, Object> row = patrol.get();
            row.put("progress", sanitized);

            if (status != null && !status.trim().isEmpty()) {
                row.put("status", status.toUpperCase(Locale.ROOT));
            } else if (sanitized >= 100) {
                row.put("status", "COMPLETED");
            } else if (sanitized > 0) {
                row.put("status", "IN_PROGRESS");
            }

            if (note != null && !note.trim().isEmpty()) {
                row.put("notes", note);
            }
            row.put("updatedAt", new Date().toString());
            addAuditEvent(row, "PATROL_PROGRESS_UPDATED", actor, "Progress " + sanitized + "% | Status " + row.get("status"));

            persistStore();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Patrol progress updated");
            response.put("patrol", row);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update patrol progress: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to update patrol progress");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/patrols/{id}/ping")
    @Operation(summary = "Live Patrol Ping", description = "Update patrol progress from live unit location ping")
    public ResponseEntity<Map<String, Object>> livePatrolPing(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @PathVariable("id") int id,
        @Valid @RequestBody PatrolPingDTO request
    ) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "POLICE");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            Optional<Map<String, Object>> patrol = patrols.stream()
                .filter(p -> ((Number) p.get("id")).intValue() == id)
                .findFirst();

            if (!patrol.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody("Patrol not found"));
            }

            Map<String, Object> row = patrol.get();
            double targetLat = ((Number) row.get("latitude")).doubleValue();
            double targetLon = ((Number) row.get("longitude")).doubleValue();

            double distanceToTargetKm = haversineKm(request.latitude, request.longitude, targetLat, targetLon);

            // Establish baseline on first live ping to compute route completion percentage.
            double baselineKm = 0.0;
            Object existingBaseline = row.get("progressBaselineKm");
            if (existingBaseline instanceof Number) {
                baselineKm = ((Number) existingBaseline).doubleValue();
            }
            if (baselineKm <= 0.0) {
                baselineKm = Math.max(distanceToTargetKm, 0.2);
                row.put("progressBaselineKm", round2(baselineKm));
            }

            int computedProgress = (int) Math.round((1.0 - (distanceToTargetKm / baselineKm)) * 100.0);
            computedProgress = Math.max(0, Math.min(100, computedProgress));
            int currentProgress = ((Number) row.getOrDefault("progress", 0)).intValue();
            int nextProgress = Math.max(currentProgress, computedProgress);

            String nextStatus = String.valueOf(row.getOrDefault("status", "ASSIGNED"));
            if (distanceToTargetKm <= 0.10 || nextProgress >= 100) {
                nextProgress = 100;
                nextStatus = "COMPLETED";
            } else if (nextProgress > 0) {
                nextStatus = "IN_PROGRESS";
            }

            row.put("progress", nextProgress);
            row.put("status", nextStatus);
            row.put("lastPingLat", request.latitude);
            row.put("lastPingLon", request.longitude);
            row.put("lastPingAt", new Date().toString());
            row.put("distanceToTargetKm", round2(distanceToTargetKm));
            row.put("updatedAt", new Date().toString());

            String source = request.source == null ? "GPS" : request.source;
            addAuditEvent(
                row,
                "PATROL_LIVE_PING",
                actor,
                "Ping from " + source + " | distance " + round2(distanceToTargetKm) + "km | progress " + nextProgress + "%"
            );

            persistStore();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Live ping recorded");
            response.put("patrol", row);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to process patrol live ping", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody("Failed to process patrol live ping"));
        }
    }

    @PostMapping("/demands")
    @Operation(summary = "Raise Demand", description = "Raise a demand from citizen, police, or business to government")
    public ResponseEntity<Map<String, Object>> raiseDemand(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @Valid @RequestBody DemandCreateDTO request) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "CITIZEN", "POLICE", "BUSINESS");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            Map<String, Object> demand = new HashMap<>();
            demand.put("id", demandIdCounter++);
            demand.put("title", request.title);
            demand.put("description", request.description);
            demand.put("fromRole", actor.role);
            demand.put("fromUser", actor.email != null ? actor.email : (request.fromUser == null ? "anonymous" : request.fromUser));
            demand.put("targetRole", "GOVERNMENT");
            demand.put("category", request.category == null ? "GENERAL" : request.category.toUpperCase(Locale.ROOT));
            demand.put("priority", request.priority == null ? "MEDIUM" : request.priority.toUpperCase(Locale.ROOT));
            demand.put("status", "SUBMITTED");
            demand.put("governmentNote", "");
            demand.put("createdAt", new Date().toString());
            demand.put("updatedAt", new Date().toString());
            addAuditEvent(demand, "DEMAND_SUBMITTED", actor, request.description);

            demands.add(demand);
            persistStore();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demand submitted to government");
            response.put("demand", demand);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to submit demand: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to submit demand");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/demands")
    @Operation(summary = "Get Demands", description = "Get demands with optional filtering")
    public ResponseEntity<Map<String, Object>> getDemands(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @RequestParam(value = "fromRole", required = false) String fromRole,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "limit", defaultValue = "100") int limit
    ) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "CITIZEN", "POLICE", "BUSINESS", "GOVERNMENT");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            List<Map<String, Object>> filtered = new ArrayList<>(demands);

            // Non-government users can only access their own role demands.
            if (!"GOVERNMENT".equalsIgnoreCase(actor.role)) {
                filtered.removeIf(d -> !actor.role.equalsIgnoreCase(String.valueOf(d.get("fromRole"))));
            }

            if (fromRole != null && !fromRole.trim().isEmpty()) {
                filtered.removeIf(d -> !fromRole.equalsIgnoreCase(String.valueOf(d.get("fromRole"))));
            }
            if (status != null && !status.trim().isEmpty()) {
                filtered.removeIf(d -> !status.equalsIgnoreCase(String.valueOf(d.get("status"))));
            }

            filtered.sort((a, b) -> {
                int idB = ((Number) b.getOrDefault("id", 0)).intValue();
                int idA = ((Number) a.getOrDefault("id", 0)).intValue();
                return Integer.compare(idB, idA);
            });

            if (filtered.size() > limit) {
                filtered = filtered.subList(0, limit);
            }

            Map<String, Object> summary = new HashMap<>();
            summary.put("submitted", filtered.stream().filter(d -> "SUBMITTED".equalsIgnoreCase(String.valueOf(d.get("status")))).count());
            summary.put("approved", filtered.stream().filter(d -> "APPROVED".equalsIgnoreCase(String.valueOf(d.get("status")))).count());
            summary.put("rejected", filtered.stream().filter(d -> "REJECTED".equalsIgnoreCase(String.valueOf(d.get("status")))).count());
            summary.put("inProgress", filtered.stream().filter(d -> "IN_PROGRESS".equalsIgnoreCase(String.valueOf(d.get("status")))).count());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("total", filtered.size());
            response.put("summary", summary);
            response.put("demands", filtered);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to fetch demands: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to retrieve demands");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PatchMapping("/demands/{id}/status")
    @Operation(summary = "Update Demand Status", description = "Government approves/rejects/in-progress demand")
    public ResponseEntity<Map<String, Object>> updateDemandStatus(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @PathVariable("id") int id,
        @RequestParam("status") String status,
        @RequestParam(value = "governmentNote", required = false) String governmentNote
    ) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "GOVERNMENT");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            Optional<Map<String, Object>> demand = demands.stream()
                .filter(d -> ((Number) d.get("id")).intValue() == id)
                .findFirst();

            if (!demand.isPresent()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Demand not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }

            String normalizedStatus = status.toUpperCase(Locale.ROOT);
            Set<String> allowed = new HashSet<>(Arrays.asList("SUBMITTED", "IN_PROGRESS", "APPROVED", "REJECTED"));
            if (!allowed.contains(normalizedStatus)) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Unsupported status. Allowed: SUBMITTED, IN_PROGRESS, APPROVED, REJECTED");
                return ResponseEntity.badRequest().body(error);
            }

            Map<String, Object> row = demand.get();
            row.put("status", normalizedStatus);
            if (governmentNote != null) {
                row.put("governmentNote", governmentNote);
            }
            row.put("updatedAt", new Date().toString());
            addAuditEvent(row, "DEMAND_STATUS_UPDATED", actor, "Status -> " + normalizedStatus + (governmentNote == null ? "" : " | Note: " + governmentNote));
            persistStore();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Demand status updated");
            response.put("demand", row);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update demand status: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to update demand status");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/demands/{id}/audit")
    @Operation(summary = "Get Demand Audit", description = "Get timeline of who changed a demand and when")
    public ResponseEntity<Map<String, Object>> getDemandAudit(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @PathVariable("id") int id
    ) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "CITIZEN", "POLICE", "BUSINESS", "GOVERNMENT");
        if (denied != null) return denied;
        try {
            ActorInfo actor = extractActor(authHeader);
            Optional<Map<String, Object>> demand = demands.stream()
                .filter(d -> ((Number) d.get("id")).intValue() == id)
                .findFirst();

            if (!demand.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody("Demand not found"));
            }

            String fromRole = String.valueOf(demand.get().get("fromRole"));
            if (!"GOVERNMENT".equalsIgnoreCase(actor.role) && !actor.role.equalsIgnoreCase(fromRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorBody("Not allowed to access this demand audit"));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("id", id);
            response.put("audit", getAuditList(demand.get()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to fetch demand audit", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody("Failed to fetch demand audit"));
        }
    }

    @GetMapping("/patrols/{id}/audit")
    @Operation(summary = "Get Patrol Audit", description = "Get timeline of who changed a patrol and when")
    public ResponseEntity<Map<String, Object>> getPatrolAudit(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @PathVariable("id") int id
    ) {
        ResponseEntity<Map<String, Object>> denied = ensureRole(authHeader, "POLICE", "GOVERNMENT");
        if (denied != null) return denied;
        try {
            Optional<Map<String, Object>> patrol = patrols.stream()
                .filter(d -> ((Number) d.get("id")).intValue() == id)
                .findFirst();

            if (!patrol.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody("Patrol not found"));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("id", id);
            response.put("audit", getAuditList(patrol.get()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to fetch patrol audit", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody("Failed to fetch patrol audit"));
        }
    }

    private ResponseEntity<Map<String, Object>> ensureRole(String authHeader, String... allowedRoles) {
        if (authHeader == null || authHeader.trim().isEmpty() || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorBody("Authorization token is required"));
        }
        try {
            String token = authHeader.replace("Bearer ", "").trim();
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorBody("Invalid or expired token"));
            }
            String role = jwtUtil.extractRole(token);
            Set<String> allowed = new HashSet<>();
            for (String r : allowedRoles) {
                allowed.add(r.toUpperCase(Locale.ROOT));
            }
            if (!allowed.contains(String.valueOf(role).toUpperCase(Locale.ROOT))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorBody("Access denied for role: " + role));
            }
            return null;
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorBody("Invalid authorization token"));
        }
    }

    private boolean isValidIngestionKey(String providedKey) {
        if (providedKey == null || providedKey.trim().isEmpty()) {
            return false;
        }
        return providedKey.trim().equals(ingestionApiKey);
    }

    private ActorInfo extractActor(String authHeader) {
        ActorInfo actor = new ActorInfo();
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) return actor;
            String token = authHeader.replace("Bearer ", "").trim();
            actor.email = jwtUtil.extractEmail(token);
            actor.name = jwtUtil.extractName(token);
            actor.role = jwtUtil.extractRole(token);
        } catch (Exception ignored) {
            // Keep actor best-effort for audit trail.
        }
        return actor;
    }

    private void addAuditEvent(Map<String, Object> entity, String action, ActorInfo actor, String note) {
        List<Map<String, Object>> audit = getAuditList(entity);
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("timestamp", new Date().toString());
        event.put("action", action);
        event.put("role", actor.role == null ? "UNKNOWN" : actor.role);
        event.put("user", actor.email == null ? actor.name : actor.email);
        event.put("note", note == null ? "" : note);
        audit.add(event);
        entity.put("audit", audit);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getAuditList(Map<String, Object> entity) {
        Object maybeAudit = entity.get("audit");
        if (maybeAudit instanceof List) {
            return (List<Map<String, Object>>) maybeAudit;
        }
        List<Map<String, Object>> created = new ArrayList<>();
        entity.put("audit", created);
        return created;
    }

    private Map<String, Object> errorBody(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("message", message);
        return error;
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static class ActorInfo {
        public String role;
        public String email;
        public String name;
    }

    /**
     * Determine incident severity based on type
     */
    private String determineSeverity(String type) {
        switch (type.toLowerCase()) {
            case "assault":
                return "Critical";
            case "theft":
            case "harassment":
                return "High";
            case "vandalism":
                return "Medium";
            case "suspicious_activity":
            case "other":
            default:
                return "Low";
        }
    }

    /**
     * DTO for incident reporting
     */
    public static class IncidentReportDTO {
        @jakarta.validation.constraints.NotBlank
        public String incidentType;
        
        @jakarta.validation.constraints.NotBlank
        public String description;
        
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-90)
        @jakarta.validation.constraints.Max(90)
        public Double latitude;
        
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-180)
        @jakarta.validation.constraints.Max(180)
        public Double longitude;
        
        public String reportedBy;
    }

    /**
     * DTO for SOS emergency alerts
     */
    public static class SOSAlertDTO {
        @jakarta.validation.constraints.NotBlank
        public String userId;
        
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-90)
        @jakarta.validation.constraints.Max(90)
        public Double latitude;
        
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-180)
        @jakarta.validation.constraints.Max(180)
        public Double longitude;
    }

    public static class PatrolCreateDTO {
        @jakarta.validation.constraints.NotBlank
        public String title;

        @jakarta.validation.constraints.NotBlank
        public String zone;

        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-90)
        @jakarta.validation.constraints.Max(90)
        public Double latitude;

        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-180)
        @jakarta.validation.constraints.Max(180)
        public Double longitude;

        public String assignedUnit;
        public String createdBy;
        public String notes;
    }

    public static class PatrolPingDTO {
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-90)
        @jakarta.validation.constraints.Max(90)
        public Double latitude;

        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-180)
        @jakarta.validation.constraints.Max(180)
        public Double longitude;

        public String source;
    }

    public static class DemandCreateDTO {
        @jakarta.validation.constraints.NotBlank
        public String title;

        @jakarta.validation.constraints.NotBlank
        public String description;

        @jakarta.validation.constraints.NotBlank
        public String fromRole;

        public String fromUser;
        public String category;
        public String priority;
    }

    public static class ExternalIncidentIngestRequest {
        @jakarta.validation.constraints.NotBlank
        public String source;

        @jakarta.validation.constraints.NotEmpty
        public List<@Valid ExternalIncidentDTO> incidents;
    }

    public static class ExternalIncidentDTO {
        public String externalId;

        @jakarta.validation.constraints.NotBlank
        public String incidentType;

        @jakarta.validation.constraints.NotBlank
        public String description;

        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-90)
        @jakarta.validation.constraints.Max(90)
        public Double latitude;

        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(-180)
        @jakarta.validation.constraints.Max(180)
        public Double longitude;

        public String severity;
        public String status;
        public String eventTimestamp;
    }

    private static class IncidentStoreData {
        public List<Map<String, Object>> incidents = new ArrayList<>();
        public List<Map<String, Object>> sosAlerts = new ArrayList<>();
        public List<Map<String, Object>> patrols = new ArrayList<>();
        public List<Map<String, Object>> demands = new ArrayList<>();
        public int incidentIdCounter = 1;
        public int sosIdCounter = 1;
        public int patrolIdCounter = 1;
        public int demandIdCounter = 1;
    }
}
