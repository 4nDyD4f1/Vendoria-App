package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorHandoversDtos.*;

@RestController
@RequestMapping("/api/vendor/handovers")
class VendorHandoversController {
    private final VendorHandoversService service;
    private final AuthThrottle throttle = new AuthThrottle();
    VendorHandoversController(VendorHandoversService service) { this.service = service; }

    @GetMapping
    ResponseEntity<Listing> list(@RequestParam(defaultValue="semua") String status, @RequestParam(defaultValue="") String q,
            @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="10") int size, HttpServletRequest request) {
        return noStore(service.list(id(request), status, q, page, size));
    }
    @GetMapping("/{orderId}")
    ResponseEntity<Detail> detail(@PathVariable long orderId, HttpServletRequest request) { return noStore(service.get(id(request), orderId)); }

    @PostMapping(value="/{orderId}/evidence", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<Detail> upload(@PathVariable long orderId, @Valid @RequestPart("data") Upload input,
            @RequestPart("photo") MultipartFile photo, HttpServletRequest request) {
        mutation(request);
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(service.upload(id(request), orderId, input, photo));
    }
    @DeleteMapping("/{orderId}/evidence/{evidenceId}")
    ResponseEntity<Detail> delete(@PathVariable long orderId, @PathVariable long evidenceId,
            @RequestParam String expectedStatus, HttpServletRequest request) {
        mutation(request);
        return noStore(service.deleteEvidence(id(request), orderId, evidenceId, expectedStatus));
    }
    @PostMapping("/{orderId}/damage")
    ResponseEntity<Detail> damage(@PathVariable long orderId, @Valid @RequestBody Damage input, HttpServletRequest request) {
        mutation(request); return noStore(service.reportDamage(id(request), orderId, input));
    }
    @PostMapping("/{orderId}/action")
    ResponseEntity<Detail> action(@PathVariable long orderId, @Valid @RequestBody Action input, HttpServletRequest request) {
        mutation(request); return noStore(service.action(id(request), orderId, input));
    }
    private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
    private void mutation(HttpServletRequest request) {
        if (!"1".equals(request.getHeader("X-Handover-Request"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permintaan serah terima tidak valid");
        throttle.checkIp(request.getRemoteAddr());
    }
    private static <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
