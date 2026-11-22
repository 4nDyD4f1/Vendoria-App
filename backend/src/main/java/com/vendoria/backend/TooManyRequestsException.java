package com.vendoria.backend;

/** Dilempar saat rate limit / progressive delay aktif; diubah jadi HTTP 429 + header Retry-After. */
public class TooManyRequestsException extends RuntimeException {

	private final long retryAfterSeconds;

	public TooManyRequestsException(long retryAfterSeconds) {
		super("Terlalu banyak percobaan", null, false, false); // tanpa stack trace: dilempar sering saat diserang
		this.retryAfterSeconds = retryAfterSeconds;
	}

	public long getRetryAfterSeconds() {
		return retryAfterSeconds;
	}
}
