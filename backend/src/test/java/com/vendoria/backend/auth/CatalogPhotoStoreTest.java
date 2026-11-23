package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class CatalogPhotoStoreTest {
  @TempDir Path root;
  @Test void normalizesPhotoAndReadsAfterRestart() throws Exception {
    var store=new CatalogPhotoStore(root.toString());
    String id=store.save(KycDocumentStoreTest.image("photo"));
    assertTrue(store.available(id));
    assertEquals(4,ImageIO.read(new ByteArrayInputStream(new CatalogPhotoStore(root.toString()).read(id))).getWidth());
    store.remove(id); assertFalse(store.available(id));
  }
  @Test void rejectsDisguisedOversizeAndUnsupportedFiles() throws Exception {
    var store=new CatalogPhotoStore(root.toString());
    assertThrows(ResponseStatusException.class,()->store.save(new MockMultipartFile("photo","fake.png","image/png","<script>bad</script>".getBytes(StandardCharsets.UTF_8))));
    assertThrows(ResponseStatusException.class,()->store.save(new MockMultipartFile("photo","large.jpg","image/jpeg",new byte[5*1024*1024+1])));
    assertThrows(ResponseStatusException.class,()->store.save(new MockMultipartFile("photo","photo.svg","image/svg+xml",KycDocumentStoreTest.image("photo").getBytes())));
    try(var files=Files.list(root)) { assertEquals(0,files.count()); }
  }
  @Test void cannotReadOrDeleteArbitraryPathsOrUrls() throws Exception {
    var store=new CatalogPhotoStore(root.toString());
    Path outside=root.resolveSibling("catalog-outside-"+java.util.UUID.randomUUID()); Files.writeString(outside,"outside");
    try {
      for(String locator:new String[]{"catalog://../"+outside.getFileName(),"https://example.test/photo.png",outside.toString()}) {
        assertFalse(store.available(locator)); assertThrows(ResponseStatusException.class,()->store.read(locator)); store.remove(locator);
      }
      assertEquals("outside",Files.readString(outside));
    } finally { Files.delete(outside); }
  }
}
