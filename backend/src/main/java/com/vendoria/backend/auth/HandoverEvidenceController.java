package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.VendorHandoversDtos.Detail;

/** Shared read-only API for the order's customer, its vendor and active administrators. */
@RestController
@RequestMapping("/api/orders/{orderId}/handovers")
class HandoverEvidenceController {
    private final VendorHandoversService service;
    HandoverEvidenceController(VendorHandoversService service) { this.service = service; }

    @GetMapping
    ResponseEntity<Detail> detail(@PathVariable long orderId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.sharedDetail(id(request), orderId));
    }
    @GetMapping("/evidence/{evidenceId}/photo")
    ResponseEntity<byte[]> photo(@PathVariable long orderId, @PathVariable long evidenceId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG)
            .header("X-Content-Type-Options", "nosniff").header("Content-Disposition", "inline; filename=\"bukti-kondisi.png\"")
            .body(service.photo(id(request), orderId, evidenceId));
    }
    private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
