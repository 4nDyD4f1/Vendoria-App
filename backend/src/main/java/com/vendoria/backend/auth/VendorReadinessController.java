package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vendor/readiness")
class VendorReadinessController {
    private final VendorBusinessPolicy policy;
    VendorReadinessController(VendorBusinessPolicy policy) { this.policy = policy; }
    @GetMapping ResponseEntity<VendorBusinessPolicy.Readiness> get(HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(policy.get(AccountSecurityService.userId(request.getSession(false))));
    }
}
