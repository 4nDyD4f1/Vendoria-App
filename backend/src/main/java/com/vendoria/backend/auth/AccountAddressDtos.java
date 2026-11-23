package com.vendoria.backend.auth;

import jakarta.validation.constraints.*;

final class AccountAddressDtos {
  record Input(@NotBlank @Size(max=150) String name, @NotBlank @Size(max=500) String address, @Size(max=500) String note, Boolean primary) {
    Input { name=name==null?null:name.trim(); address=address==null?null:address.trim(); note=note==null||note.isBlank()?null:note.trim(); }
  }
  record Address(String id, String name, String address, String note, boolean primary) {}
}
