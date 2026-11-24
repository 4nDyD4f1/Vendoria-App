package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorDashboardDtos.*;

@RestController
@RequestMapping("/api/vendor")
class VendorDashboardController {
  private final VendorDashboardService dashboard;
  private final VendorNotificationService notifications;
  private final AuthThrottle throttle=new AuthThrottle();
  VendorDashboardController(VendorDashboardService dashboard,VendorNotificationService notifications) { this.dashboard=dashboard; this.notifications=notifications; }

  @GetMapping("/dashboard") ResponseEntity<Summary> summary(HttpServletRequest request) { return noStore(dashboard.summary(id(request))); }
  @GetMapping("/notifications") ResponseEntity<List<Notification>> list(HttpServletRequest request) { return noStore(notifications.list(id(request))); }
  @PostMapping("/notifications/read") ResponseEntity<Void> read(@Valid @RequestBody Ids input,HttpServletRequest request) {
    mutation(request); notifications.markRead(id(request),input.ids()); return ResponseEntity.noContent().build();
  }
  @PostMapping("/notifications/dismiss") ResponseEntity<Void> dismiss(@Valid @RequestBody Ids input,HttpServletRequest request) {
    mutation(request); notifications.dismiss(id(request),input.ids()); return ResponseEntity.noContent().build();
  }

  private void mutation(HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Vendor-Notifications"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan notifikasi tidak valid");
    throttle.checkIp(request.getRemoteAddr());
  }
  private static <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
