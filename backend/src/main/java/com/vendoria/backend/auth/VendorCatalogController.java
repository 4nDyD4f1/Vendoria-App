package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorCatalogDtos.*;

@RestController
@RequestMapping("/api/vendor/catalog")
class VendorCatalogController {
  private final VendorCatalogService service;
  private final AuthThrottle throttle = new AuthThrottle(); // batas katalog terpisah dari percobaan login
  VendorCatalogController(VendorCatalogService service) { this.service=service; }
  @GetMapping ResponseEntity<State> list(HttpServletRequest request) { return noStore(service.list(id(request))); }
  @PostMapping("/setup") ResponseEntity<State> setup(@Valid @RequestBody Setup input,HttpServletRequest request) { mutation(request); return noStore(service.setup(id(request),input)); }
  @GetMapping("/{itemId}") ResponseEntity<Item> get(@PathVariable Long itemId,HttpServletRequest request) { return noStore(service.get(id(request),itemId)); }
  @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  ResponseEntity<Item> create(@Valid @RequestPart("data") Input input,@RequestPart(value="photo",required=false) MultipartFile photo,HttpServletRequest request) {
    mutation(request); return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(service.save(id(request),null,input,photo));
  }
  @PutMapping(value="/{itemId}",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  ResponseEntity<Item> update(@PathVariable Long itemId,@Valid @RequestPart("data") Input input,@RequestPart(value="photo",required=false) MultipartFile photo,HttpServletRequest request) {
    mutation(request); return noStore(service.save(id(request),itemId,input,photo));
  }
  @DeleteMapping("/{itemId}") ResponseEntity<Void> delete(@PathVariable Long itemId,HttpServletRequest request) { mutation(request); service.delete(id(request),List.of(itemId)); return ResponseEntity.noContent().build(); }
  @PostMapping("/delete") ResponseEntity<Void> deleteMany(@Valid @RequestBody Delete input,HttpServletRequest request) { mutation(request); service.delete(id(request),input.ids()); return ResponseEntity.noContent().build(); }
  @GetMapping("/{itemId}/photo") ResponseEntity<byte[]> photo(@PathVariable Long itemId,HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG)
        .header("X-Content-Type-Options","nosniff").body(service.photo(id(request),itemId));
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
  private void mutation(HttpServletRequest request) {
    if (!"1".equals(request.getHeader("X-Catalog-Request"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan katalog tidak valid");
    throttle.checkIp(request.getRemoteAddr());
  }
  private static <T> ResponseEntity<T> noStore(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
}
