package com.vendoria.backend;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

// Bentuk error seragam: {"message": "...", "errors": {"field": "pesan"}} -- hanya pesan yang kita tulis sendiri.
@RestControllerAdvice
class ApiExceptionHandler {

	@ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
	ResponseEntity<Map<String, Object>> uploadTooLarge() {
		return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of("message", "Ukuran unggahan terlalu besar. Maksimal 5 MB per gambar"));
	}

	@ExceptionHandler({org.springframework.web.multipart.support.MissingServletRequestPartException.class,
			org.springframework.http.converter.HttpMessageNotReadableException.class})
	ResponseEntity<Map<String, Object>> malformedBody() {
		return ResponseEntity.badRequest().body(Map.of("message", "Data pengajuan tidak lengkap atau tidak valid"));
	}

	@ExceptionHandler(ResponseStatusException.class)
	ResponseEntity<Map<String, Object>> status(ResponseStatusException e) {
		return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
	}

	@ExceptionHandler(TooManyRequestsException.class)
	ResponseEntity<Map<String, Object>> tooMany(TooManyRequestsException e) {
		long s = e.getRetryAfterSeconds();
		return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", String.valueOf(s))
				.body(Map.of("message", "Terlalu banyak percobaan. Coba lagi dalam " + s + " detik",
						"retry_after_seconds", s));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
		Map<String, String> errors = new LinkedHashMap<>();
		// nama field di JSON memakai snake_case (no_telp, reset_token), di Java camelCase
		e.getBindingResult().getFieldErrors().forEach(f -> errors.putIfAbsent(
				f.getField().replace("noTelp", "no_telp").replace("resetToken", "reset_token"), f.getDefaultMessage()));
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Data tidak valid", "errors", errors));
	}
}
