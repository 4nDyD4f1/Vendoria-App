package com.vendoria.backend.auth;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.vendoria.backend.auth.AccountAddressDtos.*;

@RestController
@RequestMapping("/api/account/addresses")
class AccountAddressController {
  private final AccountAddressService service;
  AccountAddressController(AccountAddressService service) { this.service=service; }
  @GetMapping ResponseEntity<List<Address>> list(HttpServletRequest request) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id(request))); }
  @PostMapping ResponseEntity<Address> create(@Valid @RequestBody Input input,HttpServletRequest request) {
    return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(service.save(id(request),null,input));
  }
  @PutMapping("/{id}") ResponseEntity<Address> update(@PathVariable Long id,@Valid @RequestBody Input input,HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.save(id(request),id,input));
  }
  @DeleteMapping("/{id}") ResponseEntity<Void> delete(@PathVariable Long id,HttpServletRequest request) { service.delete(id(request),id); return ResponseEntity.noContent().build(); }
  private static Long id(HttpServletRequest request) { return AccountSecurityService.userId(request.getSession(false)); }
}
