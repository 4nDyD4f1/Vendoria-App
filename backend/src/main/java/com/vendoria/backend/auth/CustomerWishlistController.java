package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerWishlistDtos.*;

@RestController
@RequestMapping("/api/customer/wishlist")
class CustomerWishlistController {
    private final CustomerWishlistService service;
    private final AuthThrottle throttle=new AuthThrottle();
    CustomerWishlistController(CustomerWishlistService service) { this.service=service; }
    @GetMapping ResponseEntity<Listing> list(HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request)));
    }
    @PutMapping("/{itemId}") ResponseEntity<Void> save(@PathVariable long itemId,HttpServletRequest request) {
        long actor=mutation(request);service.save(actor,itemId);return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/{itemId}") ResponseEntity<Void> remove(@PathVariable long itemId,HttpServletRequest request) {
        long actor=mutation(request);service.remove(actor,itemId);return ResponseEntity.noContent().build();
    }
    private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
    private long mutation(HttpServletRequest request) {
        Long actor=id(request);
        if(actor==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
        if(!"1".equals(request.getHeader("X-Wishlist-Request"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan wishlist tidak valid.");
        // Bind delayed UI mutations to their initiating account, in addition to server-side session authorization.
        if(!String.valueOf(actor).equals(request.getHeader("X-Wishlist-Owner"))) throw new ResponseStatusException(HttpStatus.CONFLICT,"Akun telah berubah. Muat ulang halaman sebelum mengubah wishlist.");
        throttle.checkIp(request.getRemoteAddr());return actor;
    }
}
