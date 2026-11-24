package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminCatalogDtos.*;

@RestController
@RequestMapping("/api/admin/catalog")
class AdminCatalogController {
  private final AdminCatalogService service;
  private final AuthThrottle throttle=new AuthThrottle();
  AdminCatalogController(AdminCatalogService service) { this.service=service; }
  @GetMapping ResponseEntity<List<Item>> list(HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request))); }
  @PutMapping("/{id}/status") ResponseEntity<Item> status(@PathVariable Long id,@Valid @RequestBody StatusChange change,HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Admin-Catalog"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan katalog tidak valid");
    throttle.checkIp(request.getRemoteAddr());
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.changeStatus(id(request),id,change));
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
