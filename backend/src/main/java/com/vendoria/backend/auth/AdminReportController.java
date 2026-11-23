package com.vendoria.backend.auth;

import java.time.LocalDate;
import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.AdminReportDtos.*;

@RestController
@RequestMapping("/api/admin/reports")
class AdminReportController {
  private final AdminReportService service;
  AdminReportController(AdminReportService service) { this.service=service; }
  @GetMapping("/transactions") ResponseEntity<List<Transaction>> transactions(
      @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate start,
      @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate end,HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.transactions(id(request),start,end));
  }
  @GetMapping("/payouts") ResponseEntity<List<Payout>> payouts(HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.payouts(id(request)));
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
