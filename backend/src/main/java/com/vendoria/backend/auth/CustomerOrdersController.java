package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerOrdersDtos.*;

/** Berdampingan dengan HandoverEvidenceController (/api/orders/{id}/handovers) yang sudah melayani bukti serah terima. */
@RestController
@RequestMapping("/api/orders")
class CustomerOrdersController {
    private final CustomerOrdersService service;
    private final AuthThrottle throttle = new AuthThrottle();
    CustomerOrdersController(CustomerOrdersService service) { this.service = service; }

    @GetMapping ResponseEntity<Listing> list(@RequestParam(defaultValue = "semua") String status, @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size, HttpServletRequest request) {
        return noStore(service.list(id(request), status, q, page, size));
    }
    @GetMapping("/{orderId}") ResponseEntity<Detail> detail(@PathVariable String orderId, HttpServletRequest request) {
        return noStore(service.getByReference(id(request), orderId));
    }
    @GetMapping("/{orderId}/items/{itemId}/photo") ResponseEntity<byte[]> photo(@PathVariable long orderId, @PathVariable long itemId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG)
            .header("X-Content-Type-Options", "nosniff").body(service.photo(id(request), orderId, itemId));
    }
    @PostMapping("/{orderId}/review") ResponseEntity<Detail> review(@PathVariable long orderId, @Valid @RequestBody ReviewInput input, HttpServletRequest request) {
        if (!"1".equals(request.getHeader("X-Customer-Orders"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permintaan pesanan tidak valid");
        String owner = request.getHeader("X-Customer-Orders-Owner");
        if (owner != null && !owner.equals(String.valueOf(id(request))))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Akun berubah. Muat ulang halaman sebelum mengirim ulasan.");
        throttle.checkIp(request.getRemoteAddr());
        return noStore(service.review(id(request), orderId, input));
    }
    private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
    private static <T> ResponseEntity<T> noStore(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
}
