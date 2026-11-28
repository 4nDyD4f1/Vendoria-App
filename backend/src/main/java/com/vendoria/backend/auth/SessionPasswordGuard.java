package com.vendoria.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Sesi hanya berlaku selama password akunnya belum berubah: ganti/reset password mengeluarkan semua sesi lama. */
@Component
class SessionPasswordGuard implements HandlerInterceptor, WebMvcConfigurer {
    private static final String STAMP = "password_stamp";
    private final JdbcTemplate jdbc;

    SessionPasswordGuard(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Dipanggil saat sesi dibuat, dan saat pemilik sesi mengganti passwordnya sendiri. */
    static void stamp(HttpSession session, String passwordHash) {
        session.setAttribute(STAMP, EmailOtpService.digest(String.valueOf(passwordHash)));
    }

    @Override public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(this).addPathPatterns("/api/**"); }

    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute(AuthController.SESSION_USER_ID) instanceof Long id
                && session.getAttribute(STAMP) instanceof String stamp) {
            var hashes = jdbc.queryForList("select password_hash from pengguna where user_id=?", String.class, id);
            // Controller membaca sesi sesudah ini, jadi permintaan berlanjut sebagai belum login.
            if (hashes.isEmpty() || !stamp.equals(EmailOtpService.digest(String.valueOf(hashes.getFirst())))) session.invalidate();
        }
        return true;
    }
}
