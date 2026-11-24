package com.vendoria.backend.auth;

import java.io.FileNotFoundException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/** Pengganti Cloudinary untuk semua test: ter-scan otomatis dan menang atas CloudinaryBlobStore, jadi test tak pernah menyentuh jaringan. */
@Component
@Primary
class InMemoryBlobStore implements BlobStore {
	final Map<String, byte[]> blobs = new ConcurrentHashMap<>();

	@Override public void put(Kind kind, String key, byte[] bytes) { blobs.put(kind + "/" + key, bytes.clone()); }
	@Override public byte[] get(Kind kind, String key) throws FileNotFoundException {
		byte[] bytes = blobs.get(kind + "/" + key);
		if (bytes == null) throw new FileNotFoundException(key);
		return bytes.clone();
	}
	@Override public boolean exists(Kind kind, String key) { return blobs.containsKey(kind + "/" + key); }
	@Override public void delete(Kind kind, String key) { blobs.remove(kind + "/" + key); }
}
