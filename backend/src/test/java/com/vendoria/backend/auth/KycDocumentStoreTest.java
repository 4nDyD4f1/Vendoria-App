package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class KycDocumentStoreTest {
	@TempDir Path root;
	private final InMemoryBlobStore blobs = new InMemoryBlobStore();
	private final KycDtos.Identity identity = new KycDtos.Identity("KYC Fixture", "0000000000000000", "Kota Uji", "2000-01-01", "Alamat Uji", true);

	static MockMultipartFile image(String field) throws Exception {
		ByteArrayOutputStream bytes = new ByteArrayOutputStream();
		ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", bytes);
		return new MockMultipartFile(field, "fixture.png", "image/png", bytes.toByteArray());
	}

	@Test
	void storesEncryptedIdentityAndImagesAndCanReadAfterRestart() throws Exception {
		var store = new KycDocumentStore(blobs, root.toString());
		String locator = store.save(identity, image("ktp"), image("selfie"));
		assertTrue(store.available(locator));
		assertEquals(identity, store.identity(locator));
		String id = locator.substring("private://kyc/".length());
		assertEquals(3, blobs.blobs.size());
		assertFalse(new String(blobs.get(BlobStore.Kind.KYC, id + "/identity.enc"), StandardCharsets.ISO_8859_1).contains(identity.nik()));
		assertFalse(java.util.Arrays.equals(image("ktp").getBytes(), blobs.get(BlobStore.Kind.KYC, id + "/ktp.enc")));
		var restarted = new KycDocumentStore(blobs, root.toString());
		assertEquals(identity, restarted.identity(locator));
		assertNotNull(ImageIO.read(new java.io.ByteArrayInputStream(restarted.document(locator, "ktp"))));
		store.remove(locator);
		assertTrue(blobs.blobs.isEmpty());
	}

	@Test
	void rejectsDisguisedFilesUnknownDocumentKindsAndPathTraversal() throws Exception {
		var store = new KycDocumentStore(blobs, root.toString());
		var html = new MockMultipartFile("ktp", "photo.png", "image/png", "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8));
		assertThrows(ResponseStatusException.class, () -> store.save(identity, html, image("selfie")));
		assertFalse(store.available("private://kyc/../../public"));
		assertThrows(ResponseStatusException.class, () -> store.document("private://kyc/../../public", "ktp"));
		assertThrows(ResponseStatusException.class, () -> store.document("https://example.test/identity", "key"));
		assertTrue(blobs.blobs.isEmpty());
	}

	@Test
	void tamperedCiphertextFailsClosed() throws Exception {
		var store = new KycDocumentStore(blobs, root.toString());
		String locator = store.save(identity, image("ktp"), image("selfie"));
		String key = locator.substring("private://kyc/".length()) + "/ktp.enc";
		byte[] bytes = blobs.get(BlobStore.Kind.KYC, key); bytes[bytes.length - 1] ^= 1; blobs.put(BlobStore.Kind.KYC, key, bytes);
		assertThrows(ResponseStatusException.class, () -> store.document(locator, "ktp"));
		store.remove(locator);
	}
}
