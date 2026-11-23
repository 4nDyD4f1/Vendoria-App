package com.vendoria.backend.auth;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.vendoria.backend.auth.AuthDtos.AdministratorRequest;
import com.vendoria.backend.auth.AuthDtos.AdministratorResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/administrators")
class AdministratorController {

	private final AdministratorService service;

	AdministratorController(AdministratorService service) {
		this.service = service;
	}

	@GetMapping
	List<AdministratorResponse> daftar(HttpServletRequest http) {
		return service.daftar(aktor(http));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	AdministratorResponse tambah(@Valid @RequestBody AdministratorRequest req, HttpServletRequest http) {
		return service.tambah(aktor(http), req);
	}

	@PutMapping("/{id}")
	AdministratorResponse ubah(@PathVariable Long id, @Valid @RequestBody AdministratorRequest req, HttpServletRequest http) {
		return service.ubah(aktor(http), id, req);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void hapus(@PathVariable Long id, HttpServletRequest http) {
		service.hapus(aktor(http), id);
	}

	// user_id dari sesi login (null bila belum login); izin diperiksa service terhadap DB
	private static Long aktor(HttpServletRequest http) {
		HttpSession session = http.getSession(false);
		return session != null && session.getAttribute(AuthController.SESSION_USER_ID) instanceof Long id ? id : null;
	}
}
