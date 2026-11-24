package com.vendoria.backend.auth;

import java.util.List;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.PublicCatalogDtos.*;

@RestController
@RequestMapping("/api/catalog")
class PublicCatalogController {
    private final PublicCatalogService service;
    PublicCatalogController(PublicCatalogService service) { this.service=service; }
    @GetMapping ResponseEntity<Listing> list(@RequestParam(defaultValue="") String q,
            @RequestParam(defaultValue="") String category,@RequestParam(defaultValue="") String city,
            @RequestParam(defaultValue="popular") String sort,@RequestParam(defaultValue="1") int page,
            @RequestParam(defaultValue="12") int size) {
        return noStore(service.list(q,category,city,sort,page,size));
    }
    @GetMapping("/cities") ResponseEntity<List<String>> cities() { return noStore(service.cities()); }
    @PostMapping("/nearby-city") ResponseEntity<NearbyCity> nearby(@RequestBody Coordinates input) { return noStore(service.nearby(input)); }
    @GetMapping("/{id}") ResponseEntity<Item> get(@PathVariable long id) { return noStore(service.get(id)); }
    @GetMapping("/{id}/photo") ResponseEntity<byte[]> photo(@PathVariable long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG)
            .header("X-Content-Type-Options","nosniff").body(service.photo(id));
    }
    private static <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
