package com.vendoria.backend.auth;

import java.util.List;
import jakarta.validation.constraints.*;

final class AdminCategoryDtos {
  record Input(@NotBlank @Size(max=100) String name) {
    Input { name=name==null?null:name.trim(); }
  }
  record Delete(@NotEmpty @Size(max=100) List<@NotNull @Positive Long> ids) {}
  /** count = jumlah alat nyata yang memakai kategori ini. */
  record Category(String id, String name, int count) {}
}
