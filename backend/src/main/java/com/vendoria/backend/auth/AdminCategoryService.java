package com.vendoria.backend.auth;

import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminCategoryDtos.*;

/** Kelola tabel kategori (dipakai item.kategori_id, ON DELETE RESTRICT) oleh administrator aktif. */
@Service
class AdminCategoryService {
  private static final String SELECT="""
      select k.kategori_id,k.nama_kategori,(select count(*) from item i where i.kategori_id=k.kategori_id) as jumlah
      from kategori k
      """;
  private final JdbcTemplate jdbc;
  AdminCategoryService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  @Transactional(readOnly=true)
  List<Category> list(Long actorId) { admin(actorId,false); return jdbc.query(SELECT+"order by lower(k.nama_kategori),k.kategori_id",(rs,n)->category(rs.getLong(1),rs.getString(2),rs.getInt(3))); }

  @Transactional
  Category save(Long actorId,Long id,Input input) {
    admin(actorId,true);
    if(id!=null && jdbc.queryForList("select kategori_id from kategori where kategori_id=? for update",Long.class,id).isEmpty()) throw missing();
    if(Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from kategori where lower(nama_kategori)=lower(?) and (?::bigint is null or kategori_id<>?))",Boolean.class,input.name(),id,id))) throw duplicate();
    try {
      if(id==null) id=jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id",Long.class,input.name());
      else jdbc.update("update kategori set nama_kategori=? where kategori_id=?",input.name(),id);
    } catch(DataIntegrityViolationException e) { throw duplicate(); } // balapan dua permintaan: batas unik di DB tetap menang
    return jdbc.queryForObject(SELECT+"where k.kategori_id=?",(rs,n)->category(rs.getLong(1),rs.getString(2),rs.getInt(3)),id);
  }

  @Transactional
  void delete(Long actorId,List<Long> ids) {
    admin(actorId,true);
    List<Long> targets=ids.stream().distinct().sorted().toList();
    for(Long id:targets) {
      var rows=jdbc.queryForList("select nama_kategori from kategori where kategori_id=? for update",String.class,id);
      if(rows.isEmpty()) throw missing();
      Integer used=jdbc.queryForObject("select count(*) from item where kategori_id=?",Integer.class,id);
      if(used!=null && used>0) throw used(rows.getFirst(),used);
    }
    try { for(Long id:targets) jdbc.update("delete from kategori where kategori_id=?",id); }
    catch(DataIntegrityViolationException e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Kategori masih dipakai alat. Pindahkan alatnya lebih dulu"); }
  }

  private static Category category(long id,String name,int count) { return new Category(String.valueOf(id),name,count); }
  private void admin(Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"admin".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk administrator aktif");
  }
  private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Kategori tidak ditemukan"); }
  private static ResponseStatusException duplicate() { return new ResponseStatusException(HttpStatus.CONFLICT,"Nama kategori sudah dipakai"); }
  private static ResponseStatusException used(String name,int count) {
    return new ResponseStatusException(HttpStatus.CONFLICT,"Kategori \""+name+"\" masih dipakai "+count+" alat. Pindahkan alatnya ke kategori lain lebih dulu");
  }
}
