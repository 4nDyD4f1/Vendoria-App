package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminClaimDtos.*;

@RestController
@RequestMapping("/api/admin/claims")
class AdminClaimController {
  private final AdminClaimService service;
  private final AuthThrottle throttle=new AuthThrottle();
  AdminClaimController(AdminClaimService service) { this.service=service; }
  @GetMapping ResponseEntity<List<Claim>> list(HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request))); }
  @PostMapping("/{id}/decision") ResponseEntity<Claim> decide(@PathVariable Long id,@Valid @RequestBody Decision decision,HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Admin-Claims"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan klaim tidak valid");
    throttle.checkIp(request.getRemoteAddr());
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.decide(id(request),id,decision));
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
