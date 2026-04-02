package com.safeguard.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Request DTO for safe route calculation
 * Includes validation for start/end coordinates and time
 */
@Data
public class SafeRouteRequestDTO {
    
    @NotNull(message = "Start latitude is required")
    @Min(value = -90, message = "Start latitude must be >= -90")
    @Max(value = 90, message = "Start latitude must be <= 90")
    private Double startLat;
    
    @NotNull(message = "Start longitude is required")
    @Min(value = -180, message = "Start longitude must be >= -180")
    @Max(value = 180, message = "Start longitude must be <= 180")
    private Double startLon;
    
    @NotNull(message = "End latitude is required")
    @Min(value = -90, message = "End latitude must be >= -90")
    @Max(value = 90, message = "End latitude must be <= 90")
    private Double endLat;
    
    @NotNull(message = "End longitude is required")
    @Min(value = -180, message = "End longitude must be >= -180")
    @Max(value = 180, message = "End longitude must be <= 180")
    private Double endLon;
    
    @NotNull(message = "Hour is required")
    @Min(value = 0, message = "Hour must be >= 0")
    @Max(value = 23, message = "Hour must be <= 23")
    private Integer hour;
}
