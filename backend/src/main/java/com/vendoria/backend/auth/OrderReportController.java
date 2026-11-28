package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.OrderReportDtos.*;

@RestController
@RequestMapping("/api")
class OrderReportController {
    private final OrderReportService service;
    private final AuthThrottle throttle = new AuthThrottle();
    OrderReportController(OrderReportService service) { this.service = service; }

    @GetMapping("/orders/{reference}/reports")
    ResponseEntity<Form> form(@PathVariable String reference, HttpServletRequest request) {
        return noStore(service.form(id(request), reference));
    }
    @PostMapping(value = "/orders/{reference}/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<Form> create(@PathVariable String reference, @Valid @RequestPart("data") Input input,
            @RequestPart(value = "photo", required = false) MultipartFile photo, HttpServletRequest request) {
        mutation(request, "X-Customer-Orders");
        return noStore(service.create(id(request), reference, input, photo));
    }
    @PostMapping(value = "/vendor/claims/{claimId}/response", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<Void> respond(@PathVariable long claimId, @Valid @RequestPart("data") Response input,
            @RequestPart(value = "photo", required = false) MultipartFile photo, HttpServletRequest request) {
        mutation(request, "X-Vendor-Claims");
        service.respond(id(request), claimId, input.text(), photo);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/vendor/claims/{claimId}/returned")
    ResponseEntity<Void> vendorReturned(@PathVariable long claimId, HttpServletRequest request) {
        mutation(request, "X-Vendor-Claims");
        service.confirmReturned(id(request), claimId, false);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/admin/claims/{claimId}/returned")
    ResponseEntity<Void> adminReturned(@PathVariable long claimId, HttpServletRequest request) {
        mutation(request, "X-Admin-Claims");
        service.confirmReturned(id(request), claimId, true);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/claims/{claimId}/photos/{side}")
    ResponseEntity<byte[]> photo(@PathVariable long claimId, @PathVariable String side, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG)
            .header("X-Content-Type-Options", "nosniff").body(service.photo(id(request), claimId, side));
    }

    private void mutation(HttpServletRequest request, String header) {
        if (!"1".equals(request.getHeader(header))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permintaan laporan tidak valid");
        throttle.checkIp(request.getRemoteAddr());
    }
    private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
    private static <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
