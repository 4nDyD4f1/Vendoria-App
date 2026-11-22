package com.vendoria.backend.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// created_at/updated_at sengaja tidak dipetakan: diisi default now() oleh database.
@Entity
@Table(name = "pengguna")
public class Pengguna {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "user_id")
	private Long userId;

	private String nama;

	private String email;

	@Column(name = "no_telp")
	private String noTelp;

	@Column(name = "password_hash")
	private String passwordHash;

	private String role;

	@Column(name = "status_verifikasi")
	private String statusVerifikasi = "belum_diverifikasi";

	protected Pengguna() {
	}

	Pengguna(String nama, String email, String noTelp, String passwordHash, String role) {
		this.nama = nama;
		this.email = email;
		this.noTelp = noTelp;
		this.passwordHash = passwordHash;
		this.role = role;
	}

	public Long getUserId() { return userId; }
	public String getNama() { return nama; }
	public String getEmail() { return email; }
	public String getNoTelp() { return noTelp; }
	public String getPasswordHash() { return passwordHash; }
	public String getRole() { return role; }
	public String getStatusVerifikasi() { return statusVerifikasi; }
}
