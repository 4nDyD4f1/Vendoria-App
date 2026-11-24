package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerNotificationDtos.*;

@RestController
@RequestMapping("/api/customer/notifications")
class CustomerNotificationController {
    private final CustomerNotificationService service;
    private final AuthThrottle throttle=new AuthThrottle();
    CustomerNotificationController(CustomerNotificationService service) { this.service=service; }
    @GetMapping ResponseEntity<Listing> list(HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request)));
    }
    @PostMapping("/read") ResponseEntity<Void> read(@Valid @RequestBody Ids input,HttpServletRequest request) {
        mutation(request); service.read(id(request),input.ids()); return ResponseEntity.noContent().build();
    }
    @PostMapping("/read-all") ResponseEntity<Void> readAll(HttpServletRequest request) {
        mutation(request); service.readAll(id(request)); return ResponseEntity.noContent().build();
    }
    private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
    private void mutation(HttpServletRequest request) {
        if(!"1".equals(request.getHeader("X-Customer-Notifications"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan notifikasi tidak valid");
        throttle.checkIp(request.getRemoteAddr());
    }
}
