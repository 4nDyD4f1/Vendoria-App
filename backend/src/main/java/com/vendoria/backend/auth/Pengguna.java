package com.vendoria.backend.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// created_at hanya dibaca (diisi default now() oleh database); updated_at sengaja tidak dipetakan.
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

	// "sub" Google; null untuk akun email+password. Kolom ditambah oleh backend/db/add-google-sub.sql
	@Column(name = "google_sub")
	private String googleSub;

	// URL foto profil (https) dari akun Google; null bila tak ada. Kolom ditambah oleh backend/db/add-foto-profil.sql
	@Column(name = "foto_profil")
	private String fotoProfil;

	// "Aktif" | "Nonaktif"; akun Nonaktif tidak bisa login. Kolom ditambah oleh backend/db/add-administrator.sql
	@Column(name = "status_akun")
	private String statusAkun = AKTIF;

	@Column(name = "catatan_admin")
	private String catatanAdmin;

	@Column(name = "password_dibuat")
	private Boolean passwordDibuat = true;

	@Column(name = "two_factor_email")
	private boolean twoFactorEmail;

	@Column(name = "created_at", insertable = false, updatable = false)
	private Instant createdAt;

	static final String AKTIF = "Aktif";

	protected Pengguna() {
	}

	static Pengguna admin(String nama, String email, String passwordHash, String status, String catatan) {
		Pengguna p = new Pengguna(nama, email, null, passwordHash, "admin");
		p.statusAkun = status;
		p.catatanAdmin = catatan;
		return p;
	}

	/** Akun baru dari login Google: tanpa nomor telepon; passwordHash acak yang tak diketahui siapa pun. */
	static Pengguna dariGoogle(String nama, String email, String passwordHash, String googleSub) {
		Pengguna p = new Pengguna(nama, email, null, passwordHash, "customer");
		p.googleSub = googleSub;
		p.passwordDibuat = false;
		return p;
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
	public String getGoogleSub() { return googleSub; }
	public String getFotoProfil() { return fotoProfil; }
	public String getStatusAkun() { return statusAkun; }
	public String getCatatanAdmin() { return catatanAdmin; }
	public Boolean getPasswordDibuat() { return passwordDibuat; }
	public boolean isTwoFactorEmail() { return twoFactorEmail; }
	public Instant getCreatedAt() { return createdAt; }
}
