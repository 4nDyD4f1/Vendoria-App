package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.RefundAccountDtos.*;

@RestController
@RequestMapping("/api/account")
class RefundAccountController {
  private final RefundAccountService service;
  RefundAccountController(RefundAccountService service) { this.service=service; }
  @GetMapping("/refund-accounts") ResponseEntity<List<Account>> list(HttpServletRequest request) { return noStore(service.list(id(request))); }
  @PostMapping("/refund-accounts") ResponseEntity<Account> create(@Valid @RequestBody Input input,HttpServletRequest request) {
    return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(service.create(id(request),input));
  }
  @GetMapping("/refunds") ResponseEntity<List<Refund>> history(HttpServletRequest request) { return noStore(service.history(id(request))); }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
  private static <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
