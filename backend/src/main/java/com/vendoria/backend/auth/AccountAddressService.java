package com.vendoria.backend.auth;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AccountAddressDtos.*;

/** Alamat acara tersimpan milik customer (tab "Alamat Acara" di /akun). Kepemilikan selalu dari sesi, bukan dari permintaan. */
@Service
class AccountAddressService {
  static final int MAX=10;
  private static final String SELECT="select alamat_id,nama_venue,alamat_lengkap,catatan_loading,utama from alamat_acara ";
  private final JdbcTemplate jdbc;
  AccountAddressService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  @Transactional
  List<Address> list(Long userId) {
    CustomerGuard.lock(jdbc,userId);
    return jdbc.query(SELECT+"where user_id=? order by utama desc,alamat_id",(rs,n)->address(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getBoolean(5)),userId);
  }

  @Transactional
  Address save(Long userId,Long id,Input input) {
    CustomerGuard.lock(jdbc,userId);
    if(id==null) {
      int count=jdbc.queryForObject("select count(*) from alamat_acara where user_id=?",Integer.class,userId);
      if(count>=MAX) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Maksimal "+MAX+" alamat acara. Hapus alamat yang tidak dipakai lebih dulu");
      boolean primary=Boolean.TRUE.equals(input.primary()) || count==0;
      if(primary) clearPrimary(userId);
      id=jdbc.queryForObject("insert into alamat_acara(user_id,nama_venue,alamat_lengkap,catatan_loading,utama) values (?,?,?,?,?) returning alamat_id",
          Long.class,userId,input.name(),input.address(),input.note(),primary);
    } else {
      boolean current=owned(userId,id);
      boolean primary=Boolean.TRUE.equals(input.primary()) || current; // alamat utama diganti dengan menjadikan alamat lain utama, bukan dengan mencabutnya
      if(primary && !current) clearPrimary(userId);
      jdbc.update("update alamat_acara set nama_venue=?,alamat_lengkap=?,catatan_loading=?,utama=?,updated_at=now() where alamat_id=? and user_id=?",
          input.name(),input.address(),input.note(),primary,id,userId);
    }
    return jdbc.queryForObject(SELECT+"where alamat_id=?",(rs,n)->address(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getBoolean(5)),id);
  }

  @Transactional
  void delete(Long userId,Long id) {
    CustomerGuard.lock(jdbc,userId);
    boolean wasPrimary=owned(userId,id);
    jdbc.update("delete from alamat_acara where alamat_id=? and user_id=?",id,userId);
    // selalu ada satu alamat utama selama masih ada alamat
    if(wasPrimary) jdbc.update("update alamat_acara set utama=true where alamat_id=(select min(alamat_id) from alamat_acara where user_id=?)",userId);
  }

  /** Baris harus milik pengguna (404 bila bukan, sama dengan tidak ada); mengembalikan status utama-nya. */
  private boolean owned(Long userId,Long id) {
    var rows=jdbc.queryForList("select utama from alamat_acara where alamat_id=? and user_id=? for update",Boolean.class,id,userId);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Alamat tidak ditemukan");
    return rows.getFirst();
  }
  private void clearPrimary(Long userId) { jdbc.update("update alamat_acara set utama=false where user_id=? and utama",userId); }
  private static Address address(long id,String name,String address,String note,boolean primary) { return new Address(String.valueOf(id),name,address,note,primary); }
}
