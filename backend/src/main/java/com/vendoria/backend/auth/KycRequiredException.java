package com.vendoria.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class KycRequiredException extends ResponseStatusException {
    private final String verification;

    KycRequiredException(String verification) {
        super(HttpStatus.FORBIDDEN, switch (verification) {
            case "menunggu" -> "Pengajuan KYC masih ditinjau. Tunggu hingga terverifikasi sebelum membuat pesanan atau membayar.";
            case "ditolak" -> "Perbaiki pengajuan KYC hingga terverifikasi sebelum membuat pesanan atau membayar.";
            default -> "Lengkapi KYC hingga terverifikasi sebelum membuat pesanan atau melanjutkan pembayaran.";
        });
        this.verification = verification;
    }

    public String verification() { return verification; }
}
