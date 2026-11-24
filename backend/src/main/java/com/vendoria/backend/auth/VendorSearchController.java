package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.VendorSearchDtos.Listing;

@RestController
@RequestMapping("/api/vendor/search")
class VendorSearchController {
    private final VendorSearchService service;
    VendorSearchController(VendorSearchService service) { this.service = service; }

    @GetMapping
    ResponseEntity<Listing> list(@RequestParam(defaultValue="") String q,
            @RequestParam(defaultValue="all") String kind, @RequestParam(defaultValue="1") int page,
            @RequestParam(defaultValue="10") int size, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
            service.list(AccountSecurityService.userId(request.getSession(false)), q, kind, page, size));
    }
}
