package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.VendorSettingsDtos.*;

@RestController
@RequestMapping("/api/vendor/settings")
class VendorSettingsController {
	private final VendorSettingsService service;
	private final AuthThrottle throttle = new AuthThrottle();

	VendorSettingsController(VendorSettingsService service) {
		this.service = service;
	}

	@GetMapping
	ResponseEntity<SettingsResponse> get(HttpServletRequest request) {
		return noStore(service.get(id(request)));
	}

	@PutMapping("/owner")
	ResponseEntity<SettingsResponse> updateOwner(
			@Valid @RequestBody OwnerRequest body,
			HttpServletRequest request) {
		mutation(request);
		return noStore(service.updateOwner(id(request), body));
	}

	@PutMapping("/business")
	ResponseEntity<SettingsResponse> updateBusiness(
			@Valid @RequestBody BusinessRequest body,
			HttpServletRequest request) {
		mutation(request);
		return noStore(service.updateBusiness(id(request), body));
	}

	private static Long id(HttpServletRequest request) {
		return AccountSecurityService.userId(request.getSession(false));
	}

	private void mutation(HttpServletRequest request) {
		if (!"1".equals(request.getHeader("X-Vendor-Settings"))) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permintaan pengaturan tidak valid");
		}
		throttle.checkIp(request.getRemoteAddr());
	}

	private static <T> ResponseEntity<T> noStore(T value) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);
	}
}
