package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.VendorOrdersDtos.*;

@RestController
@RequestMapping("/api/vendor/orders")
class VendorOrdersController {
	private final VendorOrdersService service;
	private final AuthThrottle throttle = new AuthThrottle();

	VendorOrdersController(VendorOrdersService service) {
		this.service = service;
	}

	@GetMapping
	ResponseEntity<Listing> list(
			@RequestParam(defaultValue = "semua") String status,
			@RequestParam(defaultValue = "") String q,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "10") int size,
			HttpServletRequest request) {
		return noStore(service.list(id(request), status, q, page, size));
	}

	@PostMapping("/setup")
	ResponseEntity<Listing> setup(@Valid @RequestBody Setup input, HttpServletRequest request) {
		mutation(request);
		return noStore(service.setup(id(request), input));
	}

	@GetMapping("/{orderId}")
	ResponseEntity<Detail> detail(@PathVariable Long orderId, HttpServletRequest request) {
		return noStore(service.get(id(request), orderId));
	}

	@PostMapping("/{orderId}/action")
	ResponseEntity<Detail> action(
			@PathVariable Long orderId,
			@Valid @RequestBody ActionRequest input,
			HttpServletRequest request) {
		mutation(request);
		return noStore(service.action(id(request), orderId, input));
	}

	private static Long id(HttpServletRequest request) {
		return AccountSecurityService.userId(request.getSession(false));
	}

	private void mutation(HttpServletRequest request) {
		if (!"1".equals(request.getHeader("X-Vendor-Orders"))) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permintaan pesanan tidak valid");
		}
		throttle.checkIp(request.getRemoteAddr());
	}

	private static <T> ResponseEntity<T> noStore(T value) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);
	}
}
