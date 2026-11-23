package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.AuthDtos.AdministratorRequest;

// Unit test murni (repository di-mock): tidak menulis ke db_vendoria.
class AdministratorServiceTest {

	private final PenggunaRepository repo = mock(PenggunaRepository.class);
	private final AdministratorService service = new AdministratorService(repo);

	private Pengguna akun(long id, String role, String status) {
		Pengguna p = mock(Pengguna.class);
		when(p.getUserId()).thenReturn(id);
		when(p.getRole()).thenReturn(role);
		when(p.getStatusAkun()).thenReturn(status);
		when(repo.findById(id)).thenReturn(Optional.of(p));
		return p;
	}

	private AdministratorRequest req(String status, String password) {
		return new AdministratorRequest("  Nabila  ", " Nabila@Mail.COM ", status, " ", password);
	}

	private HttpStatus status(Runnable r) {
		return HttpStatus.valueOf(assertThrows(ResponseStatusException.class, r::run).getStatusCode().value());
	}

	@Test
	void tanpaLoginDitolak401() {
		assertEquals(HttpStatus.UNAUTHORIZED, status(() -> service.daftar(null)));
	}

	@Test
	void customerDitolak403() {
		akun(1, "customer", "Aktif");
		assertEquals(HttpStatus.FORBIDDEN, status(() -> service.daftar(1L)));
	}

	@Test
	void adminNonaktifDitolak403() {
		akun(1, "admin", "Nonaktif");
		assertEquals(HttpStatus.FORBIDDEN, status(() -> service.daftar(1L)));
	}

	@Test
	void adminMenambahDenganHashDanEmailHurufKecil() {
		akun(1, "admin", "Aktif");
		when(repo.findByEmail("nabila@mail.com")).thenReturn(Optional.empty());
		when(repo.saveAndFlush(any(Pengguna.class))).thenAnswer(i -> i.getArgument(0));

		var res = service.tambah(1L, req("Aktif", "rahasia123"));

		var captor = ArgumentCaptor.forClass(Pengguna.class);
		verify(repo).saveAndFlush(captor.capture());
		Pengguna saved = captor.getValue();
		assertEquals("admin", saved.getRole());
		assertEquals("nabila@mail.com", saved.getEmail());
		assertEquals("Nabila", saved.getNama());
		assertEquals(null, saved.getCatatanAdmin()); // catatan kosong disimpan null
		assertTrue(new BCryptPasswordEncoder().matches("rahasia123", saved.getPasswordHash()));
		assertEquals("Aktif", res.status());
	}

	@Test
	void tambahTanpaKataSandiDitolak400() {
		akun(1, "admin", "Aktif");
		assertEquals(HttpStatus.BAD_REQUEST, status(() -> service.tambah(1L, req("Aktif", null))));
	}

	@Test
	void tambahEmailSudahAdaDitolak409() {
		akun(1, "admin", "Aktif");
		when(repo.findByEmail("nabila@mail.com")).thenReturn(Optional.of(mock(Pengguna.class)));
		assertEquals(HttpStatus.CONFLICT, status(() -> service.tambah(1L, req("Aktif", "rahasia123"))));
		verify(repo, never()).saveAndFlush(any());
	}

	@Test
	void ubahDiriSendiriBolehTapiTakBolehMenonaktifkanDiri() {
		akun(1, "admin", "Aktif");
		assertEquals(HttpStatus.BAD_REQUEST, status(() -> service.ubah(1L, 1L, req("Nonaktif", null))));
		verify(repo, never()).updateAdmin(any(), any(), any(), any(), any());
		service.ubah(1L, 1L, req("Aktif", null)); // nama/email/kata sandi sendiri boleh diubah
		verify(repo).updateAdmin(1L, "Nabila", "nabila@mail.com", "Aktif", null);
	}

	@Test
	void ubahAdminLainTanpaKataSandiTidakMenyentuhKataSandi() {
		akun(1, "admin", "Aktif");
		akun(2, "admin", "Aktif");
		when(repo.findByEmail("nabila@mail.com")).thenReturn(Optional.empty());

		service.ubah(1L, 2L, req("Nonaktif", null));

		verify(repo).updateAdmin(2L, "Nabila", "nabila@mail.com", "Nonaktif", null);
		verify(repo, never()).updatePassword(any(), any());
	}

	@Test
	void ubahEmailMilikAkunLainDitolak409() {
		akun(1, "admin", "Aktif");
		akun(2, "admin", "Aktif");
		Pengguna lain = mock(Pengguna.class);
		when(lain.getUserId()).thenReturn(9L);
		when(repo.findByEmail("nabila@mail.com")).thenReturn(Optional.of(lain));
		assertEquals(HttpStatus.CONFLICT, status(() -> service.ubah(1L, 2L, req("Aktif", null))));
	}

	@Test
	void akunNonAdminTakBisaDiubahAtauDihapusLewatEndpointIni() {
		akun(1, "admin", "Aktif");
		akun(5, "customer", "Aktif");
		assertEquals(HttpStatus.NOT_FOUND, status(() -> service.ubah(1L, 5L, req("Aktif", null))));
		assertEquals(HttpStatus.NOT_FOUND, status(() -> service.hapus(1L, 5L)));
		verify(repo, never()).deleteById(any());
	}

	@Test
	void hapusDiriSendiriDitolak400() {
		akun(1, "admin", "Aktif");
		assertEquals(HttpStatus.BAD_REQUEST, status(() -> service.hapus(1L, 1L)));
		verify(repo, never()).deleteById(any());
	}

	@Test
	void hapusAdminYangSudahPunyaRiwayatDitolak409() {
		akun(1, "admin", "Aktif");
		akun(2, "admin", "Aktif");
		doThrow(new DataIntegrityViolationException("fk")).when(repo).deleteById(2L);
		assertEquals(HttpStatus.CONFLICT, status(() -> service.hapus(1L, 2L)));
	}

	@Test
	void hapusAdminLainBerhasil() {
		akun(1, "admin", "Aktif");
		akun(2, "admin", "Aktif");
		service.hapus(1L, 2L);
		verify(repo).deleteById(2L);
	}
}
