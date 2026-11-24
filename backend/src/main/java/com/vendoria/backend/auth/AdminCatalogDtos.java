package com.vendoria.backend.auth;

import java.math.BigDecimal;
import jakarta.validation.constraints.*;

final class AdminCatalogDtos {
  /** status: aktif | nonaktif | arsip (nilai kolom item.status). */
  record Item(String id, String name, String vendor, String category, BigDecimal price, int stock, String status, String description) {}
  record StatusChange(@NotBlank @Pattern(regexp="aktif|nonaktif|arsip") String status) {}
}
