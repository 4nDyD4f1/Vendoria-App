package com.vendoria.backend.auth;

import java.util.List;
import jakarta.validation.constraints.*;

final class OrderReportDtos {
    private OrderReportDtos() {}

    record Item(long itemId, String name, int quantity) {}
    /** reason = alasan jenis ini belum/tidak bisa dipilih; null bila available. */
    record Option(String type, String label, boolean available, String reason) {}
    record Report(long id, String type, String status, String description, String adminNote) {}
    record Form(long orderId, String code, String vendorName, List<Item> items, List<Option> options, Report report) {}

    record Input(@NotBlank @Size(max = 20) String type, @NotBlank @Size(max = 1000) String description,
                 @Positive Long itemId, @Positive Integer units) {
        Input { description = description == null ? null : description.trim(); }
    }
    record Response(@NotBlank @Size(max = 1000) String text) {
        Response { text = text == null ? null : text.trim(); }
    }
}
