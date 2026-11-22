package com.vendoria.backend.auth;

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

	@Modifying
	@Transactional
	@Query(value = "update pengguna set google_sub = :sub, updated_at = now() where user_id = :id", nativeQuery = true)
	int linkGoogle(Long id, String sub);

	// native karena updated_at tidak dipetakan di entity; DB tidak punya trigger untuknya
	@Modifying
	@Transactional
	@Query(value = "update pengguna set password_hash = :hash, updated_at = now() where user_id = :id", nativeQuery = true)
	int updatePassword(Long id, String hash);
}
