package com.vendoria.backend.auth;

import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
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
  private final Path root;
  CatalogPhotoStore(@Value("${app.catalog.storage-root}") String directory) throws IOException {
    root = Path.of(directory).toAbsolutePath().normalize(); Files.createDirectories(root);
  }
  String save(MultipartFile file) {
    byte[] normalized = normalize(file);
    String locator = PREFIX + UUID.randomUUID();
    try { Files.write(path(locator), normalized, StandardOpenOption.CREATE_NEW); return locator; }
    catch (IOException e) { remove(locator); throw unavailable(); }
  }
  boolean managed(String locator) {
    if (locator == null || !locator.startsWith(PREFIX)) return false;
    String id = locator.substring(PREFIX.length());
    try { return UUID.fromString(id).toString().equals(id); } catch (IllegalArgumentException e) { return false; }
  }
  boolean available(String locator) { return managed(locator) && Files.isRegularFile(path(locator), LinkOption.NOFOLLOW_LINKS); }
  byte[] read(String locator) {
    if (!available(locator)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto tidak tersedia");
    try { if (Files.size(path(locator)) > MAX_STORED) throw unavailable(); return Files.readAllBytes(path(locator)); }
    catch (IOException e) { throw unavailable(); }
  }
  void remove(String locator) {
    if (!managed(locator)) return;
    try { Files.deleteIfExists(path(locator)); } catch (IOException e) { throw new IllegalStateException("Pembersihan foto katalog gagal", e); }
  }
  private Path path(String locator) { if (!managed(locator)) throw new IllegalArgumentException("Invalid catalog locator"); return root.resolve(locator.substring(PREFIX.length()) + ".png"); }
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
