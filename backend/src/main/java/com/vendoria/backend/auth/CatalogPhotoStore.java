package com.vendoria.backend.auth;

import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.*;
import javax.imageio.stream.ImageInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Component
class CatalogPhotoStore {
  private static final String PREFIX = "catalog://";
  private static final int MAX_STORED = 32 * 1024 * 1024;
  private final BlobStore blobs;
  CatalogPhotoStore(BlobStore blobs) { this.blobs = blobs; }
  String save(MultipartFile file) {
    byte[] normalized = normalize(file);
    String locator = PREFIX + UUID.randomUUID();
    try { blobs.put(BlobStore.Kind.CATALOG, key(locator), normalized); return locator; }
    catch (IOException e) { throw unavailable(); }
  }
  boolean managed(String locator) {
    if (locator == null || !locator.startsWith(PREFIX)) return false;
    String id = locator.substring(PREFIX.length());
    try { return UUID.fromString(id).toString().equals(id); } catch (IllegalArgumentException e) { return false; }
  }
  // shortcut: tidak cek ke Cloudinary (dipanggil per baris daftar); berkas hilang baru ketahuan di read(), upgrade bila perlu.
  boolean available(String locator) { return managed(locator); }
  byte[] read(String locator) {
    if (!available(locator)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto tidak tersedia");
    try { byte[] bytes = blobs.get(BlobStore.Kind.CATALOG, key(locator)); if (bytes.length > MAX_STORED) throw unavailable(); return bytes; }
    catch (FileNotFoundException e) { throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto tidak tersedia"); }
    catch (IOException e) { throw unavailable(); }
  }
  void remove(String locator) {
    if (!managed(locator)) return;
    try { blobs.delete(BlobStore.Kind.CATALOG, key(locator)); } catch (IOException e) { throw new IllegalStateException("Pembersihan foto katalog gagal", e); }
  }
  private static String key(String locator) { return locator.substring(PREFIX.length()); }
  private byte[] normalize(MultipartFile file) {
    if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024) throw invalid();
    String extension = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
    if (!(extension.endsWith(".jpg") || extension.endsWith(".jpeg") || extension.endsWith(".png"))) throw invalid();
    try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
      var readers = ImageIO.getImageReaders(stream); if (!readers.hasNext()) throw invalid();
      ImageReader reader = readers.next();
      try {
        reader.setInput(stream, true, true);
        if (!Set.of("jpeg", "jpg", "png").contains(reader.getFormatName().toLowerCase(Locale.ROOT))) throw invalid();
        int width = reader.getWidth(0), height = reader.getHeight(0);
        if (width < 1 || height < 1 || width > 10000 || height > 10000 || (long) width * height > 12000000) throw invalid();
        BufferedImage image = reader.read(0); ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        if (!ImageIO.write(image, "png", bytes) || bytes.size() > MAX_STORED) throw invalid();
        return bytes.toByteArray();
      } finally { reader.dispose(); }
    } catch (IOException e) { throw invalid(); }
  }
  private static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gunakan foto JPG/PNG valid, maksimal 5 MB dan 12 megapiksel"); }
  private static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Penyimpanan foto katalog tidak tersedia"); }
}
