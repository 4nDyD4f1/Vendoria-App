package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.ProfileDtos.ProfileRequest;

// Tidak menulis data maupun mengubah skema db_vendoria.
class ProfileServiceTest {

	private final PenggunaRepository repo = mock(PenggunaRepository.class);
	private final ProfileService service = new ProfileService(repo);

	private Pengguna user(Long id, String email, String googleSub, String status) {
		Pengguna user = mock(Pengguna.class);
		when(user.getUserId()).thenReturn(id);
		when(user.getEmail()).thenReturn(email);
		when(user.getGoogleSub()).thenReturn(googleSub);
		when(user.getStatusAkun()).thenReturn(status);
		return user;
	}

	private ProfileRequest request() {
		return new ProfileRequest("  Budi Baru  ", " BARU@example.com ", "+62 (812)-3456 7890");
	}

	@Test
	void updateNormalizesInputAndReturnsFreshDatabaseValues() {
		Pengguna original = user(7L, "lama@example.com", null, "Aktif");
		Pengguna updated = user(7L, "baru@example.com", null, "Aktif");
		when(updated.getNama()).thenReturn("Budi Baru");
		when(updated.getNoTelp()).thenReturn("+6281234567890");
		when(repo.findById(7L)).thenReturn(Optional.of(original), Optional.of(updated));
		when(repo.updateProfile(7L, "Budi Baru", "baru@example.com", "+6281234567890")).thenReturn(1);

		var response = service.update(7L, request());

		assertEquals("Budi Baru", response.nama());
		assertEquals("baru@example.com", response.email());
		assertEquals("+6281234567890", response.noTelp());
		verify(repo).updateProfile(7L, "Budi Baru", "baru@example.com", "+6281234567890");
	}

	@Test
	void rejectsMissingDeletedAndDisabledSessionsWithoutWriting() {
		assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
				() -> service.update(null, request())).getStatusCode());
		assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
				() -> service.get(404L)).getStatusCode());
		Pengguna disabled = user(7L, "lama@example.com", null, "Nonaktif");
		when(repo.findById(7L)).thenReturn(Optional.of(disabled));
		assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
				() -> service.update(7L, request())).getStatusCode());
		verify(repo, never()).updateProfile(anyLong(), any(), any(), any());
	}

	@Test
	void rejectsDuplicateEmailIncludingConcurrentUniqueIndexViolation() {
		Pengguna original = user(7L, "lama@example.com", null, "Aktif");
		Pengguna other = user(8L, "baru@example.com", null, "Aktif");
		when(repo.findById(7L)).thenReturn(Optional.of(original));
		when(repo.findByEmail("baru@example.com")).thenReturn(Optional.of(other));
		assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
				() -> service.update(7L, request())).getStatusCode());
		verify(repo, never()).updateProfile(anyLong(), any(), any(), any());

		when(repo.findByEmail("baru@example.com")).thenReturn(Optional.empty());
		when(repo.updateProfile(anyLong(), any(), any(), any())).thenThrow(new DataIntegrityViolationException("unique index"));
		assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
				() -> service.update(7L, request())).getStatusCode());
	}

	@Test
	void googleEmailCannotChangeButOtherProfileFieldsCan() {
		Pengguna google = user(7L, "google@example.com", "google-sub", "Aktif");
		when(repo.findById(7L)).thenReturn(Optional.of(google));
		assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
				() -> service.update(7L, request())).getStatusCode());
		verify(repo, never()).updateProfile(anyLong(), any(), any(), any());

		when(repo.findByEmail("google@example.com")).thenReturn(Optional.of(google));
		when(repo.updateProfile(7L, "Nama Baru", "google@example.com", "081234567890")).thenReturn(1);
		service.update(7L, new ProfileRequest("Nama Baru", "GOOGLE@example.com", "081234567890"));
		verify(repo).updateProfile(7L, "Nama Baru", "google@example.com", "081234567890");
	}

	@Test
	void concurrentAccountChangeCannotProduceFalseSuccess() {
		Pengguna original = user(7L, "lama@example.com", null, "Aktif");
		when(repo.findById(7L)).thenReturn(Optional.of(original));
		assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
				() -> service.update(7L, request())).getStatusCode());
	}
}
