package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import jakarta.validation.constraints.*;

final class CustomerCartDtos {
    private CustomerCartDtos() {}

    /** item = null bila alat sudah tidak tampil di katalog publik (nonaktif/habis/vendor nonaktif); name tetap dari tabel item. */
    record Entry(String id, String name, String vendorId, int quantity, boolean available, PublicCatalogDtos.Item item) {}
    record Listing(String userId, List<Entry> items, List<String> eventCategories, int limit) {}

    record Quantity(@NotNull @Min(1) @Max(99) Integer quantity, Boolean keepExisting) {}

    record Checkout(@NotBlank @Size(max = 150) String eventName, @NotBlank @Size(max = 50) String category,
        @NotNull LocalDate startDate, @NotNull LocalDate endDate,
        @NotBlank @Size(max = 150) String venue, @NotBlank @Size(max = 500) String address,
        @NotBlank @Size(max = 120) String picName,
        @NotBlank @Pattern(regexp = "^\\+?[0-9][0-9 \\-]{7,18}$", message = "Nomor WhatsApp tidak valid") String picPhone,
        @Size(max = 300) String note) {
        Checkout {
            eventName = trim(eventName); category = trim(category); venue = trim(venue); address = trim(address);
            picName = trim(picName); picPhone = trim(picPhone); note = note == null || note.isBlank() ? null : note.trim();
        }
        private static String trim(String v) { return v == null ? null : v.trim(); }
    }
    record Placed(long orderId, String code, String vendorName, BigDecimal total, BigDecimal deposit) {}
    record PlacedOrders(List<Placed> orders) {}
}
