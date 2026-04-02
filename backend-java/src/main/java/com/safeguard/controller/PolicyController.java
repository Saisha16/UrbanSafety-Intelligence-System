package com.safeguard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safeguard.model.PolicyRecommendation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/policies")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class PolicyController {
    private static final String POLICIES_FILE = "data/policies.json";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private List<PolicyRecommendation> policies = new ArrayList<>();

    public PolicyController() {
        loadPolicies();
    }

    private void loadPolicies() {
        try {
            File file = new File(POLICIES_FILE);
            if (file.exists()) {
                String content = new String(Files.readAllBytes(Paths.get(POLICIES_FILE)));
                PolicyRecommendation[] policyArray = objectMapper.readValue(content, PolicyRecommendation[].class);
                policies = new ArrayList<>(Arrays.asList(policyArray));
            } else {
                generateDefaultRecommendations();
            }
        } catch (Exception e) {
            generateDefaultRecommendations();
        }
    }

    private void generateDefaultRecommendations() {
        policies.clear();

        // Policy 1: Night Patrol
        PolicyRecommendation p1 = new PolicyRecommendation(
            "Enhanced Night Patrol Program",
            "Increase police presence during peak crime hours",
            "67% of high-risk incidents occur between 22:00-02:00",
            "Increase police presence by 40% during peak hours",
            "30% reduction in nighttime incidents"
        );
        p1.setGeneratedFrom("INCIDENT_ANALYSIS");
        p1.setStatus("UNDER_REVIEW");
        p1.setVotesFor(12);
        p1.setVotesAgainst(3);
        policies.add(p1);

        // Policy 2: Community Policing
        PolicyRecommendation p2 = new PolicyRecommendation(
            "Community Policing Initiative",
            "Establish community watch programs",
            "Areas with community watch programs show 45% lower risk",
            "Establish community programs in 15 high-risk neighborhoods",
            "Improved community trust and 25% risk reduction"
        );
        p2.setGeneratedFrom("INCIDENT_ANALYSIS");
        p2.setStatus("APPROVED");
        p2.setVotesFor(18);
        p2.setVotesAgainst(1);
        policies.add(p2);

        // Policy 3: Smart City
        PolicyRecommendation p3 = new PolicyRecommendation(
            "Smart City Integration",
            "Real-time monitoring using AI",
            "Real-time monitoring reduces response time by 60%",
            "Integrate AI prediction system with emergency services",
            "Faster response and proactive prevention"
        );
        p3.setGeneratedFrom("INCIDENT_ANALYSIS");
        p3.setStatus("PENDING");
        p3.setVotesFor(10);
        p3.setVotesAgainst(5);
        policies.add(p3);

        savePolicies();
    }

    private void savePolicies() {
        try {
            File file = new File(POLICIES_FILE);
            file.getParentFile().mkdirs();
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(policies);
            Files.write(Paths.get(POLICIES_FILE), json.getBytes());
        } catch (Exception e) {
            System.err.println("Error saving policies: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllPolicies(
            @RequestParam(required = false) String status) {
        List<PolicyRecommendation> result = policies;
        if (status != null && !status.isEmpty()) {
            result = policies.stream()
                .filter(p -> p.getStatus().equalsIgnoreCase(status))
                .collect(Collectors.toList());
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("total", result.size());
        response.put("policies", result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PolicyRecommendation> getPolicyById(@PathVariable String id) {
        return policies.stream()
            .filter(p -> p.getId().equals(id))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PolicyRecommendation> createPolicy(@RequestBody PolicyRecommendation policy) {
        policy.setId(UUID.randomUUID().toString());
        policy.setCreatedAt(java.time.LocalDateTime.now().toString());
        if (policy.getStatus() == null) {
            policy.setStatus("PENDING");
        }
        policies.add(policy);
        savePolicies();
        return ResponseEntity.ok(policy);
    }

    @PutMapping("/{id}/vote")
    public ResponseEntity<?> voteOnPolicy(
            @PathVariable String id,
            @RequestBody Map<String, Object> voteData) {
        return policies.stream()
            .filter(p -> p.getId().equals(id))
            .findFirst()
            .map(policy -> {
                String userId = (String) voteData.get("userId");
                Boolean approve = (Boolean) voteData.get("approve");
                
                if (userId != null && approve != null) {
                    policy.vote(userId, approve);
                    savePolicies();
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("id", policy.getId());
                    response.put("votesFor", policy.getVotesFor());
                    response.put("votesAgainst", policy.getVotesAgainst());
                    response.put("approvalPercentage", policy.getApprovalPercentage());
                    response.put("message", "Vote recorded successfully");
                    
                    return ResponseEntity.ok(response);
                }
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid vote data"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<PolicyRecommendation> updatePolicyStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> statusData) {
        return policies.stream()
            .filter(p -> p.getId().equals(id))
            .findFirst()
            .map(policy -> {
                String newStatus = statusData.get("status");
                if (newStatus != null) {
                    policy.setStatus(newStatus);
                    savePolicies();
                }
                return ResponseEntity.ok(policy);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deletePolicy(@PathVariable String id) {
        boolean removed = policies.removeIf(p -> p.getId().equals(id));
        if (removed) {
            savePolicies();
            Map<String, String> response = new HashMap<>();
            response.put("message", "Policy deleted successfully");
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/analytics/summary")
    public ResponseEntity<Map<String, Object>> getPolicySummary() {
        Map<String, Object> response = new HashMap<>();
        response.put("totalPolicies", policies.size());
        response.put("approved", policies.stream().filter(p -> "APPROVED".equals(p.getStatus())).count());
        response.put("pending", policies.stream().filter(p -> "PENDING".equals(p.getStatus())).count());
        response.put("underReview", policies.stream().filter(p -> "UNDER_REVIEW".equals(p.getStatus())).count());
        response.put("rejected", policies.stream().filter(p -> "REJECTED".equals(p.getStatus())).count());
        response.put("totalVotes", policies.stream().mapToInt(p -> p.getVotesFor() + p.getVotesAgainst()).sum());
        return ResponseEntity.ok(response);
    }
}
