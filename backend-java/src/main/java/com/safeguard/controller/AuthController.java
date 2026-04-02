package com.safeguard.controller;

import com.safeguard.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.annotation.PostConstruct;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@Tag(name = "Authentication", description = "JWT-based authentication with BCrypt password encryption")
public class AuthController {

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtUtil jwtUtil;

    // In-memory user storage (will migrate to database)
    private static final Map<String, User> users = new ConcurrentHashMap<>();
    
    @PostConstruct
    public void initUsers() {
        // Pre-populate demo users with encrypted passwords
        users.put("citizen@safeguard.ai", new User(
            "citizen@safeguard.ai", 
            passwordEncoder.encode("citizen123"), 
            "CITIZEN", 
            "John Doe"
        ));
        users.put("police@safeguard.ai", new User(
            "police@safeguard.ai", 
            passwordEncoder.encode("police123"), 
            "POLICE", 
            "Officer Smith"
        ));
        users.put("govt@safeguard.ai", new User(
            "govt@safeguard.ai", 
            passwordEncoder.encode("govt123"), 
            "GOVERNMENT", 
            "Admin Jones"
        ));
        users.put("business@safeguard.ai", new User(
            "business@safeguard.ai", 
            passwordEncoder.encode("business123"), 
            "BUSINESS", 
            "Driver Corp"
        ));
    }

    @PostMapping("/login")
    @Operation(summary = "User Login", description = "Authenticate user and return JWT token (expires in 1 hour)")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        try {
            User user = users.get(request.email);
            
            if (user != null && passwordEncoder.matches(request.password, user.password)) {
                // Generate JWT token
                String token = jwtUtil.generateToken(user.email, user.role, user.name);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("token", token);
                response.put("role", user.role);
                response.put("name", user.name);
                response.put("email", user.email);
                response.put("expiresIn", "1h");
                
                return ResponseEntity.ok(response);
            }
            
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Authentication failed: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/register")
    @Operation(summary = "User Registration", description = "Register new user with encrypted password (defaults to CITIZEN role)")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            if (users.containsKey(request.email)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already registered");
            }
            
            // Encrypt password before storing
            String encryptedPassword = passwordEncoder.encode(request.password);
            User newUser = new User(request.email, encryptedPassword, "CITIZEN", request.name);
            users.put(request.email, newUser);
            
            // Generate JWT token for immediate login
            String token = jwtUtil.generateToken(newUser.email, newUser.role, newUser.name);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Registration successful");
            response.put("token", token);
            response.put("role", newUser.role);
            response.put("name", newUser.name);
            response.put("email", newUser.email);
            
            return ResponseEntity.ok(response);
            
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/validate")
    @Operation(summary = "Validate JWT Token", description = "Validate JWT token and return user info")
    public ResponseEntity<Map<String, Object>> validate(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "").trim();
            
            if (!jwtUtil.validateToken(token)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
            }
            
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);
            String name = jwtUtil.extractName(token);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("role", role);
            response.put("name", name);
            response.put("email", email);
            response.put("valid", true);
            
            return ResponseEntity.ok(response);
            
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Token validation failed");
            error.put("valid", false);
            return ResponseEntity.status(401).body(error);
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "User Logout", description = "Client-side logout (JWT invalidation on client)")
    public ResponseEntity<Map<String, Object>> logout() {
        // JWT tokens are stateless, so logout is client-side only
        // Client should delete the token from storage
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Logged out successfully. Token should be deleted on client.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/demo-credentials")
    @Operation(summary = "Get Demo Credentials", description = "Returns demo login credentials for testing")
    public Map<String, Object> getDemoCredentials() {
        Map<String, Object> response = new HashMap<>();
        List<Map<String, String>> credentials = new ArrayList<>();
        
        Map<String, String> cred1 = new HashMap<>();
        cred1.put("role", "CITIZEN");
        cred1.put("email", "citizen@safeguard.ai");
        cred1.put("password", "citizen123");
        credentials.add(cred1);
        
        Map<String, String> cred2 = new HashMap<>();
        cred2.put("role", "POLICE");
        cred2.put("email", "police@safeguard.ai");
        cred2.put("password", "police123");
        credentials.add(cred2);
        
        Map<String, String> cred3 = new HashMap<>();
        cred3.put("role", "GOVERNMENT");
        cred3.put("email", "govt@safeguard.ai");
        cred3.put("password", "govt123");
        credentials.add(cred3);
        
        Map<String, String> cred4 = new HashMap<>();
        cred4.put("role", "BUSINESS");
        cred4.put("email", "business@safeguard.ai");
        cred4.put("password", "business123");
        credentials.add(cred4);
        
        response.put("demoAccounts", credentials);
        response.put("note", "Passwords are now BCrypt encrypted in storage");
        response.put("tokenExpiry", "1 hour");
        return response;
    }

    // Request DTOs with validation
    static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        public String email;
        
        @NotBlank(message = "Password is required")
        public String password;
    }

    static class RegisterRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        public String email;
        
        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        public String password;
        
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        public String name;
    }

    static class User {
        public String email;
        public String password; // BCrypt hashed
        public String role;
        public String name;

        public User(String email, String password, String role, String name) {
            this.email = email;
            this.password = password;
            this.role = role;
            this.name = name;
        }
    }
}
