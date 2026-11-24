package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorClaimDtos.*;

@RestController
@RequestMapping("/api/vendor/claims")
class VendorClaimController {
  private final VendorClaimService service;
  private final AuthThrottle throttle=new AuthThrottle();
  VendorClaimController(VendorClaimService service) { this.service=service; }
  @GetMapping ResponseEntity<List<Claim>> list(HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request))); }
  @PostMapping("/{id}/process") ResponseEntity<Claim> process(@PathVariable Long id,@Valid @RequestBody Advance input,HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Vendor-Claims"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan klaim tidak valid");
    throttle.checkIp(request.getRemoteAddr());
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.process(id(request),id,input));
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
