package com.vendoria.backend.auth;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerPaymentDtos.*;

@RestController
@RequestMapping("/api")
class CustomerPaymentController {
    private final CustomerPaymentService service;
    private final AuthThrottle throttle = new AuthThrottle();
    CustomerPaymentController(CustomerPaymentService service) { this.service = service; }

    @GetMapping("/customer/payments") ResponseEntity<Summary> summary(@RequestParam(required = false) List<Long> orders, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.summary(id(request), orders == null ? List.of() : orders));
    }
    @PostMapping("/customer/payments") ResponseEntity<Pay> pay(@Valid @RequestBody PayRequest input, HttpServletRequest request) {
        if (!"1".equals(request.getHeader("X-Payment-Request"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permintaan pembayaran tidak valid");
        throttle.checkIp(request.getRemoteAddr());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.pay(id(request), input.orderIds() == null ? List.of() : input.orderIds()));
    }
    @GetMapping("/customer/payments/confirmation") ResponseEntity<Confirmation> confirmation(@RequestParam String ref, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.confirmation(id(request), ref));
    }
    /** Webhook Midtrans (tanpa login). Isinya tidak dipercaya: hanya order_id yang dipakai, status diambil ulang dari API Midtrans. */
    @PostMapping("/payments/midtrans/notify") ResponseEntity<Void> notify(@RequestBody Map<String, Object> body) {
        service.sync(String.valueOf(body.get("order_id")));
        return ResponseEntity.ok().build();
    }
    private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
