package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import jakarta.validation.constraints.*;

final class CustomerOrdersDtos {
    private CustomerOrdersDtos() {}

    /** paid = DP/pelunasan terverifikasi; escrow = DP terverifikasi pesanan yang belum selesai/dibatalkan. */
    record Summary(long orderId, String code, String vendorName, String vendorCity, String equipmentSummary, int itemCount,
        LocalDate startDate, LocalDate endDate, String location, BigDecimal totalRental, BigDecimal totalDp, BigDecimal paid,
        String status, Instant orderedAt, boolean hasOpenClaim, boolean reviewed, boolean canReview) {}
    record Listing(List<Summary> items, long total, int page, int size, Map<String, Long> counts, BigDecimal escrow, String userId) {}

    record Item(long itemId, String name, String category, int quantity, BigDecimal price, BigDecimal subtotal, String photoUrl) {}
    record Payment(long id, String type, String method, BigDecimal amount, String status, Instant paidAt, Instant createdAt) {}
    record History(long id, String from, String to, String note, Instant at) {}
    record Claim(long id, String reason, String status, Instant filedAt, Instant decidedAt) {}
    record Refund(long id, BigDecimal amount, String reason, String status, Instant requestedAt, Instant refundedAt) {}
    record Review(int rating, String comment, Instant at) {}
    record Detail(Summary order, String vendorPhone, List<Item> items, List<Payment> payments, List<History> history,
        List<Claim> claims, List<Refund> refunds, Review review, boolean handoverComplete, boolean returnComplete, String userId) {}

    record ReviewInput(@NotNull @Min(1) @Max(5) Integer rating, @Size(max = 1000) String comment) {
        ReviewInput { comment = comment == null || comment.isBlank() ? null : comment.trim(); }
    }
}
