package com.safeguard.model;

import java.util.*;

public class InfrastructureProject {
    private String id;
    private String title;
    private String description;
    private String icon;
    private String priority;
    private List<String> targetAreas;
    private String estimatedImpact;
    private String budget;
    private String status;
    private int approvalsFor;
    private int approvalsAgainst;
    private List<String> approvers;
    private long createdAt;
    private long updatedAt;
    private Map<String, Object> metadata;

    public InfrastructureProject() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = System.currentTimeMillis();
        this.updatedAt = System.currentTimeMillis();
        this.approvalsFor = 0;
        this.approvalsAgainst = 0;
        this.approvers = new ArrayList<>();
        this.metadata = new HashMap<>();
        this.status = "PENDING";
        this.targetAreas = new ArrayList<>();
    }

    public InfrastructureProject(String title, String description, String icon, String priority,
                                 List<String> targetAreas, String estimatedImpact, String budget) {
        this();
        this.title = title;
        this.description = description;
        this.icon = icon;
        this.priority = priority;
        this.targetAreas = targetAreas;
        this.estimatedImpact = estimatedImpact;
        this.budget = budget;
    }

    // Approval voting method
    public void approve(String userId, boolean approve) {
        if (approvers.contains(userId)) {
            return; // Prevent duplicate approvals
        }
        approvers.add(userId);
        if (approve) {
            approvalsFor++;
        } else {
            approvalsAgainst++;
        }
        this.updatedAt = System.currentTimeMillis();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public List<String> getTargetAreas() { return targetAreas; }
    public void setTargetAreas(List<String> targetAreas) { this.targetAreas = targetAreas; }

    public String getEstimatedImpact() { return estimatedImpact; }
    public void setEstimatedImpact(String estimatedImpact) { this.estimatedImpact = estimatedImpact; }

    public String getBudget() { return budget; }
    public void setBudget(String budget) { this.budget = budget; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getApprovalsFor() { return approvalsFor; }
    public void setApprovalsFor(int approvalsFor) { this.approvalsFor = approvalsFor; }

    public int getApprovalsAgainst() { return approvalsAgainst; }
    public void setApprovalsAgainst(int approvalsAgainst) { this.approvalsAgainst = approvalsAgainst; }

    public List<String> getApprovers() { return approvers; }
    public void setApprovers(List<String> approvers) { this.approvers = approvers; }

    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }

    public long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public double getApprovalPercentage() {
        int total = approvalsFor + approvalsAgainst;
        if (total == 0) return 0.0;
        return Math.round((double) approvalsFor / total * 100.0 * 100.0) / 100.0;
    }
}