package com.safeguard.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PolicyRecommendation {
    private String id;
    private String title;
    private String description;
    private String evidence;
    private String recommendation;
    private String expectedOutcome;
    private String status; // PENDING, UNDER_REVIEW, APPROVED, REJECTED
    private int votesFor;
    private int votesAgainst;
    private List<String> voters; // tracks who voted
    private String createdAt;
    private String generatedFrom; // e.g., INCIDENT_ANALYSIS, USER_SUGGESTION
    private Map<String, Object> metadata;

    public PolicyRecommendation() {
        this.status = "PENDING";
        this.votesFor = 0;
        this.votesAgainst = 0;
        this.voters = new ArrayList<>();
        this.metadata = new HashMap<>();
    }

    public PolicyRecommendation(String title, String description, String evidence, 
                               String recommendation, String expectedOutcome) {
        this();
        this.id = java.util.UUID.randomUUID().toString();
        this.title = title;
        this.description = description;
        this.evidence = evidence;
        this.recommendation = recommendation;
        this.expectedOutcome = expectedOutcome;
        this.createdAt = java.time.LocalDateTime.now().toString();
    }

    // Getters & Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getEvidence() { return evidence; }
    public void setEvidence(String evidence) { this.evidence = evidence; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

    public String getExpectedOutcome() { return expectedOutcome; }
    public void setExpectedOutcome(String expectedOutcome) { this.expectedOutcome = expectedOutcome; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getVotesFor() { return votesFor; }
    public void setVotesFor(int votesFor) { this.votesFor = votesFor; }

    public int getVotesAgainst() { return votesAgainst; }
    public void setVotesAgainst(int votesAgainst) { this.votesAgainst = votesAgainst; }

    public List<String> getVoters() { return voters; }
    public void setVoters(List<String> voters) { this.voters = voters; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getGeneratedFrom() { return generatedFrom; }
    public void setGeneratedFrom(String generatedFrom) { this.generatedFrom = generatedFrom; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public int getApprovalPercentage() {
        int total = votesFor + votesAgainst;
        if (total == 0) return 0;
        return Math.round((float) votesFor / total * 100);
    }

    public void vote(String userId, boolean approve) {
        if (!voters.contains(userId)) {
            voters.add(userId);
            if (approve) {
                votesFor++;
            } else {
                votesAgainst++;
            }
        }
    }
}
