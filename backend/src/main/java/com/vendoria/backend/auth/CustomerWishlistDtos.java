package com.vendoria.backend.auth;

import java.util.List;

final class CustomerWishlistDtos {
    record Entry(String id, String name, PublicCatalogDtos.Item item, boolean available, String savedAt) {}
    record Listing(String userId, List<Entry> items, int limit) {}
}
