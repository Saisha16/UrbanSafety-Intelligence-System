package com.safeguard.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Request DTO for crime risk prediction
 * Includes validation constraints for coordinates, time and date fields
 */
@Data
public class PredictRequest {
    
    @NotNull(message = "Latitude is required")
    @Min(value = -90, message = "Latitude must be >= -90")
    @Max(value = 90, message = "Latitude must be <= 90")
    private Double latitude;
    
    @NotNull(message = "Longitude is required")
    @Min(value = -180, message = "Longitude must be >= -180")
    @Max(value = 180, message = "Longitude must be <= 180")
    private Double longitude;
    
    @NotNull(message = "Hour is required")
    @Min(value = 0, message = "Hour must be >= 0")
    @Max(value = 23, message = "Hour must be <= 23")
    private Integer hour;
    
    @Min(value = 0, message = "Day of week must be >= 0")
    @Max(value = 6, message = "Day of week must be <= 6")
    private Integer dayOfWeek;
    
    @Min(value = 1, message = "Month must be >= 1")
    @Max(value = 12, message = "Month must be <= 12")
    private Integer month;
}
