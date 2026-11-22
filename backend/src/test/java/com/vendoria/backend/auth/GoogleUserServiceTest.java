package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
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

import com.vendoria.backend.auth.GoogleUserService.GoogleLoginException;

// Repository di-mock: tidak menulis ke db_vendoria.
class GoogleUserServiceTest {

	private final PenggunaRepository repo = mock(PenggunaRepository.class);
	private final GoogleUserService service = new GoogleUserService(repo);

	@Test
	void subSudahDikenalLangsungDipakaiTanpaMelihatEmail() {
		Pengguna ada = mock(Pengguna.class);
		when(repo.findByGoogleSub("S1")).thenReturn(Optional.of(ada));

		// email sudah berganti & belum terverifikasi pun tak masalah: sub yang menentukan
		assertSame(ada, service.findOrCreate("S1", "baru@mail.com", false, "X"));
		verify(repo, never()).findByEmail(any());
		verify(repo, never()).saveAndFlush(any());
	}

	@Test
	void penggunaBaruDibuatSebagaiCustomerTanpaTeleponDenganHashAcak() {
		when(repo.findByGoogleSub("S1")).thenReturn(Optional.empty());
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.empty());
		when(repo.saveAndFlush(any(Pengguna.class))).thenAnswer(i -> i.getArgument(0));

		service.findOrCreate("S1", " Budi@Mail.com ", true, "  Budi Santoso ");

		var captor = ArgumentCaptor.forClass(Pengguna.class);
		verify(repo).saveAndFlush(captor.capture());
		Pengguna p = captor.getValue();
		assertEquals("S1", p.getGoogleSub());
		assertEquals("budi@mail.com", p.getEmail());
		assertEquals("Budi Santoso", p.getNama());
		assertEquals("customer", p.getRole());
		assertEquals("belum_diverifikasi", p.getStatusVerifikasi());
		assertNull(p.getNoTelp()); // dikosongkan: customer melengkapinya sendiri di profil
		assertTrue(p.getPasswordHash().startsWith("$2")); // BCrypt dari rahasia acak, bukan password siapa pun
	}

	@Test
	void namaKosongMemakaiBagianDepanEmail() {
		when(repo.findByGoogleSub("S1")).thenReturn(Optional.empty());
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.empty());
		when(repo.saveAndFlush(any(Pengguna.class))).thenAnswer(i -> i.getArgument(0));

		assertEquals("budi", service.findOrCreate("S1", "budi@mail.com", true, null).getNama());
	}

	@Test
	void emailSudahTerdaftarDenganPasswordDitautkanKeGoogle() {
		Pengguna lama = mock(Pengguna.class);
		when(lama.getUserId()).thenReturn(7L);
		when(lama.getGoogleSub()).thenReturn(null);
		when(repo.findByGoogleSub("S1")).thenReturn(Optional.empty());
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.of(lama));

		assertSame(lama, service.findOrCreate("S1", "budi@mail.com", true, "Budi"));
		verify(repo).linkGoogle(7L, "S1");
		verify(repo, never()).saveAndFlush(any());
	}

	@Test
	void emailSudahTertautKeAkunGoogleLainDitolakDanTidakDitimpa() {
		Pengguna lama = mock(Pengguna.class);
		when(lama.getGoogleSub()).thenReturn("SLAIN");
		when(repo.findByGoogleSub("S1")).thenReturn(Optional.empty());
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.of(lama));

		var e = assertThrows(GoogleLoginException.class, () -> service.findOrCreate("S1", "budi@mail.com", true, "Budi"));
		assertEquals("akun_google_berbeda", e.code);
		verify(repo, never()).linkGoogle(any(), any());
	}

	@Test
	void emailBelumTerverifikasiTidakBolehMembuatAtauMenautkanAkun() {
		when(repo.findByGoogleSub("S1")).thenReturn(Optional.empty());

		assertEquals("email_belum_terverifikasi", assertThrows(GoogleLoginException.class,
				() -> service.findOrCreate("S1", "budi@mail.com", false, "Budi")).code);
		assertEquals("email_belum_terverifikasi", assertThrows(GoogleLoginException.class,
				() -> service.findOrCreate("S1", null, true, "Budi")).code);
		assertEquals("email_belum_terverifikasi", assertThrows(GoogleLoginException.class,
				() -> service.findOrCreate("S1", " ", true, "Budi")).code);

		verify(repo, never()).findByEmail(any());
		verify(repo, never()).saveAndFlush(any());
		verify(repo, never()).linkGoogle(any(), any());
	}
}
