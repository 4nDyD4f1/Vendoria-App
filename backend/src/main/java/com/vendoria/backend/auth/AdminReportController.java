package com.vendoria.backend.auth;

import java.time.LocalDate;
import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.AdminReportDtos.*;

@RestController
@RequestMapping("/api/admin/reports")
class AdminReportController {
  private final AdminReportService service;
  private final AuthThrottle throttle=new AuthThrottle();
  AdminReportController(AdminReportService service) { this.service=service; }
  @GetMapping("/transactions") ResponseEntity<List<Transaction>> transactions(
      @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate start,
      @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate end,HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.transactions(id(request),start,end));
  }
  @GetMapping("/payouts") ResponseEntity<List<Payout>> payouts(HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.payouts(id(request)));
  }
  @PostMapping("/payouts/{id}/decision") ResponseEntity<Payout> decidePayout(@PathVariable Long id,@Valid @RequestBody PayoutDecision decision,HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Admin-Payouts"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan pencairan tidak valid");
    throttle.checkIp(request.getRemoteAddr());
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.decidePayout(id(request),id,decision));
  }
  @GetMapping("/refunds") ResponseEntity<List<Refund>> refunds(HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.refunds(id(request)));
  }
  @PostMapping("/refunds/{id}/complete") ResponseEntity<Refund> completeRefund(@PathVariable Long id,@Valid @RequestBody RefundDone input,HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Admin-Payouts"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan pengembalian dana tidak valid");
    throttle.checkIp(request.getRemoteAddr());
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.completeRefund(id(request),id,input));
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
