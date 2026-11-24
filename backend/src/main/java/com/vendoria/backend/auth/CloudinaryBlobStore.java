package com.vendoria.backend.auth;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Tanpa kredensial aplikasi tetap start; operasi baru gagal (503 di pemanggil). Kredensial CLOUDINARY_* dari .env. */
@Component
class CloudinaryBlobStore implements BlobStore {
	private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CloudinaryBlobStore.class);
	private final Cloudinary cloudinary;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

	CloudinaryBlobStore(@Value("${cloudinary.cloud-name:}") String cloudName, @Value("${cloudinary.api-key:}") String apiKey,
			@Value("${cloudinary.api-secret:}") String apiSecret) {
		cloudinary = new Cloudinary(ObjectUtils.asMap("cloud_name", cloudName.trim(), "api_key", apiKey.trim(), "api_secret", apiSecret.trim(), "secure", true)); // trim: .env sering membawa spasi/CR di tepi
	}

	@Override public void put(Kind kind, String key, byte[] bytes) throws IOException {
		try {
			cloudinary.uploader().upload(bytes, ObjectUtils.asMap("public_id", publicId(kind, key), "resource_type", kind.resourceType,
					"type", kind.deliveryType, "overwrite", true));
		} catch (RuntimeException e) { throw failed("upload", e); }
	}

	@Override public byte[] get(Kind kind, String key) throws IOException {
		var response = send(kind, key, "GET", HttpResponse.BodyHandlers.ofByteArray());
		if (response.statusCode() == 404) throw new FileNotFoundException(key);
		if (response.statusCode() != 200) throw new IOException("Cloudinary HTTP " + response.statusCode());
		return response.body();
	}

	@Override public boolean exists(Kind kind, String key) throws IOException {
		int status = send(kind, key, "HEAD", HttpResponse.BodyHandlers.discarding()).statusCode();
		if (status == 404) return false;
		if (status != 200) throw new IOException("Cloudinary HTTP " + status);
		return true;
	}

	@Override public void delete(Kind kind, String key) throws IOException {
		try {
			cloudinary.uploader().destroy(publicId(kind, key), ObjectUtils.asMap("resource_type", kind.resourceType,
					"type", kind.deliveryType, "invalidate", true));
		} catch (RuntimeException e) { throw failed("hapus", e); }
	}

	private <T> HttpResponse<T> send(Kind kind, String key, String method, HttpResponse.BodyHandler<T> handler) throws IOException {
		var url = cloudinary.url().resourceType(kind.resourceType).type(kind.deliveryType).secure(true)
				.signed(!kind.deliveryType.equals("upload")); // authenticated wajib URL bertanda tangan
		if (kind.resourceType.equals("image")) url.format("png"); // semua gambar disimpan ulang sebagai PNG
		try {
			return http.send(HttpRequest.newBuilder(URI.create(url.generate(publicId(kind, key)))).method(method, HttpRequest.BodyPublishers.noBody())
					.timeout(Duration.ofSeconds(30)).build(), handler);
		} catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IOException(e); }
		catch (RuntimeException e) { throw failed(method, e); }
	}

	/** SDK melempar RuntimeException (kredensial salah, kuota, dll.); jadikan IOException agar pemanggil membalas 503, bukan 500 tanpa pesan. */
	private static IOException failed(String action, RuntimeException e) {
		log.error("Cloudinary {} gagal: {}", action, e.toString());
		return new IOException("Cloudinary " + action + " gagal", e);
	}

	private static String publicId(Kind kind, String key) { return "vendoria/" + kind.name().toLowerCase() + "/" + key; }
}
