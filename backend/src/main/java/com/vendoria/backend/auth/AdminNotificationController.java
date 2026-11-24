package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminNotificationDtos.*;

@RestController
@RequestMapping("/api/admin/notifications")
class AdminNotificationController {
  private final AdminNotificationService service;
  private final AuthThrottle throttle=new AuthThrottle();
  AdminNotificationController(AdminNotificationService service) { this.service=service; }
  @GetMapping ResponseEntity<List<Notification>> list(HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request))); }
  @PostMapping("/read") ResponseEntity<Void> read(@Valid @RequestBody Ids input,HttpServletRequest request) {
    mutation(request); service.markRead(id(request),input.ids()); return ResponseEntity.noContent().build();
  }
  @PostMapping("/dismiss") ResponseEntity<Void> dismiss(@Valid @RequestBody Ids input,HttpServletRequest request) {
    mutation(request); service.dismiss(id(request),input.ids()); return ResponseEntity.noContent().build();
  }
  private void mutation(HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Admin-Notifications"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan notifikasi tidak valid");
    throttle.checkIp(request.getRemoteAddr());
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
