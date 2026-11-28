package com.vendoria.backend.auth;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

/** Klien Midtrans (Snap + status transaksi). Sandbox kecuali MIDTRANS_IS_PRODUCTION=true. Server key hanya dipakai di sini. */
@Component
class MidtransClient {
    private final RestClient snap, core, simulator;
    private final String auth;
    private final boolean autoConfirm;

    MidtransClient(@Value("${midtrans.server-key:}") String serverKey, @Value("${midtrans.production:false}") boolean production,
            @Value("${midtrans.sandbox-auto-confirm:true}") boolean sandboxAutoConfirm) {
        autoConfirm = sandboxAutoConfirm && !production; // production tak pernah boleh melunasi tanpa settlement

        String sandbox = production ? "" : "sandbox.";
        Duration wait = Duration.ofSeconds(10);
        snap = client("https://app." + sandbox + "midtrans.com/snap/v1", wait);
        core = client("https://api." + sandbox + "midtrans.com/v2", wait);
        simulator = client("https://simulator.sandbox.midtrans.com/bca/va", wait);
        auth = serverKey.isBlank() ? null : "Basic " + Base64.getEncoder().encodeToString((serverKey.trim() + ":").getBytes(StandardCharsets.UTF_8));
    }

    /** Batas waktu wajib: panggilan ini dilakukan sambil memegang koneksi database. */
    static RestClient client(String baseUrl, Duration readTimeout) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(readTimeout);
        return RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    /** Hanya sandbox: backend melunasi sendiri VA BCA lewat simulator Midtrans (lihat MidtransSandboxPayer). */
    boolean autoConfirm() { return autoConfirm; }

    /** Melunasi VA BCA di simulator sandbox (setara membuka simulator.sandbox.midtrans.com/bca/va). Hanya jalan bila autoConfirm. */
    boolean simulateBcaVaPayment(String vaNumber, String amount) {
        if (!autoConfirm) throw new IllegalStateException("Simulator hanya untuk sandbox");
        try {
            String form = simulator.post().uri("/inquiry").contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("va_number=" + URLEncoder.encode(vaNumber, StandardCharsets.UTF_8)).retrieve().body(String.class);
            var fields = new LinkedMultiValueMap<String, String>();
            var hidden = Pattern.compile("<input name=\"(\\w+)\" value=\"([^\"]*)\" type=\"hidden\"").matcher(form == null ? "" : form);
            while (hidden.find()) fields.add(hidden.group(1), hidden.group(2));
            if (fields.isEmpty()) return false;
            fields.add("total_amount", amount);
            String result = simulator.post().uri("/payment").contentType(MediaType.APPLICATION_FORM_URLENCODED).body(fields).retrieve().body(String.class);
            return result != null && result.contains("successful");
        } catch (RestClientException e) { return false; }
    }

    /** Membuat transaksi Snap dan mengembalikan URL halaman bayar Midtrans. */
    String createTransaction(Map<String, Object> body) {
        try {
            Map<?, ?> res = snap.post().uri("/transactions").header(HttpHeaders.AUTHORIZATION, auth()).contentType(MediaType.APPLICATION_JSON)
                .body(body).retrieve().body(Map.class);
            if (res == null || !(res.get("redirect_url") instanceof String url)) throw unavailable();
            return url;
        } catch (RestClientException e) { throw unavailable(); }
    }

    /** Status transaksi dari Midtrans; null bila transaksi belum pernah dibuka di Midtrans. */
    @SuppressWarnings("unchecked")
    Map<String, Object> status(String orderId) {
        try {
            Map<String, Object> res = core.get().uri("/{id}/status", orderId).header(HttpHeaders.AUTHORIZATION, auth()).retrieve().body(Map.class);
            // Midtrans membalas HTTP 200 dengan status_code "404" di body untuk order yang tak dikenal.
            return res == null || "404".equals(String.valueOf(res.get("status_code"))) ? null : res;
        } catch (RestClientException e) { throw unavailable(); }
    }

    private String auth() {
        if (auth == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Pembayaran belum dikonfigurasi (MIDTRANS_SERVER_KEY kosong)");
        return auth;
    }
    private static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gagal menghubungi Midtrans. Coba lagi sebentar lagi"); }
}
