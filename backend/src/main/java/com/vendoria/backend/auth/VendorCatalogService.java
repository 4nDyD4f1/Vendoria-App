package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorCatalogDtos.*;

@Service
class VendorCatalogService {
  private static final String SELECT = """
      select i.*,k.nama_kategori,(select f.tautan_foto from foto_item f where f.item_id=i.item_id order by f.urutan,f.foto_id limit 1) as photo
      from item i join kategori k on k.kategori_id=i.kategori_id
      """;
  private final JdbcTemplate jdbc;
  private final CatalogPhotoStore photos;
  VendorCatalogService(JdbcTemplate jdbc, CatalogPhotoStore photos) { this.jdbc=jdbc; this.photos=photos; }

  @Transactional(readOnly=true)
  State list(Long actorId) {
    actor(actorId, false); Vendor vendor = vendor(actorId);
    return new State(vendor, jdbc.query("select kategori_id,nama_kategori from kategori order by nama_kategori", (rs,n)->new Category(rs.getString(1),rs.getString(2))),
        vendor == null ? List.of() : jdbc.query(SELECT + "where i.vendor_id=? order by i.created_at desc,i.item_id desc", this::item, Long.valueOf(vendor.id())));
  }
  @Transactional
  State setup(Long actorId, Setup input) {
    actor(actorId,true);
    jdbc.update("insert into vendor(user_id,nama_vendor) values (?,?) on conflict(user_id) do nothing", actorId,input.name());
    return list(actorId);
  }
  @Transactional(readOnly=true)
  Item get(Long actorId, Long id) { actor(actorId,false); return find(owner(actorId),id,false); }

  @Transactional
  Item save(Long actorId, Long id, Input input, MultipartFile photo) {
    actor(actorId,true); long vendorId=owner(actorId);
    if (id != null) find(vendorId,id,true);
    List<Long> categories=jdbc.queryForList("select kategori_id from kategori where nama_kategori=?",Long.class,input.category());
    if (categories.isEmpty()) throw bad("Kategori tidak tersedia. Muat ulang daftar kategori");
    if (input.removeImage() && photo != null) throw bad("Pilih penggantian atau penghapusan foto");
    String locator=photo == null ? null : photos.save(photo);
    if (locator != null) TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) photos.remove(locator); }
    });
    if (id == null) {
      id=jdbc.queryForObject("""
          insert into item(vendor_id,kategori_id,nama_barang,deskripsi_barang,harga_sewa_per_hari,stok_total,kondisi_barang,minimal_dp,status)
          values (?,?,?,?,?,?,?,?,?) returning item_id
          """,Long.class,vendorId,categories.getFirst(),input.name(),input.description(),input.price(),input.stock(),input.condition(),input.deposit(),input.status());
    } else jdbc.update("""
        update item set kategori_id=?,nama_barang=?,deskripsi_barang=?,harga_sewa_per_hari=?,stok_total=?,kondisi_barang=?,minimal_dp=?,status=?,updated_at=now()
        where item_id=? and vendor_id=?
        """,categories.getFirst(),input.name(),input.description(),input.price(),input.stock(),input.condition(),input.deposit(),input.status(),id,vendorId);
    if (locator != null || input.removeImage()) {
      List<Map<String,Object>> first=jdbc.queryForList("select foto_id,tautan_foto from foto_item where item_id=? order by urutan,foto_id limit 1",id);
      if (!first.isEmpty()) {
        var old=first.getFirst();
        jdbc.update("delete from foto_item where foto_id=?",old.get("foto_id"));
        cleanAfterCommit(List.of((String)old.get("tautan_foto")));
      }
      if (locator != null) jdbc.update("insert into foto_item(item_id,tautan_foto,urutan) values (?,?,0)",id,locator);
    }
    return find(vendorId,id,false);
  }
  @Transactional
  void delete(Long actorId, List<Long> ids) {
    actor(actorId,true); long vendorId=owner(actorId);
    List<Long> unique=ids.stream().distinct().sorted().toList();
    List<String> locators=new ArrayList<>();
    for (Long id:unique) {
      find(vendorId,id,true);
      if (Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from detail_item where item_id=?)",Boolean.class,id)))
        throw new ResponseStatusException(HttpStatus.CONFLICT,"Alat sudah digunakan dalam pesanan. Ubah status menjadi Arsip agar riwayat tetap tersimpan");
      locators.addAll(jdbc.queryForList("select tautan_foto from foto_item where item_id=?",String.class,id));
    }
    try { for (Long id:unique) jdbc.update("delete from item where item_id=? and vendor_id=?",id,vendorId); }
    catch (DataIntegrityViolationException e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Alat masih terhubung dengan transaksi. Gunakan status Arsip"); }
    cleanAfterCommit(locators);
  }
  @Transactional(readOnly=true)
  byte[] photo(Long actorId, Long id) {
    actor(actorId,false); long vendorId=owner(actorId); find(vendorId,id,false);
    List<String> files=jdbc.queryForList("select tautan_foto from foto_item where item_id=? order by urutan,foto_id limit 1",String.class,id);
    return photos.read(files.isEmpty()?null:files.getFirst());
  }
  private void actor(Long id,boolean lock) {
    VendorBusinessPolicy.requireReady(jdbc,id,lock);
  }
  private Vendor vendor(Long actorId) {
    var rows=jdbc.query("select vendor_id,nama_vendor,status_aktif from vendor where user_id=?",(rs,n)->new Vendor(rs.getString(1),rs.getString(2),rs.getBoolean(3)),actorId);
    return rows.isEmpty()?null:rows.getFirst();
  }
  private long owner(Long actorId) {
    Vendor vendor=vendor(actorId);
    if(vendor==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Lengkapi nama bisnis sebelum mengelola alat");
    return Long.parseLong(vendor.id());
  }
  private Item find(long vendorId,Long id,boolean lock) {
    var rows=jdbc.query(SELECT+"where i.item_id=? and i.vendor_id=?"+(lock?" for update of i":""),this::item,id,vendorId);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Alat tidak ditemukan");
    return rows.getFirst();
  }
  private Item item(ResultSet rs,int row) throws SQLException {
    String id=rs.getString("item_id");
    String image=photos.available(rs.getString("photo"))?"/api/vendor/catalog/"+id+"/photo?v="+rs.getTimestamp("updated_at").getTime():"";
    return new Item(id,rs.getString("nama_barang"),rs.getString("nama_kategori"),rs.getBigDecimal("harga_sewa_per_hari"),rs.getInt("stok_total"),
        rs.getString("status"),rs.getString("deskripsi_barang"),rs.getString("kondisi_barang"),rs.getBigDecimal("minimal_dp"),image);
  }
  private void cleanAfterCommit(List<String> locators) {
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override public void afterCommit() { for(String locator:locators) {
        try {
          if (Integer.valueOf(0).equals(jdbc.queryForObject("select count(*) from foto_item where tautan_foto=?",Integer.class,locator))) photos.remove(locator);
        } catch (RuntimeException e) { org.slf4j.LoggerFactory.getLogger(VendorCatalogService.class).warn("Foto katalog lama belum dapat dibersihkan"); }
      }}
    });
  }
  private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
