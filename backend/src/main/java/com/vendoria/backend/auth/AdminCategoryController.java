package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminCategoryDtos.*;

@RestController
@RequestMapping("/api/admin/categories")
class AdminCategoryController {
  private final AdminCategoryService service;
  private final AuthThrottle throttle=new AuthThrottle();
  AdminCategoryController(AdminCategoryService service) { this.service=service; }
  @GetMapping ResponseEntity<List<Category>> list(HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request))); }
  @PostMapping ResponseEntity<Category> create(@Valid @RequestBody Input input,HttpServletRequest request) {
    mutation(request); return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(service.save(id(request),null,input));
  }
  @PutMapping("/{id}") ResponseEntity<Category> update(@PathVariable Long id,@Valid @RequestBody Input input,HttpServletRequest request) {
    mutation(request); return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.save(id(request),id,input));
  }
  @PostMapping("/delete") ResponseEntity<Void> delete(@Valid @RequestBody Delete input,HttpServletRequest request) {
    mutation(request); service.delete(id(request),input.ids()); return ResponseEntity.noContent().build();
  }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
  private void mutation(HttpServletRequest request) {
    if(!"1".equals(request.getHeader("X-Admin-Categories"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Permintaan kategori tidak valid");
    throttle.checkIp(request.getRemoteAddr());
  }
}
