package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.util.List;

final class PublicCatalogDtos {
    record Category(String id, String name, long count) {}
    record Item(String id, String name, String description, String categoryId, String category,
                String vendor, String city, boolean verified, BigDecimal rating, long reviewCount,
                BigDecimal price, BigDecimal deposit, int stock, String condition, String image) {}
    record Listing(List<Item> items, List<Category> categories, List<String> cities,
                   long total, long available, int page, int size) {}
    record Coordinates(Double latitude, Double longitude) {}
    record NearbyCity(String city, double distanceKm) {}
}
