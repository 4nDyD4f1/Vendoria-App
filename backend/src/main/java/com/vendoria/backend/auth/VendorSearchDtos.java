package com.vendoria.backend.auth;

import java.util.List;

final class VendorSearchDtos {
    private VendorSearchDtos() {}
    record Vendor(String id, String name) {}
    record Item(String id, String kind, String label, String title, String subtitle, String status, String path) {}
    record Listing(Vendor vendor, List<Item> items, long total, int page, int size) {}
}
