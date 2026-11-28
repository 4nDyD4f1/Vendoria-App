package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

final class CustomerPaymentDtos {
    private CustomerPaymentDtos() {}

    /** kind: deposit | pelunasan | null (tidak ada tagihan); due = nominal tagihan saat ini. */
    record Order(long orderId, String code, String vendorName, BigDecimal total, BigDecimal deposit, String status, String kind, BigDecimal due) {}
    /** amountDue = jumlah seluruh tagihan pesanan yang dipilih. */
    record Summary(List<Order> orders, BigDecimal amountDue) {}
    /** orderIds kosong = semua pesanan customer yang masih menunggu deposit. */
    record PayRequest(@Size(max = 20) List<@Positive Long> orderIds) {}
    record Pay(String redirectUrl, String reference) {}
    /** state: paid | pending | failed; kind: deposit | pelunasan. */
    record Confirmation(String reference, String state, String kind, BigDecimal amount, List<Order> orders) {}
}
