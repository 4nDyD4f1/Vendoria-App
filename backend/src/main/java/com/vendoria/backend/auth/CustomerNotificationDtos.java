package com.vendoria.backend.auth;

import java.util.List;
import jakarta.validation.constraints.*;

final class CustomerNotificationDtos {
    record Notification(String id, String kind, String title, String body, String createdAt, boolean read) {}
    record Listing(List<Notification> items, long unread, long total) {}
    record Ids(@NotEmpty @Size(max=100) List<@NotBlank @Size(max=40)
        @Pattern(regexp="c:[okprc]:[0-9]{1,19}:[a-z]{1,10}") String> ids) {}
}
