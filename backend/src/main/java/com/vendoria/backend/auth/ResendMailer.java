package com.vendoria.backend.auth;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Mengirim email lewat REST API Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Key dari env/.env `Resend`. Tanpa domain terverifikasi, Resend hanya mengirim dari onboarding@resend.dev
 * ke email pemilik akun Resend.
 * shortcut: HTML ditulis di kode, bukan template Resend; pindah ke template Resend bila tim ingin ubah teks tanpa deploy.
 */
@Component
class ResendMailer {

	private static final Logger log = LoggerFactory.getLogger(ResendMailer.class);
	private static final int MAX_ATTEMPTS = 3;

	private final RestClient http;
	private final String apiKey;
	private final String from;

	ResendMailer(@Value("${resend.api-key:}") String apiKey, @Value("${resend.from}") String from) {
		var factory = new JdkClientHttpRequestFactory(
				HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
		factory.setReadTimeout(Duration.ofSeconds(10));
		this.http = RestClient.builder().baseUrl("https://api.resend.com").requestFactory(factory).build();
		this.apiKey = apiKey;
		this.from = from;
	}

	/** idempotencyKey: sama untuk semua retry satu pengiriman, agar email tidak terkirim ganda. */
	void sendOtp(String to, String otp, String idempotencyKey) {
		if (apiKey.isBlank()) {
			log.error("Variabel 'Resend' (API key) belum diisi");
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Layanan email belum dikonfigurasi");
		}
		Map<String, Object> body = Map.of(
				"from", from,
				"to", List.of(to),
				"subject", "Kode verifikasi reset kata sandi Vendoria",
				"html", html(otp),
				"text", "Kode verifikasi Vendoria Anda: " + otp + " (berlaku 10 menit). "
						+ "Jika Anda tidak meminta ini, abaikan email ini.");

		for (int attempt = 1; ; attempt++) {
			try {
				http.post().uri("/emails")
						.header("Authorization", "Bearer " + apiKey)
						.header("Idempotency-Key", idempotencyKey)
						.contentType(MediaType.APPLICATION_JSON)
						.body(body)
						.retrieve().toBodilessEntity();
				return;
			} catch (RestClientResponseException e) {
				int status = e.getStatusCode().value();
				log.warn("Resend menolak pengiriman (status {}): {}", status, e.getResponseBodyAsString());
				if (!(status == 429 || status >= 500) || attempt == MAX_ATTEMPTS) {
					throw gagal();
				}
			} catch (ResourceAccessException e) {
				log.warn("Resend tidak terjangkau: {}", e.getMessage());
				if (attempt == MAX_ATTEMPTS) {
					throw gagal();
				}
			}
			try {
				Thread.sleep(400L * attempt);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				throw gagal();
			}
		}
	}

	private static ResponseStatusException gagal() {
		return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gagal mengirim email. Coba lagi beberapa saat.");
	}

	private static String html(String otp) {
		return "<div style=\"font-family:Arial,sans-serif;max-width:420px;margin:auto;color:#3C2415\">"
				+ "<h2>Reset kata sandi Vendoria</h2>"
				+ "<p>Gunakan kode berikut untuk mengatur ulang kata sandi Anda. Kode berlaku 10 menit.</p>"
				+ "<p style=\"font-size:32px;font-weight:bold;letter-spacing:8px\">" + otp + "</p>"
				+ "<p style=\"color:#888;font-size:12px\">Jika Anda tidak meminta ini, abaikan email ini. "
				+ "Jangan bagikan kode kepada siapa pun.</p></div>";
	}
}
