package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.AdminAccountDtos.*;

@RestController
@RequestMapping("/api/admin/accounts")
class AdminAccountController {
  private final AdminAccountService service;
  AdminAccountController(AdminAccountService service) { this.service=service; }
  @GetMapping ResponseEntity<Directory> list(HttpServletRequest request) { return response(service.list(id(request))); }
  @GetMapping("/{kind}/{userId}") ResponseEntity<Account> get(@PathVariable String kind,@PathVariable Long userId,HttpServletRequest request) { return response(service.get(id(request),kind,userId)); }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
  private static <T> ResponseEntity<T> response(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
}
