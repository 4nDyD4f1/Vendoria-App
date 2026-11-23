package com.vendoria.backend.auth;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;

final class AdminAccountDtos {
  record Input(
      @NotBlank @Size(max=150) String name,
      @Size(max=120) String owner,
      @NotBlank @Email @Size(max=255) String email,
      @Pattern(regexp="\\+?[0-9]{8,15}",message="Gunakan 8–15 digit angka, boleh diawali +") String phone,
      @Size(max=100) String city,
      @Size(max=2000) String address,
      @Size(max=10000) String description,
      @NotBlank @Pattern(regexp="Aktif|Nonaktif") String status,
      @Pattern(regexp="Aktif|Nonaktif") String businessStatus,
      @Size(max=4000) String notes,
      String password) { // Validasi di service agar nilai kata sandi tidak masuk pesan error validasi.
    Input {
      name=trim(name); owner=trim(owner); email=email==null?null:AuthService.normalize(email);
      phone=phone==null?null:blank(phone.replaceAll("[\\s()-]",""));
      city=trim(city); address=trim(address); description=trim(description); notes=trim(notes);
      password=blank(password);
    }
    @Override public String toString() { return "AdminAccountInput[REDACTED]"; }
  }
  record Delete(@NotEmpty @Size(max=100) List<@NotNull @Positive Long> ids) {}
  record Account(String id, String name, String owner, String email, String phone, String city,
      String address, String description, String status, String businessStatus, String verification,
      String notes, @JsonProperty("email_locked") boolean emailLocked) {}
  record Directory(List<Account> customers, List<Account> vendors) {}
  private static String trim(String value) { return value==null?null:value.trim(); }
  private static String blank(String value) { return value==null||value.isBlank()?null:value; }
}
