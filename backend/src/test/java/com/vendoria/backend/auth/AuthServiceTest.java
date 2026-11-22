package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.AuthDtos.LoginRequest;
import com.vendoria.backend.auth.AuthDtos.RegisterRequest;

// Unit test murni (repository di-mock): tidak menulis ke db_vendoria, jadi tidak menghabiskan nomor user_id.
class AuthServiceTest {

	private final PenggunaRepository repo = mock(PenggunaRepository.class);
	private final AuthService service = new AuthService(repo, new AuthThrottle());

	private RegisterRequest req() {
		return new RegisterRequest("customer", "  Budi  ", "  Budi@Mail.COM ", "08123456789", "rahasia123");
	}

	@Test
	void registerMenyimpanHashBcryptDanEmailHurufKecil() {
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.empty());
		when(repo.saveAndFlush(any(Pengguna.class))).thenAnswer(i -> i.getArgument(0));

		var res = service.register(req());

		var captor = ArgumentCaptor.forClass(Pengguna.class);
		verify(repo).saveAndFlush(captor.capture());
		Pengguna saved = captor.getValue();
		assertEquals("budi@mail.com", saved.getEmail());
		assertEquals("Budi", saved.getNama());
		assertNotEquals("rahasia123", saved.getPasswordHash());
		assertTrue(new BCryptPasswordEncoder().matches("rahasia123", saved.getPasswordHash()));
		assertEquals("belum_diverifikasi", res.statusVerifikasi());
	}

	@Test
	void registerEmailSudahAdaDitolak409TanpaMenyimpan() {
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.of(mock(Pengguna.class)));

		var e = assertThrows(ResponseStatusException.class, () -> service.register(req()));

		assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
		verify(repo, never()).saveAndFlush(any());
	}

	@Test
	void loginBenarSalahDanEmailTakDikenal() {
		Pengguna p = new Pengguna("Budi", "budi@mail.com", "0812", new BCryptPasswordEncoder().encode("rahasia123"), "customer");
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.of(p));
		when(repo.findByEmail("x@mail.com")).thenReturn(Optional.empty());

		assertEquals("budi@mail.com", service.login(new LoginRequest(" BUDI@mail.com", "rahasia123")).email());
		assertEquals(HttpStatus.UNAUTHORIZED,
				assertThrows(ResponseStatusException.class, () -> service.login(new LoginRequest("budi@mail.com", "salah"))).getStatusCode());
		assertEquals(HttpStatus.UNAUTHORIZED,
				assertThrows(ResponseStatusException.class, () -> service.login(new LoginRequest("x@mail.com", "rahasia123"))).getStatusCode());
	}
}
