package com.vendoria.backend.auth;

import java.io.IOException;

/** Tempat byte gambar disimpan. Produksi: Cloudinary; test: memori. Key = id yang dibuat server, bukan input klien. */
interface BlobStore {
	/** Jenis berkas -> cara Cloudinary menyimpannya. KYC dikirim sudah terenkripsi, jadi "raw" dan tak pernah publik. */
	enum Kind {
		CATALOG("image", "upload"), HANDOVER("image", "authenticated"), KYC("raw", "authenticated");
		final String resourceType, deliveryType;
		Kind(String resourceType, String deliveryType) { this.resourceType = resourceType; this.deliveryType = deliveryType; }
	}

	void put(Kind kind, String key, byte[] bytes) throws IOException;

	/** @throws java.io.FileNotFoundException bila tidak ada; IOException lain bila penyimpanan gagal. */
	byte[] get(Kind kind, String key) throws IOException;

	/** Cek ringan (HEAD, tanpa unduh). IOException bila penyimpanan tak terjangkau. */
	boolean exists(Kind kind, String key) throws IOException;

	/** Idempotent: menghapus berkas yang tak ada bukan error. */
	void delete(Kind kind, String key) throws IOException;
}
