package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class CatalogPhotoStoreTest {
  private final InMemoryBlobStore blobs=new InMemoryBlobStore();
  @Test void normalizesPhotoAndReadsAfterRestart() throws Exception {
    var store=new CatalogPhotoStore(blobs);
    String id=store.save(KycDocumentStoreTest.image("photo"));
    assertTrue(store.available(id));
    assertEquals(4,ImageIO.read(new ByteArrayInputStream(new CatalogPhotoStore(blobs).read(id))).getWidth());
    store.remove(id); assertEquals(404,assertThrows(ResponseStatusException.class,()->store.read(id)).getStatusCode().value());
  }
  @Test void rejectsDisguisedOversizeAndUnsupportedFiles() throws Exception {
    var store=new CatalogPhotoStore(blobs);
    assertThrows(ResponseStatusException.class,()->store.save(new MockMultipartFile("photo","fake.png","image/png","<script>bad</script>".getBytes(StandardCharsets.UTF_8))));
    assertThrows(ResponseStatusException.class,()->store.save(new MockMultipartFile("photo","large.jpg","image/jpeg",new byte[5*1024*1024+1])));
    assertThrows(ResponseStatusException.class,()->store.save(new MockMultipartFile("photo","photo.svg","image/svg+xml",KycDocumentStoreTest.image("photo").getBytes())));
    assertTrue(blobs.blobs.isEmpty());
  }
  @Test void cannotReadOrDeleteArbitraryPathsOrUrls() throws Exception {
    var store=new CatalogPhotoStore(blobs);
    blobs.put(BlobStore.Kind.CATALOG,"outside","outside".getBytes(StandardCharsets.UTF_8));
    for(String locator:new String[]{"catalog://../outside","https://example.test/photo.png","outside"}) {
      assertFalse(store.available(locator)); assertThrows(ResponseStatusException.class,()->store.read(locator)); store.remove(locator);
    }
    assertEquals(1,blobs.blobs.size());
  }
  @Test void missingRemoteFileIsNotFoundNotServerError() {
    var store=new CatalogPhotoStore(blobs);
    var e=assertThrows(ResponseStatusException.class,()->store.read("catalog://"+java.util.UUID.randomUUID()));
    assertEquals(404,e.getStatusCode().value());
  }
}
