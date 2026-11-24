package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerCartDtos.*;

@RestController
@RequestMapping("/api/customer/cart")
class CustomerCartController {
    private final CustomerCartService service;
    private final AuthThrottle throttle = new AuthThrottle();
    CustomerCartController(CustomerCartService service) { this.service = service; }

    @GetMapping ResponseEntity<Listing> list(HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request)));
    }
    @PutMapping("/items/{itemId}") ResponseEntity<Void> put(@PathVariable long itemId, @Valid @RequestBody Quantity input, HttpServletRequest request) {
        mutation(request); service.put(id(request), itemId, input); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/items/{itemId}") ResponseEntity<Void> remove(@PathVariable long itemId, HttpServletRequest request) {
        mutation(request); service.remove(id(request), itemId); return ResponseEntity.noContent().build();
    }
    @PostMapping("/checkout") ResponseEntity<PlacedOrders> checkout(@Valid @RequestBody Checkout input, HttpServletRequest request) {
        mutation(request);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.checkout(id(request), input));
    }
    private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
    private void mutation(HttpServletRequest request) {
        if (!"1".equals(request.getHeader("X-Cart-Request"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permintaan keranjang tidak valid");
        throttle.checkIp(request.getRemoteAddr());
    }
}
