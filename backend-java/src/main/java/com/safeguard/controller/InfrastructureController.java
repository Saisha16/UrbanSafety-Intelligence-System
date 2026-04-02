package com.safeguard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safeguard.model.InfrastructureProject;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/infrastructure")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class InfrastructureController {
    private static final String PROJECTS_FILE = "data/infrastructure.json";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private List<InfrastructureProject> projects = new ArrayList<>();

    public InfrastructureController() {
        loadProjects();
    }

    private void loadProjects() {
        try {
            File file = new File(PROJECTS_FILE);
            if (file.exists()) {
                String content = new String(Files.readAllBytes(Paths.get(PROJECTS_FILE)));
                InfrastructureProject[] projectArray = objectMapper.readValue(content, InfrastructureProject[].class);
                projects = new ArrayList<>(Arrays.asList(projectArray));
            } else {
                generateDefaultProjects();
            }
        } catch (Exception e) {
            generateDefaultProjects();
        }
    }

    private void generateDefaultProjects() {
        projects.clear();

        // Project 1: Street Lighting
        InfrastructureProject p1 = new InfrastructureProject(
            "Street Lighting Enhancement",
            "Increase street light coverage in high-risk areas",
            "💡",
            "High",
            Arrays.asList("12 high-risk zones"),
            "35% risk reduction",
            "₹2.5 Crore"
        );
        p1.setApprovalsFor(24);
        projects.add(p1);

        // Project 2: CCTV
        InfrastructureProject p2 = new InfrastructureProject(
            "CCTV Coverage Expansion",
            "Expand surveillance camera network",
            "📹",
            "High",
            Arrays.asList("8 commercial zones"),
            "40% risk reduction",
            "₹3.8 Crore"
        );
        p2.setApprovalsFor(28);
        p2.setApprovalsAgainst(2);
        projects.add(p2);

        // Project 3: Police Outposts
        InfrastructureProject p3 = new InfrastructureProject(
            "New Police Outposts",
            "Establish new police stations in underserved areas",
            "🚔",
            "Medium",
            Arrays.asList("5 underserved districts"),
            "25% risk reduction",
            "₹5.2 Crore"
        );
        p3.setApprovalsFor(18);
        p3.setApprovalsAgainst(4);
        projects.add(p3);

        // Project 4: Road Infrastructure
        InfrastructureProject p4 = new InfrastructureProject(
            "Road Infrastructure",
            "Improve road connectivity to isolated regions",
            "🛣️",
            "Medium",
            Arrays.asList("6 isolated regions"),
            "20% risk reduction",
            "₹4.5 Crore"
        );
        p4.setApprovalsFor(15);
        p4.setApprovalsAgainst(6);
        projects.add(p4);

        saveProjects();
    }

    private void saveProjects() {
        try {
            File file = new File(PROJECTS_FILE);
            file.getParentFile().mkdirs();
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(projects);
            Files.write(Paths.get(PROJECTS_FILE), json.getBytes());
        } catch (Exception e) {
            System.err.println("Error saving projects: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProjects(
            @RequestParam(required = false) String status) {
        List<InfrastructureProject> result = projects;
        if (status != null && !status.isEmpty()) {
            result = projects.stream()
                .filter(p -> p.getStatus().equalsIgnoreCase(status))
                .collect(Collectors.toList());
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("total", result.size());
        response.put("projects", result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InfrastructureProject> getProjectById(@PathVariable String id) {
        return projects.stream()
            .filter(p -> p.getId().equals(id))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<InfrastructureProject> createProject(@RequestBody InfrastructureProject project) {
        project.setId(UUID.randomUUID().toString());
        project.setCreatedAt(System.currentTimeMillis());
        if (project.getStatus() == null) {
            project.setStatus("PENDING");
        }
        projects.add(project);
        saveProjects();
        return ResponseEntity.ok(project);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveProject(
            @PathVariable String id,
            @RequestBody Map<String, Object> approvalData) {
        return projects.stream()
            .filter(p -> p.getId().equals(id))
            .findFirst()
            .map(project -> {
                String userId = (String) approvalData.get("userId");
                Boolean approve = (Boolean) approvalData.get("approve");
                
                if (userId != null && approve != null) {
                    project.approve(userId, approve);
                    saveProjects();
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("id", project.getId());
                    response.put("approvalsFor", project.getApprovalsFor());
                    response.put("approvalsAgainst", project.getApprovalsAgainst());
                    response.put("approvalPercentage", project.getApprovalPercentage());
                    response.put("message", "Approval recorded successfully");
                    
                    return ResponseEntity.ok(response);
                }
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid approval data"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<InfrastructureProject> updateProjectStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> statusData) {
        return projects.stream()
            .filter(p -> p.getId().equals(id))
            .findFirst()
            .map(project -> {
                String newStatus = statusData.get("status");
                if (newStatus != null) {
                    project.setStatus(newStatus);
                    project.setUpdatedAt(System.currentTimeMillis());
                    saveProjects();
                }
                return ResponseEntity.ok(project);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteProject(@PathVariable String id) {
        boolean removed = projects.removeIf(p -> p.getId().equals(id));
        if (removed) {
            saveProjects();
            Map<String, String> response = new HashMap<>();
            response.put("message", "Project deleted successfully");
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/analytics/summary")
    public ResponseEntity<Map<String, Object>> getProjectSummary() {
        Map<String, Object> response = new HashMap<>();
        response.put("totalProjects", projects.size());
        response.put("approved", projects.stream().filter(p -> "APPROVED".equals(p.getStatus())).count());
        response.put("pending", projects.stream().filter(p -> "PENDING".equals(p.getStatus())).count());
        response.put("inProgress", projects.stream().filter(p -> "IN_PROGRESS".equals(p.getStatus())).count());
        response.put("completed", projects.stream().filter(p -> "COMPLETED".equals(p.getStatus())).count());
        
        long totalApprovals = projects.stream().mapToLong(p -> p.getApprovalsFor() + p.getApprovalsAgainst()).sum();
        response.put("totalApprovals", totalApprovals);
        
        double avgApprovalPercentage = projects.stream()
            .mapToDouble(InfrastructureProject::getApprovalPercentage)
            .average()
            .orElse(0.0);
        response.put("avgApprovalPercentage", Math.round(avgApprovalPercentage * 100.0) / 100.0);
        
        return ResponseEntity.ok(response);
    }
}