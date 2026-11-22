package com.vendoria.backend.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface PenggunaRepository extends JpaRepository<Pengguna, Long> {

	// lower(...) agar memakai indeks unik uq_pengguna_email_ci; pemanggil wajib mengirim email huruf kecil
	@Query("select p from Pengguna p where lower(p.email) = :email")
	Optional<Pengguna> findByEmail(String email);
}
