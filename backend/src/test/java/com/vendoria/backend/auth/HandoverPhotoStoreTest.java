package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class HandoverPhotoStoreTest {
    private final InMemoryBlobStore blobs = new InMemoryBlobStore();

    @Test void storesOnlyNormalizedPngAndCanReadAfterRestart() throws Exception {
        var store = new HandoverPhotoStore(blobs);
        String locator = store.save(store.normalize(VendorHandoversDatabaseTest.image(1)));
        assertTrue(locator.startsWith("handover://")); assertTrue(store.available(locator));
        byte[] result = new HandoverPhotoStore(blobs).read(locator);
        assertEquals(8, ImageIO.read(new ByteArrayInputStream(result)).getWidth());
        store.remove(locator); assertFalse(store.available(locator));
    }

    @Test void rejectsActiveDisguisedUnsupportedEmptyAndOversizeFiles() throws Exception {
        var store = new HandoverPhotoStore(blobs);
        for (var file : new MockMultipartFile[] {
            new MockMultipartFile("photo", "fake.png", "image/png", "<script>bad</script>".getBytes(StandardCharsets.UTF_8)),
            new MockMultipartFile("photo", "photo.svg", "image/svg+xml", VendorHandoversDatabaseTest.image(1).getBytes()),
            new MockMultipartFile("photo", "empty.jpg", "image/jpeg", new byte[0]),
            new MockMultipartFile("photo", "large.png", "image/png", new byte[5 * 1024 * 1024 + 1])
        }) assertThrows(ResponseStatusException.class, () -> store.normalize(file));
        assertTrue(blobs.blobs.isEmpty());
    }

    @Test void neverReadsOrDeletesCallerPathsOrRemoteUrls() throws Exception {
        var store = new HandoverPhotoStore(blobs);
        blobs.put(BlobStore.Kind.HANDOVER, "outside", "outside".getBytes(StandardCharsets.UTF_8));
        for (String locator : new String[] { "handover://../outside", "https://example.test/a.png", "outside", "catalog://" + java.util.UUID.randomUUID() }) {
            assertFalse(store.available(locator));
            assertThrows(ResponseStatusException.class, () -> store.read(locator)); store.remove(locator);
        }
        assertEquals(1, blobs.blobs.size());
    }
}
