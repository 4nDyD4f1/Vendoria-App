package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminCatalogDtos.*;

/** Daftar alat semua vendor (tabel item) dan perubahan statusnya oleh administrator aktif. Admin tidak menambah/menghapus alat. */
@Service
class AdminCatalogService {
  private static final String SELECT="""
      select i.item_id,i.nama_barang,v.nama_vendor,k.nama_kategori,i.harga_sewa_per_hari,i.stok_total,i.status,i.deskripsi_barang
      from item i
      join vendor v on v.vendor_id=i.vendor_id
      join kategori k on k.kategori_id=i.kategori_id
      """;
  private final JdbcTemplate jdbc;
  AdminCatalogService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  // shortcut: tanpa paging server (maks 500 terbaru), filter & halaman di frontend; upgrade bila alat > 500.
  @Transactional(readOnly=true)
  List<Item> list(Long actorId) { admin(actorId,false); return jdbc.query(SELECT+"order by i.item_id desc limit 500",AdminCatalogService::item); }

  @Transactional
  Item changeStatus(Long actorId,Long id,StatusChange change) {
    admin(actorId,true);
    if(jdbc.queryForList("select item_id from item where item_id=? for update",Long.class,id).isEmpty())
      throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Alat tidak ditemukan");
    jdbc.update("update item set status=?,updated_at=now() where item_id=?",change.status(),id);
    return jdbc.queryForObject(SELECT+"where i.item_id=?",AdminCatalogService::item,id);
  }

  private static Item item(ResultSet rs,int n) throws SQLException {
    return new Item(rs.getString("item_id"),rs.getString("nama_barang"),rs.getString("nama_vendor"),rs.getString("nama_kategori"),
        rs.getBigDecimal("harga_sewa_per_hari"),rs.getInt("stok_total"),rs.getString("status"),rs.getString("deskripsi_barang"));
  }
  private void admin(Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"admin".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk administrator aktif");
  }
}
