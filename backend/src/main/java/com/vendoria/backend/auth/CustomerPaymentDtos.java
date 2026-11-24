package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

final class CustomerPaymentDtos {
    private CustomerPaymentDtos() {}

    record Order(long orderId, String code, String vendorName, BigDecimal total, BigDecimal deposit, String status) {}
    /** amountDue = jumlah deposit seluruh pesanan yang masih menunggu pembayaran. */
    record Summary(List<Order> orders, BigDecimal amountDue) {}
    /** orderIds kosong = semua pesanan customer yang masih menunggu pembayaran. */
    record PayRequest(@Size(max = 20) List<@Positive Long> orderIds) {}
    record Pay(String redirectUrl, String reference) {}
    /** state: paid | pending | failed. */
    record Confirmation(String reference, String state, BigDecimal amount, List<Order> orders) {}
}
