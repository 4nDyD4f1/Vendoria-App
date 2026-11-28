package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.TooManyRequestsException;

// Unit test murni: repository & mailer di-mock, jam palsu. Tidak mengirim email dan tidak menulis ke DB.
class PasswordResetServiceTest {

	private final AtomicLong now = new AtomicLong(1_000_000);
	private final PenggunaRepository repo = mock(PenggunaRepository.class);
	private final ResendMailer mailer = mock(ResendMailer.class);
	private final AuthThrottle throttle = new AuthThrottle(now::get);
	private final PasswordResetService service = new PasswordResetService(repo, mailer, throttle, now::get);
	private final Pengguna budi = mock(Pengguna.class);

	PasswordResetServiceTest() {
		when(budi.getEmail()).thenReturn("budi@mail.com");
		when(budi.getUserId()).thenReturn(7L);
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.of(budi));
		when(repo.findByEmail("hantu@mail.com")).thenReturn(Optional.empty());
	}

	/** Meminta OTP dan mengambil kode yang "dikirim" ke mailer. */
	private String kirimDanAmbilKode() {
		service.requestOtp(" Budi@Mail.com ");
		var kode = ArgumentCaptor.forClass(String.class);
		verify(mailer, org.mockito.Mockito.atLeastOnce()).sendOtp(eq("budi@mail.com"), kode.capture(), anyString());
		return kode.getValue();
	}

	private static HttpStatus status(Throwable t) {
		return HttpStatus.valueOf(((ResponseStatusException) t).getStatusCode().value());
	}

	@Test
	void emailTakTerdaftarDijawabSamaTanpaKirimEmail() {
		service.requestOtp("hantu@mail.com"); // sama seperti email terdaftar: tidak ada galat
		assertThrows(com.vendoria.backend.TooManyRequestsException.class, () -> service.requestOtp("hantu@mail.com")); // jeda kirim ulang juga sama
		verify(mailer, never()).sendOtp(any(), any(), any());
	}

	@Test
	void kodeEnamDigitDanCooldownEnamPuluhDetik() {
		String kode = kirimDanAmbilKode();
		assertTrue(kode.matches("\\d{6}"));

		var e = assertThrows(TooManyRequestsException.class, () -> service.requestOtp("budi@mail.com"));
		assertEquals(60, e.getRetryAfterSeconds());

		now.addAndGet(PasswordResetService.RESEND_COOLDOWN_MS);
		assertDoesNotThrow(() -> service.requestOtp("budi@mail.com"));
	}

	@Test
	void maksimalLimaKaliKirimPerJam() {
		for (int i = 0; i < PasswordResetService.MAX_SENDS_PER_HOUR; i++) {
			service.requestOtp("budi@mail.com");
			now.addAndGet(PasswordResetService.RESEND_COOLDOWN_MS);
		}
		assertThrows(TooManyRequestsException.class, () -> service.requestOtp("budi@mail.com"));
		now.addAndGet(PasswordResetService.HOUR_MS);
		assertDoesNotThrow(() -> service.requestOtp("budi@mail.com"));
	}

	@Test
	void otpHangusSetelahLimaKaliSalahWalauAkhirnyaBenar() {
		String kode = kirimDanAmbilKode();
		String salah = kode.equals("000000") ? "111111" : "000000";
		for (int i = 0; i < PasswordResetService.MAX_ATTEMPTS; i++) {
			assertEquals(HttpStatus.BAD_REQUEST, status(assertThrows(ResponseStatusException.class, () -> service.verifyOtp("budi@mail.com", salah))));
		}
		assertThrows(ResponseStatusException.class, () -> service.verifyOtp("budi@mail.com", kode));
	}

	@Test
	void otpKedaluwarsaSetelahSepuluhMenit() {
		String kode = kirimDanAmbilKode();
		now.addAndGet(PasswordResetService.OTP_TTL_MS);
		assertThrows(ResponseStatusException.class, () -> service.verifyOtp("budi@mail.com", kode));
	}

	@Test
	void alurLengkapOtpBenarTokenLaluPasswordBerubahTokenSekaliPakai() {
		String kode = kirimDanAmbilKode();
		String token = service.verifyOtp("budi@mail.com", kode);
		assertThrows(ResponseStatusException.class, () -> service.verifyOtp("budi@mail.com", kode)); // OTP sekali pakai

		service.resetPassword(token, "passwordBaru1");

		var hash = ArgumentCaptor.forClass(String.class);
		verify(repo).updatePassword(eq(7L), hash.capture());
		assertTrue(new BCryptPasswordEncoder().matches("passwordBaru1", hash.getValue()));
		assertEquals(HttpStatus.BAD_REQUEST, status(assertThrows(ResponseStatusException.class, () -> service.resetPassword(token, "passwordBaru2"))));
		verify(repo, times(1)).updatePassword(anyLong(), anyString());
	}

	@Test
	void resetTokenKedaluwarsa() {
		String token = service.verifyOtp("budi@mail.com", kirimDanAmbilKode());
		now.addAndGet(PasswordResetService.GRANT_TTL_MS);
		assertThrows(ResponseStatusException.class, () -> service.resetPassword(token, "passwordBaru1"));
		verify(repo, never()).updatePassword(anyLong(), anyString());
	}

	@Test
	void gagalKirimEmailTidakMenahanUserDenganCooldown() {
		doThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "x")).when(mailer).sendOtp(any(), any(), any());
		assertThrows(ResponseStatusException.class, () -> service.requestOtp("budi@mail.com"));

		org.mockito.Mockito.reset(mailer); // email pulih
		assertDoesNotThrow(() -> service.requestOtp("budi@mail.com")); // langsung bisa coba lagi, tanpa menunggu 60 detik
	}
}
