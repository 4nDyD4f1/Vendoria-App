package com.vendoria.backend.auth;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerWishlistDtos.*;

@Service
class CustomerWishlistService {
    private static final int LIMIT=200;
    private final JdbcTemplate jdbc;
    private final PublicCatalogService catalog;
    CustomerWishlistService(JdbcTemplate jdbc,PublicCatalogService catalog) { this.jdbc=jdbc;this.catalog=catalog; }
    private record Saved(long id,String name,String savedAt) {}

    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    Listing list(Long actorId) {
        actor(actorId,false);
        var saved=jdbc.query("select item_id,nama_saat_disimpan,disimpan_pada from wishlist where user_id=? order by disimpan_pada desc,item_id desc limit ?",
            (rs,n)->new Saved(rs.getLong(1),rs.getString(2),rs.getTimestamp(3).toInstant().toString()),actorId,LIMIT);
        var available=catalog.available(saved.stream().map(Saved::id).toList()).stream().collect(Collectors.toMap(PublicCatalogDtos.Item::id,Function.identity()));
        return new Listing(String.valueOf(actorId),saved.stream().map(row->{
            var item=available.get(String.valueOf(row.id()));
            return new Entry(String.valueOf(row.id()),item==null?row.name():item.name(),item,item!=null,row.savedAt());
        }).toList(),LIMIT);
    }
    @Transactional
    void save(Long actorId,long itemId) {
        actor(actorId,true);validId(itemId);
        if(jdbc.queryForObject("select count(*) from wishlist where user_id=? and item_id=?",Integer.class,actorId,itemId)>0) return;
        if(jdbc.queryForObject("select count(*) from wishlist where user_id=?",Integer.class,actorId)>=LIMIT)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Wishlist maksimal 200 alat. Hapus beberapa alat terlebih dahulu.");
        var item=catalog.get(itemId); // Same availability rules as the live public catalog; no client-supplied prices/names.
        try { jdbc.update("insert into wishlist(user_id,item_id,nama_saat_disimpan) values (?,?,?) on conflict(user_id,item_id) do nothing",actorId,itemId,item.name()); }
        catch(DataIntegrityViolationException e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Data alat berubah. Muat ulang katalog sebelum menyimpan."); }
    }
    @Transactional
    void remove(Long actorId,long itemId) { actor(actorId,true);validId(itemId);jdbc.update("delete from wishlist where user_id=? and item_id=?",actorId,itemId); }
    private void actor(Long id,boolean lock) {
        if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
        var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid. Silakan masuk kembali.");
        if(!"customer".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Wishlist hanya untuk akun customer aktif.");
    }
    private static void validId(long id) { if(id<=0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"ID alat tidak valid."); }
}
