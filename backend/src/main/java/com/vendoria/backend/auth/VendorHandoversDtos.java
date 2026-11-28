package com.vendoria.backend.auth;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

final class VendorHandoversDtos {
    private VendorHandoversDtos() {}

    record Upload(@NotNull @Positive Long itemId,
                  @NotBlank @Pattern(regexp="serah_terima|pengembalian") String type,
                  @NotBlank @Size(max=25) String expectedStatus,
                  @NotBlank @Size(max=1000) String note) {
        Upload { note = note == null ? null : note.trim(); }
    }
    record Action(@NotBlank @Pattern(regexp="handover|receive|complete") String action,
                  @NotBlank @Size(max=25) String expectedStatus,
                  @NotNull @AssertTrue(message="Konfirmasi pemeriksaan wajib dicentang") Boolean confirmed,
                  @Size(max=1000) String note) {
        Action { note = note == null ? null : note.trim(); }
    }
    record Summary(long orderId, String code, String customer, LocalDate start, LocalDate end, String venue,
                   String status, int itemsCount, int handoverPhotos, int returnPhotos, boolean hasOpenClaim, boolean awaitingSettlement, boolean reportOpen) {}
    record Listing(VendorOrdersDtos.VendorInfo vendor, List<Summary> items, long total, int page, int size) {}
    record Damage(@NotBlank @Size(max=1000) String reason) {
        Damage { reason = reason == null ? null : reason.trim(); }
    }
    record Item(long itemId, String name, int quantity) {}
    record Evidence(long id, long itemId, String type, String note, String examiner, Instant recordedAt,
                    boolean available, String photoUrl) {}
    record Detail(Summary order, List<Item> items, List<Evidence> evidence, List<VendorOrdersDtos.StatusHistory> history,
                  boolean handoverComplete, boolean returnComplete, int photosPerItem, boolean evidenceProtected,
                  java.math.BigDecimal deposit, String claimStatus) {}
}
