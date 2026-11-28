package com.vendoria.backend.auth;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;

final class PublicCatalogDtos {
    record Category(String id, String name, long count) {}
    record Item(String id, String name, String description, String categoryId, String category,
                String vendor, String city, boolean verified, BigDecimal rating, long reviewCount,
                BigDecimal price, BigDecimal deposit, int stock, String condition, String image) {}
    record Listing(List<Item> items, List<Category> categories, List<String> cities,
                   long total, long available, int page, int size) {}
    /** author sudah disamarkan; items = alat aktif pada pesanan yang diulas. */
    record Review(String author, int rating, String comment, Instant at, String items) {}
    record Coordinates(Double latitude, Double longitude) {}
    record NearbyCity(String city, double distanceKm) {}
}
