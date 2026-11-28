package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;

final class VendorCatalogDtos {
  record Setup(@NotBlank @Size(max=150) String name) {
    Setup { name = name == null ? null : name.trim(); }
  }
  record Input(
      @NotBlank @Size(max=180) String name,
      @NotBlank @Size(max=100) String category,
      @NotNull @DecimalMin(value="1",message="Harga sewa harus lebih dari 0") @Digits(integer=12,fraction=2) BigDecimal price,
      @NotNull @Min(0) Integer stock,
      @NotBlank @Pattern(regexp="aktif|nonaktif|arsip") String status,
      @Size(max=10000) String description,
      @Size(max=5000) String condition,
      @NotNull(message="Deposit jaminan wajib diisi") @DecimalMin(value="1",message="Deposit jaminan harus lebih dari 0") @Digits(integer=12,fraction=2) BigDecimal deposit,
      @JsonProperty("remove_image") Boolean removeImage) {
    Input {
      name = trim(name); category = trim(category); description = trim(description); condition = trim(condition);
      removeImage = Boolean.TRUE.equals(removeImage);
    }
  }
  record Delete(@NotEmpty @Size(max=100) List<@NotNull @Positive Long> ids) {}
  record Category(String id, String name) {}
  record Vendor(String id, String name, boolean active) {}
  record State(Vendor vendor, List<Category> categories, List<Item> items) {}
  record Item(String id, String name, String category, BigDecimal price, int stock, String status,
      String description, String condition, BigDecimal deposit, String image) {}
  private static String trim(String value) { return value == null ? null : value.trim(); }
}
