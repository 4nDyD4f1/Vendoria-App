package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorPayoutDtos.*;

@RestController
@RequestMapping("/api/vendor")
class VendorPayoutController {
  private final VendorPayoutService service;
  private final AuthThrottle throttle=new AuthThrottle();
  VendorPayoutController(VendorPayoutService service) { this.service=service; }

  @GetMapping("/payout-account") ResponseEntity<AccountState> account(HttpServletRequest request) { return noStore(service.account(id(request))); }
  @PutMapping("/payout-account") ResponseEntity<AccountState> saveAccount(@Valid @RequestBody AccountInput input,HttpServletRequest request) {
    mutation(request,"X-Vendor-Payout-Account"); return noStore(service.saveAccount(id(request),input));
  }
  @GetMapping("/payouts") ResponseEntity<Listing> list(HttpServletRequest request) { return noStore(service.list(id(request))); }
  @PostMapping("/payouts/request") ResponseEntity<Requested> request(HttpServletRequest request) {
    mutation(request,"X-Vendor-Payouts"); return noStore(service.request(id(request)));
  }

  private void mutation(HttpServletRequest request,String header) {
    if(!"1".equals(request.getHeader(header))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan pencairan tidak valid");
    throttle.checkIp(request.getRemoteAddr());
  }
  private static <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
