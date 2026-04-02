package com.safeguard.model;

import java.util.List;

public class SafeRouteRequest {
    public double startLat;
    public double startLon;
    public double endLat;
    public double endLon;
    public int currentHour;
    
    // Getters and setters
    public double getStartLat() { return startLat; }
    public void setStartLat(double startLat) { this.startLat = startLat; }
    
    public double getStartLon() { return startLon; }
    public void setStartLon(double startLon) { this.startLon = startLon; }
    
    public double getEndLat() { return endLat; }
    public void setEndLat(double endLat) { this.endLat = endLat; }
    
    public double getEndLon() { return endLon; }
    public void setEndLon(double endLon) { this.endLon = endLon; }
    
    public int getCurrentHour() { return currentHour; }
    public void setCurrentHour(int currentHour) { this.currentHour = currentHour; }
}
