package com.vendoria.backend.auth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vendoria.backend.auth.AuthDtos.UserResponse;
import com.vendoria.backend.auth.ProfileDtos.ProfileRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/account/profile")
class ProfileController {

	private final ProfileService service;

	ProfileController(ProfileService service) {
		this.service = service;
	}

	@GetMapping
	UserResponse get(HttpServletRequest http) {
		return service.get(userId(http));
	}

	@PutMapping
	UserResponse update(@Valid @RequestBody ProfileRequest req, HttpServletRequest http) {
		return service.update(userId(http), req);
	}

	private Long userId(HttpServletRequest http) {
		HttpSession session = http.getSession(false);
		return session != null && session.getAttribute(AuthController.SESSION_USER_ID) instanceof Long id ? id : null;
	}
}
