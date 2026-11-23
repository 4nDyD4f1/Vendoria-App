package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminAccountDtos.*;

@RestController
@RequestMapping("/api/admin/accounts")
class AdminAccountController {
  private final AdminAccountService service;
  private final AuthThrottle throttle=new AuthThrottle();
  AdminAccountController(AdminAccountService service) { this.service=service; }
  @GetMapping ResponseEntity<Directory> list(HttpServletRequest request) { return response(service.list(id(request))); }
  @GetMapping("/{kind}/{userId}") ResponseEntity<Account> get(@PathVariable String kind,@PathVariable Long userId,HttpServletRequest request) { return response(service.get(id(request),kind,userId)); }
  @PostMapping("/{kind}") ResponseEntity<Account> create(@PathVariable String kind,@Valid @RequestBody Input input,HttpServletRequest request) {
    mutation(request); return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(service.save(id(request),kind,null,input));
  }
  @PutMapping("/{kind}/{userId}") ResponseEntity<Account> update(@PathVariable String kind,@PathVariable Long userId,@Valid @RequestBody Input input,HttpServletRequest request) {
    mutation(request); return response(service.save(id(request),kind,userId,input));
  }
  @DeleteMapping("/{kind}/{userId}") ResponseEntity<Void> delete(@PathVariable String kind,@PathVariable Long userId,HttpServletRequest request) {
    mutation(request); service.delete(id(request),kind,List.of(userId)); return ResponseEntity.noContent().build();
  }
  @PostMapping("/{kind}/delete") ResponseEntity<Void> deleteMany(@PathVariable String kind,@Valid @RequestBody Delete input,HttpServletRequest request) {
    mutation(request); service.delete(id(request),kind,input.ids()); return ResponseEntity.noContent().build();
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
  private void mutation(HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Admin-Accounts"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan pengguna tidak valid");
    throttle.checkIp(request.getRemoteAddr());
  }
  private static <T> ResponseEntity<T> response(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
}
