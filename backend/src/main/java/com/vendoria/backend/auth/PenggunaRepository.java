package com.vendoria.backend.auth;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

interface PenggunaRepository extends JpaRepository<Pengguna, Long> {

	// lower(...) agar memakai indeks unik uq_pengguna_email_ci; pemanggil wajib mengirim email huruf kecil
	@Query("select p from Pengguna p where lower(p.email) = :email")
	Optional<Pengguna> findByEmail(String email);

	Optional<Pengguna> findByGoogleSub(String googleSub);

	List<Pengguna> findByRoleOrderByUserIdDesc(String role);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = "update pengguna set nama = :nama, email = :email, no_telp = :noTelp, updated_at = now() "
			+ "where user_id = :id and status_akun = 'Aktif' and (google_sub is null or lower(email) = :email) "
			+ "and (two_factor_email = false or lower(email) = :email)", nativeQuery = true)
	int updateProfile(Long id, String nama, String email, String noTelp);

	// native karena updated_at tidak dipetakan di entity; kata sandi diubah terpisah lewat updatePassword
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Transactional
	@Query(value = "update pengguna set nama = :nama, email = :email, status_akun = :status, "
			+ "catatan_admin = :catatan, updated_at = now() where user_id = :id and role = 'admin'", nativeQuery = true)
	int updateAdmin(Long id, String nama, String email, String status, String catatan);

	@Modifying
	@Transactional
	@Query(value = "update pengguna set google_sub = :sub, updated_at = now() where user_id = :id", nativeQuery = true)
	int linkGoogle(Long id, String sub);

	@Modifying
	@Transactional
	@Query(value = "update pengguna set foto_profil = :url, updated_at = now() where user_id = :id", nativeQuery = true)
	int updateFoto(Long id, String url);

	// native karena updated_at tidak dipetakan di entity; DB tidak punya trigger untuknya
	@Modifying
	@Transactional
	@Query(value = "update pengguna set password_hash = :hash, password_dibuat = true, updated_at = now() where user_id = :id", nativeQuery = true)
	int updatePassword(Long id, String hash);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Transactional
	@Query(value = "update pengguna set password_hash = :hash, password_dibuat = true, updated_at = now() "
			+ "where user_id = :id and password_hash = :previousHash and status_akun = 'Aktif'", nativeQuery = true)
	int changeOwnPassword(Long id, String previousHash, String hash);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Transactional
	@Query(value = "update pengguna set two_factor_email = :enabled, updated_at = now() "
			+ "where user_id = :id and password_hash = :hash and lower(email) = :email and status_akun = 'Aktif'", nativeQuery = true)
	int updateTwoFactor(Long id, String hash, String email, boolean enabled);

	@Modifying
	@Transactional
	@Query(value = "update pengguna set password_dibuat = true where user_id = :id and password_dibuat is null "
			+ "and password_hash = :hash", nativeQuery = true)
	int confirmPasswordExists(Long id, String hash);
}
