package com.vendoria.backend.auth;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Private, server-generated locators only. Decode/re-encode removes original metadata and active content. */
@Component
class HandoverPhotoStore {
    private static final String PREFIX = "handover://";
    private static final int MAX_STORED = 32 * 1024 * 1024;
    private final BlobStore blobs;

    HandoverPhotoStore(BlobStore blobs) { this.blobs = blobs; }

    byte[] normalize(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024) throw invalid();
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!(name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png"))) throw invalid();
        try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw invalid();
            ImageReader reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                if (!Set.of("png", "jpeg", "jpg").contains(reader.getFormatName().toLowerCase(Locale.ROOT))) throw invalid();
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > 10000 || height > 10000 || (long) width * height > 12000000) throw invalid();
                BufferedImage decoded = reader.read(0);
                ByteArrayOutputStream result = new ByteArrayOutputStream();
                if (!ImageIO.write(decoded, "png", result) || result.size() > MAX_STORED) throw invalid();
                return result.toByteArray();
            } finally { reader.dispose(); }
        } catch (IOException | IllegalArgumentException ex) { throw invalid(); }
    }

    String save(byte[] normalized) {
        String locator = PREFIX + UUID.randomUUID();
        try { blobs.put(BlobStore.Kind.HANDOVER, key(locator), normalized); return locator; }
        catch (IOException ex) { throw unavailable(); }
    }

    boolean managed(String locator) {
        if (locator == null || !locator.startsWith(PREFIX)) return false;
        String id = locator.substring(PREFIX.length());
        try { return UUID.fromString(id).toString().equals(id); }
        catch (IllegalArgumentException ex) { return false; }
    }

    /** Fail-closed: penyimpanan tak terjangkau dianggap tidak tersedia, agar serah-terima tak lolos tanpa bukti. */
    boolean available(String locator) {
        try { return managed(locator) && blobs.exists(BlobStore.Kind.HANDOVER, key(locator)); }
        catch (IOException ex) { return false; }
    }

    byte[] read(String locator) {
        if (!available(locator)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto bukti tidak tersedia");
        try {
            byte[] bytes = blobs.get(BlobStore.Kind.HANDOVER, key(locator));
            if (bytes.length > MAX_STORED) throw unavailable();
            return bytes;
        }
        catch (FileNotFoundException ex) { throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto bukti tidak tersedia"); }
        catch (IOException ex) { throw unavailable(); }
    }

    void remove(String locator) {
        if (!managed(locator)) return;
        try { blobs.delete(BlobStore.Kind.HANDOVER, key(locator)); }
        catch (IOException ex) { throw unavailable(); }
    }

    private static String key(String locator) { return locator.substring(PREFIX.length()); }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gunakan foto JPG/PNG valid, maksimal 5 MB dan 12 megapiksel");
    }
    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Penyimpanan bukti serah terima tidak tersedia");
    }
}
