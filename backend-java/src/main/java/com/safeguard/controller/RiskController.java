
package com.safeguard.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.cache.annotation.Cacheable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Schema;
import com.safeguard.model.SafeRouteRequest;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin
@Tag(name = "Risk Analysis", description = "AI-powered crime risk prediction with error handling and circuit breaker")
public class RiskController {

    private static final Logger log = LoggerFactory.getLogger(RiskController.class);
    private static final String AI_SERVICE_URL = "http://localhost:8000";
    
    @Autowired
    private RestTemplate restTemplate;

    @PostMapping("/predict")
    @Operation(summary = "Predict Crime Risk", description = "Analyzes location and time to predict crime risk level using AI")
    @CircuitBreaker(name = "aiService", fallbackMethod = "predictFallback")
    public ResponseEntity<Map<String, Object>> predict(@Valid @RequestBody PredictRequest request) {
        try {
            log.info("Received prediction request for location: ({}, {}), time: {}", 
                request.latitude, request.longitude, request.hour);
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("latitude", request.latitude);
            payload.put("longitude", request.longitude);
            payload.put("hour", request.hour);
            if (request.dayOfWeek != null) payload.put("day_of_week", request.dayOfWeek);
            if (request.month != null) payload.put("month", request.month);
            
            Map response = restTemplate.postForObject(AI_SERVICE_URL + "/predict", payload, Map.class);
            
            log.info("Prediction successful - Risk: {}", response.get("risk_level"));
            return noStore(response);
            
        } catch (RestClientException e) {
            log.error("AI service communication error: {}", e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, 
                "AI service temporarily unavailable", 
                e
            );
        } catch (Exception e) {
            log.error("Prediction failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, 
                "Failed to process prediction request", 
                e
            );
        }
    }
    
    public ResponseEntity<Map<String, Object>> predictFallback(PredictRequest request, Exception ex) {
        log.warn("Circuit breaker activated for predict - using fallback");
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("error", "AI service unavailable");
        fallback.put("fallback", true);
        fallback.put("risk_level", "medium");
        fallback.put("risk_score", 50.0);
        fallback.put("message", "Using default risk assessment due to service unavailability");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallback);
    }

    @GetMapping("/health")
    @Operation(summary = "Health Check", description = "Check if the API service is running")
    public ResponseEntity<Map<String, Object>> health() {
        try {
            Map<String, Object> status = new HashMap<>();
            status.put("status", "healthy");
            status.put("service", "SafeGuard AI Backend");
            status.put("timestamp", System.currentTimeMillis());
            
            // Check AI service connectivity
            try {
                Map aiHealth = restTemplate.getForObject(AI_SERVICE_URL + "/health", Map.class);
                status.put("ai_service", "connected");
                status.put("ai_model", aiHealth.get("model_loaded"));
            } catch (Exception e) {
                status.put("ai_service", "disconnected");
                status.put("warning", "AI service unreachable");
            }
            
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("Health check failed: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("status", "unhealthy");
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/explain")
    @Operation(summary = "Explain Prediction", description = "Get detailed explanation of risk prediction with feature importance")
    @CircuitBreaker(name = "aiService", fallbackMethod = "explainFallback")
    public ResponseEntity<Map<String, Object>> explain(@Valid @RequestBody PredictRequest request) {
        try {
            log.info("Received explanation request for location: ({}, {})", 
                request.latitude, request.longitude);
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("latitude", request.latitude);
            payload.put("longitude", request.longitude);
            payload.put("hour", request.hour);
            if (request.dayOfWeek != null) payload.put("day_of_week", request.dayOfWeek);
            if (request.month != null) payload.put("month", request.month);
            
            Map response = restTemplate.postForObject(AI_SERVICE_URL + "/explain", payload, Map.class);
            
            log.info("Explanation generated successfully");
            return noStore(response);
            
        } catch (RestClientException e) {
            log.error("AI service communication error: {}", e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, 
                "AI service temporarily unavailable", 
                e
            );
        } catch (Exception e) {
            log.error("Explanation request failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, 
                "Failed to generate explanation", 
                e
            );
        }
    }
    
    public ResponseEntity<Map<String, Object>> explainFallback(PredictRequest request, Exception ex) {
        log.warn("Circuit breaker activated for explain - using fallback");
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("error", "AI service unavailable");
        fallback.put("fallback", true);
        fallback.put("message", "Explanation service temporarily unavailable");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallback);
    }

    @PostMapping("/safe-route")
    @Operation(summary = "Safe Route Recommendation", description = "Get safest route between two points using graph algorithms")
    @CircuitBreaker(name = "aiService", fallbackMethod = "safeRouteFallback")
    public ResponseEntity<Map<String, Object>> safeRoute(@Valid @RequestBody SafeRouteRequestDTO request) {
        try {
            log.info("Calculating safe route from ({}, {}) to ({}, {})", 
                request.startLat, request.startLon, request.endLat, request.endLon);
            int hour = request.hour == null ? java.time.LocalDateTime.now().getHour() : request.hour;
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("start_lat", request.startLat);
            payload.put("start_lon", request.startLon);
            payload.put("end_lat", request.endLat);
            payload.put("end_lon", request.endLon);
            payload.put("current_hour", hour);
            
            Map response = restTemplate.postForObject(AI_SERVICE_URL + "/safe-route", payload, Map.class);
            
            log.info("Safe route calculated - {} routes found", 
                ((List) response.get("routes")).size());
            return ResponseEntity.ok(response);
            
        } catch (RestClientException e) {
            log.error("AI service communication error: {}", e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, 
                "Route calculation service unavailable", 
                e
            );
        } catch (Exception e) {
            log.error("Safe route calculation failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, 
                "Failed to calculate safe route", 
                e
            );
        }
    }
    
    public ResponseEntity<Map<String, Object>> safeRouteFallback(SafeRouteRequestDTO request, Exception ex) {
        log.warn("Circuit breaker activated for safe-route - using fallback");
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("error", "Route service unavailable");
        fallback.put("fallback", true);
        fallback.put("message", "Route calculation temporarily unavailable. Please try direct route.");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallback);
    }

    @GetMapping("/heatmap")
    @Operation(summary = "Crime Heatmap", description = "Get crime density heatmap data for visualization")
    @CircuitBreaker(name = "aiService", fallbackMethod = "heatmapFallback")
    public ResponseEntity<Map<String, Object>> heatmap() {
        try {
            log.info("Fetching crime heatmap data");
            
            Map response = restTemplate.getForObject(AI_SERVICE_URL + "/heatmap", Map.class);
            
            log.info("Heatmap data retrieved successfully");
            return noStore(response);
            
        } catch (RestClientException e) {
            log.error("AI service communication error: {}", e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, 
                "Heatmap service unavailable", 
                e
            );
        } catch (Exception e) {
            log.error("Heatmap request failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, 
                "Failed to retrieve heatmap data", 
                e
            );
        }
    }
    
    public ResponseEntity<Map<String, Object>> heatmapFallback(Exception ex) {
        log.warn("Circuit breaker activated for heatmap - using fallback");
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("error", "Heatmap service unavailable");
        fallback.put("fallback", true);
        fallback.put("heatmap_data", new ArrayList<>());
        fallback.put("message", "Heatmap temporarily unavailable");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallback);
    }

    @PostMapping("/recommendations")
    @Operation(summary = "Smart Recommendations", description = "Get safety recommendations for users and authorities")
    @CircuitBreaker(name = "aiService", fallbackMethod = "recommendationsFallback")
    public ResponseEntity<Map<String, Object>> recommendations(@Valid @RequestBody RecommendationsRequest request) {
        try {
            String role = (request.userRole == null || request.userRole.trim().isEmpty()) ? "CITIZEN" : request.userRole;
            int hour = (request.hour == null) ? java.time.LocalDateTime.now().getHour() : request.hour;
            int dayOfWeek = (request.dayOfWeek == null)
                ? java.time.LocalDateTime.now().getDayOfWeek().getValue() % 7
                : request.dayOfWeek;

            log.info("Generating recommendations for role: {}", role);
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("latitude", request.latitude);
            payload.put("longitude", request.longitude);
            payload.put("hour", hour);
            payload.put("day_of_week", dayOfWeek);
            
            Map response = restTemplate.postForObject(AI_SERVICE_URL + "/recommendations", payload, Map.class);
            
            log.info("Recommendations generated successfully");
            return ResponseEntity.ok(response);
            
        } catch (RestClientException e) {
            log.error("AI service communication error: {}", e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, 
                "Recommendations service unavailable", 
                e
            );
        } catch (Exception e) {
            log.error("Recommendations request failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, 
                "Failed to generate recommendations", 
                e
            );
        }
    }
    
    public ResponseEntity<Map<String, Object>> recommendationsFallback(RecommendationsRequest request, Exception ex) {
        log.warn("Circuit breaker activated for recommendations - using fallback");
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("error", "Recommendations service unavailable");
        fallback.put("fallback", true);
        List<String> defaultRecs = Arrays.asList(
            "Stay in well-lit areas",
            "Travel in groups when possible",
            "Keep emergency contacts readily available"
        );
        fallback.put("recommendations", defaultRecs);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallback);
    }

    @GetMapping("/analytics/trends")
    @Operation(summary = "Crime Trends", description = "Get hourly crime risk trends and patterns")
    @CircuitBreaker(name = "aiService", fallbackMethod = "trendsFallback")
    public ResponseEntity<Map<String, Object>> trends() {
        try {
            log.info("Fetching crime trends data");
            
            Map response = restTemplate.getForObject(AI_SERVICE_URL + "/analytics/trends", Map.class);
            
            log.info("Trends data retrieved successfully");
            return noStore(response);
            
        } catch (RestClientException e) {
            log.error("AI service communication error: {}", e.getMessage());
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, 
                "Trends service unavailable", 
                e
            );
        } catch (Exception e) {
            log.error("Trends request failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, 
                "Failed to retrieve trends data", 
                e
            );
        }
    }
    
    public ResponseEntity<Map<String, Object>> trendsFallback(Exception ex) {
        log.warn("Circuit breaker activated for trends - using fallback");
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("error", "Trends service unavailable");
        fallback.put("fallback", true);
        fallback.put("message", "Trend analysis temporarily unavailable");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallback);
    }

    @GetMapping("/model-info")
    @Operation(summary = "Model Governance Info", description = "Get model version, data quality and calibration metadata")
    public ResponseEntity<Map<String, Object>> modelInfo() {
        try {
            Map response = restTemplate.getForObject(AI_SERVICE_URL + "/model/info", Map.class);
            return noStore(response);
        } catch (Exception e) {
            log.error("Model info request failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Model info service unavailable",
                e
            );
        }
    }

    private ResponseEntity<Map<String, Object>> noStore(Map body) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Cache-Control", "no-store");
        return ResponseEntity.ok().headers(headers).body(body);
    }

    @GetMapping("/locations")
    @Operation(summary = "Get Locations", description = "Get predefined locations in Bengaluru for search")
    @Cacheable(value = "locations", key = "'bengaluru'")
    public ResponseEntity<Map<String, Object>> getLocations() {
        try {
            Map<String, Object> response = new HashMap<>();
            List<Map<String, Object>> locations = new ArrayList<>();
            
            // Predefined Bengaluru locations
            String[][] locationData = {
                {"MG Road", "12.9716", "77.5946"},
                {"Koramangala", "12.9352", "77.6245"},
                {"Indiranagar", "12.9719", "77.6412"},
                {"Whitefield", "12.9698", "77.7500"},
                {"Electronic City", "12.8456", "77.6603"},
                {"Marathahalli", "12.9591", "77.7011"},
                {"JP Nagar", "12.9080", "77.5852"},
                {"BTM Layout", "12.9165", "77.6101"},
                {"Jayanagar", "12.9250", "77.5838"},
                {"HSR Layout", "12.9121", "77.6446"},
                {"Bannerghatta Road", "12.8906", "77.6041"},
                {"Hennur", "13.0358", "77.6394"},
                {"Yelahanka", "13.1007", "77.5963"},
                {"Rajajinagar", "12.9916", "77.5552"},
                {"Malleshwaram", "13.0029", "77.5707"},
                {"Hebbal", "13.0358", "77.5970"},
                {"Banashankari", "12.9250", "77.5482"},
                {"Kengeri", "12.9075", "77.4850"},
                {"Bellandur", "12.9259", "77.6766"},
                {"Sarjapur Road", "12.9010", "77.6874"},
                {"Yeshwanthpur", "13.0280", "77.5385"},
                {"Frazer Town", "12.9880", "77.6128"},
                {"Richmond Town", "12.9698", "77.6025"},
                {"Vijayanagar", "12.9698", "77.5350"},
                {"KR Puram", "13.0110", "77.6964"},
                {"Vidyaranyapura", "13.0780", "77.5590"},
                {"RT Nagar", "13.0250", "77.5950"},
                {"Basavanagudi", "12.9426", "77.5742"},
                {"Brigade Road", "12.9716", "77.6070"},
                {"Commercial Street", "12.9816", "77.6094"},
                {"Cubbon Park", "12.9762", "77.5929"},
                {"Ulsoor", "12.9810", "77.6208"},
                {"Shivajinagar", "12.9869", "77.6009"},
                {"CV Raman Nagar", "12.9850", "77.6750"},
                {"Bommanahalli", "12.9055", "77.6250"}
            };
            
            for (String[] loc : locationData) {
                Map<String, Object> location = new HashMap<>();
                location.put("name", loc[0]);
                location.put("lat", Double.parseDouble(loc[1]));
                location.put("lng", Double.parseDouble(loc[2]));
                locations.add(location);
            }
            
            response.put("locations", locations);
            response.put("count", locations.size());
            response.put("city", "Bengaluru");
            
            log.info("Retrieved {} locations", locations.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to retrieve locations: {}", e.getMessage(), e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, 
                "Failed to retrieve locations", 
                e
            );
        }
    }

    // Request DTOs with validation
    @Schema(description = "Crime risk prediction request")
    static class PredictRequest {
        @NotNull(message = "Latitude is required")
        @Min(value = -90, message = "Latitude must be >= -90")
        @Max(value = 90, message = "Latitude must be <= 90")
        @Schema(description = "Latitude coordinate", example = "12.9716")
        public Double latitude;
        
        @NotNull(message = "Longitude is required")
        @Min(value = -180, message = "Longitude must be >= -180")
        @Max(value = 180, message = "Longitude must be <= 180")
        @Schema(description = "Longitude coordinate", example = "77.5946")
        public Double longitude;
        
        @NotNull(message = "Hour is required")
        @Min(value = 0, message = "Hour must be >= 0")
        @Max(value = 23, message = "Hour must be <= 23")
        @Schema(description = "Hour of day (0-23)", example = "14")
        public Integer hour;
        
        @Min(value = 0, message = "Day of week must be >= 0")
        @Max(value = 6, message = "Day of week must be <= 6")
        @Schema(description = "Day of week (0=Monday, 6=Sunday)", example = "3")
        public Integer dayOfWeek;
        
        @Min(value = 1, message = "Month must be >= 1")
        @Max(value = 12, message = "Month must be <= 12")
        @Schema(description = "Month (1-12)", example = "6")
        public Integer month;
    }

    @Schema(description = "Safe route calculation request")
    static class SafeRouteRequestDTO {
        @NotNull(message = "Start latitude is required")
        @Min(value = -90, message = "Latitude must be >= -90")
        @Max(value = 90, message = "Latitude must be <= 90")
        public Double startLat;
        
        @NotNull(message = "Start longitude is required")
        @Min(value = -180, message = "Longitude must be >= -180")
        @Max(value = 180, message = "Longitude must be <= 180")
        public Double startLon;
        
        @NotNull(message = "End latitude is required")
        @Min(value = -90, message = "Latitude must be >= -90")
        @Max(value = 90, message = "Latitude must be <= 90")
        public Double endLat;
        
        @NotNull(message = "End longitude is required")
        @Min(value = -180, message = "Longitude must be >= -180")
        @Max(value = 180, message = "Longitude must be <= 180")
        public Double endLon;
        
        @Min(value = 0, message = "Hour must be >= 0")
        @Max(value = 23, message = "Hour must be <= 23")
        public Integer hour;
    }

    @Schema(description = "Recommendations request")
    static class RecommendationsRequest {
        @Schema(description = "User role", example = "CITIZEN")
        public String userRole;
        
        @NotNull(message = "Latitude is required")
        @Min(value = -90, message = "Latitude must be >= -90")
        @Max(value = 90, message = "Latitude must be <= 90")
        public Double latitude;
        
        @NotNull(message = "Longitude is required")
        @Min(value = -180, message = "Longitude must be >= -180")
        @Max(value = 180, message = "Longitude must be <= 180")
        public Double longitude;

        @Min(value = 0, message = "Hour must be >= 0")
        @Max(value = 23, message = "Hour must be <= 23")
        public Integer hour;

        @Min(value = 0, message = "Day of week must be >= 0")
        @Max(value = 6, message = "Day of week must be <= 6")
        public Integer dayOfWeek;
    }
}

