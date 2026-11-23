package com.vendoria.backend.auth;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.vendoria.backend.auth.KycDtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
class KycController {
	private final KycService service;
	private final AuthThrottle throttle;
	KycController(KycService service, AuthThrottle throttle) { this.service = service; this.throttle = throttle; }

	@GetMapping("/api/kyc/me")
	ResponseEntity<Mine> mine(HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.mine(id(request))); }

	@PostMapping(value = "/api/kyc", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	ResponseEntity<Mine> submit(@Valid @RequestPart("data") Identity identity,
			@RequestPart("ktp") MultipartFile ktp, @RequestPart("selfie") MultipartFile selfie, HttpServletRequest request) {
		// Header khusus memaksa preflight untuk unggahan lintas-origin; form HTML biasa tidak dapat mengirimnya.
		if (!"1".equals(request.getHeader("X-KYC-Request")))
			throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Permintaan unggahan tidak valid");
		throttle.checkIp(request.getRemoteAddr());
		return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(service.submit(id(request), identity, ktp, selfie));
	}

	@GetMapping("/api/admin/kyc")
	ResponseEntity<Listing> list(@RequestParam(defaultValue = "menunggu") String status, @RequestParam(defaultValue = "") String q,
			@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size, HttpServletRequest request) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request), status, q, page, size));
	}

	@GetMapping("/api/kyc/{kycId}")
	ResponseEntity<Detail> detail(@PathVariable Long kycId, HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.get(id(request), kycId)); }

	@PostMapping("/api/admin/kyc/{kycId}/decision")
	Detail decide(@PathVariable Long kycId, @Valid @RequestBody Decision decision, HttpServletRequest request) {
		throttle.checkIp(request.getRemoteAddr());
		return service.decide(id(request), kycId, decision);
	}

	@GetMapping("/api/kyc/{kycId}/documents/{kind}")
	ResponseEntity<byte[]> document(@PathVariable Long kycId, @PathVariable String kind, HttpServletRequest request) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG)
				.header("X-Content-Type-Options", "nosniff").header("Content-Disposition", "inline; filename=\"kyc-" + kind + ".png\"")
				.body(service.document(id(request), kycId, kind));
	}
	private Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
