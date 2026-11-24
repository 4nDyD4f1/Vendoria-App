package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.AdminDashboardDtos.*;

@RestController
@RequestMapping("/api/admin/dashboard")
class AdminDashboardController {
  private final AdminDashboardService service;
  AdminDashboardController(AdminDashboardService service) { this.service=service; }
  @GetMapping ResponseEntity<Summary> summary(HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.summary(AccountSecurityService.userId(request.getSession(false))));
  }
}
