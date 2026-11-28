package com.vendoria.backend.auth;

import java.util.List;
import jakarta.validation.constraints.*;

final class AdminNotificationDtos {
  /** id = kunci ('kyc:12', 'klaim:3', 'pencairan:7'); path = halaman admin tujuan; createdAt = ISO waktu pengajuan. */
  record Notification(String id, String title, String body, String createdAt, String path, boolean read) {}
  record Ids(@NotEmpty @Size(max=100) List<@NotBlank @Pattern(regexp="(kyc|klaim|pencairan|refund|retur):[0-9]{1,18}") String> ids) {}
}
