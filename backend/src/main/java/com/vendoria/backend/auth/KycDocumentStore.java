package com.vendoria.backend.auth;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryFlag;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFilePermission;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.json.JsonMapper;

/**
 * Dokumen dienkripsi AES-GCM di server lalu disimpan di Cloudinary sebagai berkas raw + authenticated (Cloudinary hanya melihat
 * ciphertext). Kunci enkripsi tetap berkas lokal di root. Semua pembacaan dokumen harus melalui pemeriksaan sesi di KycService.
 */
@Component
class KycDocumentStore {
	private static final int MAX_FILE = 5 * 1024 * 1024;
	private static final int MAX_STORED = 32 * 1024 * 1024;
	private static final String PREFIX = "private://kyc/";
	private static final List<String> DOCUMENTS = List.of("identity", "ktp", "selfie");
	private final BlobStore blobs;
	private final SecretKeySpec key;
	private final SecureRandom random = new SecureRandom();
	private final JsonMapper json = JsonMapper.builder().build();

	KycDocumentStore(BlobStore blobs, @Value("${app.kyc.storage-root}") String storageRoot) {
		this.blobs = blobs;
		Path root = Path.of(storageRoot).toAbsolutePath().normalize();
		try {
			boolean existed = Files.exists(root);
			Files.createDirectories(root);
			if (!existed) restrict(root);
			Path keyPath = root.resolve(".encryption-key");
			if (!Files.exists(keyPath)) {
				byte[] generated = new byte[32];
				random.nextBytes(generated);
				try { Files.write(keyPath, generated, StandardOpenOption.CREATE_NEW); restrict(keyPath); }
				catch (java.nio.file.FileAlreadyExistsException ignored) { /* proses lain sudah membuat kunci */ }
			}
			byte[] bytes = Files.readAllBytes(keyPath);
			if (bytes.length != 32) throw new IOException("Invalid key length");
			key = new SecretKeySpec(bytes, "AES");
		} catch (IOException e) { throw new IllegalStateException("Penyimpanan KYC privat tidak tersedia", e); }
	}

	String save(KycDtos.Identity identity, MultipartFile ktp, MultipartFile selfie) {
		// Validasi kedua gambar terlebih dahulu; nama, MIME, dan ekstensi dari klien tidak dipercaya.
		byte[] first = normalizeImage(ktp);
		byte[] second = normalizeImage(selfie);
		String id = UUID.randomUUID().toString();
		String locator = PREFIX + id;
		try {
			write(locator, "identity", json.writeValueAsBytes(new KycDtos.StoredIdentity(identity, java.time.Instant.now().toString())));
			write(locator, "ktp", first);
			write(locator, "selfie", second);
			return locator;
		} catch (IOException | GeneralSecurityException e) {
			remove(locator);
			throw unavailable();
		}
	}

	KycDtos.Identity identity(String locator) {
		try { return json.readValue(read(locator, "identity"), KycDtos.StoredIdentity.class).identity(); }
		catch (IOException | GeneralSecurityException | IllegalArgumentException e) { throw unavailable(); }
	}

	boolean available(String locator) {
		if (!managed(locator)) return false;
		try {
			for (String name : DOCUMENTS) if (!blobs.exists(BlobStore.Kind.KYC, id(locator) + "/" + name + ".enc")) return false;
			return true;
		} catch (IOException e) { return false; }
	}

	byte[] document(String locator, String kind) {
		if (!Set.of("ktp", "selfie").contains(kind)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dokumen tidak ditemukan");
		try { return read(locator, kind); }
		catch (IOException | GeneralSecurityException | IllegalArgumentException e) { throw unavailable(); }
	}

	void remove(String locator) {
		if (!managed(locator)) return;
		try {
			for (String name : DOCUMENTS) blobs.delete(BlobStore.Kind.KYC, id(locator) + "/" + name + ".enc");
		} catch (IOException e) { throw new IllegalStateException("Pembersihan pengajuan KYC gagal", e); }
	}

	private byte[] normalizeImage(MultipartFile file) {
		if (file == null || file.isEmpty() || file.getSize() > MAX_FILE)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unggah foto KTP dan swafoto, masing-masing maksimal 5 MB");
		try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
			var readers = ImageIO.getImageReaders(stream);
			if (!readers.hasNext()) throw invalidImage();
			ImageReader reader = readers.next();
			try {
				reader.setInput(stream, true, true);
				if (!Set.of("png", "jpeg", "jpg").contains(reader.getFormatName().toLowerCase(java.util.Locale.ROOT))) throw invalidImage();
				int width = reader.getWidth(0), height = reader.getHeight(0);
				if (width < 1 || height < 1 || width > 10_000 || height > 10_000 || (long) width * height > 12_000_000) throw invalidImage();
				BufferedImage image = reader.read(0);
				ByteArrayOutputStream output = new ByteArrayOutputStream();
				// Re-encode menghapus metadata/file tambahan dan memastikan konten yang dilayani benar-benar gambar.
				if (!ImageIO.write(image, "png", output) || output.size() > MAX_STORED - 64) throw invalidImage();
				return output.toByteArray();
			} finally { reader.dispose(); }
		} catch (IOException e) { throw invalidImage(); }
	}

	private void write(String locator, String name, byte[] plaintext) throws IOException, GeneralSecurityException {
		byte[] iv = new byte[12];
		random.nextBytes(iv);
		Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
		cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
		cipher.updateAAD((locator + ":" + name).getBytes(java.nio.charset.StandardCharsets.UTF_8));
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		output.write(iv); output.write(cipher.doFinal(plaintext));
		blobs.put(BlobStore.Kind.KYC, id(locator) + "/" + name + ".enc", output.toByteArray());
	}

	private byte[] read(String locator, String name) throws IOException, GeneralSecurityException {
		byte[] bytes = blobs.get(BlobStore.Kind.KYC, id(locator) + "/" + name + ".enc");
		if (bytes.length < 28 || bytes.length > MAX_STORED) throw new IOException("Invalid document length");
		Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
		cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Arrays.copyOfRange(bytes, 0, 12)));
		cipher.updateAAD((locator + ":" + name).getBytes(java.nio.charset.StandardCharsets.UTF_8));
		return cipher.doFinal(bytes, 12, bytes.length - 12);
	}

	private boolean managed(String locator) {
		if (locator == null || !locator.startsWith(PREFIX)) return false;
		try { return UUID.fromString(locator.substring(PREFIX.length())).toString().equals(locator.substring(PREFIX.length())); }
		catch (IllegalArgumentException e) { return false; }
	}
	private String id(String locator) {
		if (!managed(locator)) throw new IllegalArgumentException("Invalid KYC locator");
		return locator.substring(PREFIX.length());
	}
	private static void restrict(Path path) throws IOException {
		if (Files.getFileAttributeView(path, java.nio.file.attribute.PosixFileAttributeView.class) != null) {
			Files.setPosixFilePermissions(path, Files.isDirectory(path)
					? Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE, PosixFilePermission.OWNER_EXECUTE)
					: Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
		} else {
			AclFileAttributeView acl = Files.getFileAttributeView(path, AclFileAttributeView.class);
			if (acl != null) {
				var entry = AclEntry.newBuilder().setType(AclEntryType.ALLOW).setPrincipal(Files.getOwner(path))
						.setPermissions(EnumSet.allOf(AclEntryPermission.class));
				if (Files.isDirectory(path)) entry.setFlags(AclEntryFlag.DIRECTORY_INHERIT, AclEntryFlag.FILE_INHERIT);
				acl.setAcl(List.of(entry.build()));
			}
		}
	}
	private static ResponseStatusException invalidImage() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gunakan gambar JPG atau PNG yang valid (maksimal 12 megapiksel)"); }
	private static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Dokumen KYC tidak tersedia. Hubungi administrator"); }
}
