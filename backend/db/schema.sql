--
-- PostgreSQL database dump
--

\restrict cQeZBiie1oa2tIX7qSbZ2aRb0gjlnAWDfYqDBMUpdsLzWVtoEVDpDXAeeu9MeSD

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alamat_acara; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alamat_acara (
    alamat_id bigint NOT NULL,
    user_id bigint NOT NULL,
    nama_venue character varying(150) NOT NULL,
    alamat_lengkap character varying(500) NOT NULL,
    catatan_loading character varying(500),
    utama boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alamat_acara_alamat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.alamat_acara ALTER COLUMN alamat_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.alamat_acara_alamat_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bukti_klaim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bukti_klaim (
    bukti_id bigint NOT NULL,
    klaim_id bigint NOT NULL,
    file_url text NOT NULL,
    keterangan text,
    diunggah_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bukti_klaim_bukti_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bukti_klaim ALTER COLUMN bukti_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bukti_klaim_bukti_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cek_barang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cek_barang (
    cek_barang_id bigint NOT NULL,
    order_id bigint NOT NULL,
    item_id bigint NOT NULL,
    tipe_inspeksi character varying(20) NOT NULL,
    foto_kondisi text,
    catatan_kondisi text,
    diperiksa_oleh bigint,
    tanggal_bukti timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cek_barang_tipe_inspeksi_check CHECK (((tipe_inspeksi)::text = ANY ((ARRAY['serah_terima'::character varying, 'pengembalian'::character varying])::text[])))
);


--
-- Name: cek_barang_cek_barang_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cek_barang ALTER COLUMN cek_barang_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cek_barang_cek_barang_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: detail_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detail_item (
    order_detail_id bigint NOT NULL,
    order_id bigint NOT NULL,
    item_id bigint NOT NULL,
    jumlah_sewa integer NOT NULL,
    harga_saat_sewa numeric(14,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    CONSTRAINT detail_item_harga_saat_sewa_check CHECK ((harga_saat_sewa >= (0)::numeric)),
    CONSTRAINT detail_item_jumlah_sewa_check CHECK ((jumlah_sewa > 0)),
    CONSTRAINT detail_item_subtotal_check CHECK ((subtotal >= (0)::numeric))
);


--
-- Name: detail_item_order_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.detail_item ALTER COLUMN order_detail_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.detail_item_order_detail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: foto_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.foto_item (
    foto_id bigint NOT NULL,
    item_id bigint NOT NULL,
    tautan_foto text NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    CONSTRAINT foto_item_urutan_check CHECK ((urutan >= 0))
);


--
-- Name: foto_item_foto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.foto_item ALTER COLUMN foto_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.foto_item_foto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item (
    item_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    kategori_id bigint NOT NULL,
    nama_barang character varying(180) NOT NULL,
    deskripsi_barang text,
    harga_sewa_per_hari numeric(14,2) NOT NULL,
    stok_total integer NOT NULL,
    kondisi_barang text,
    minimal_dp numeric(14,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'aktif'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT item_harga_sewa_per_hari_check CHECK ((harga_sewa_per_hari >= (0)::numeric)),
    CONSTRAINT item_minimal_dp_check CHECK ((minimal_dp >= (0)::numeric)),
    CONSTRAINT item_status_check CHECK (((status)::text = ANY ((ARRAY['aktif'::character varying, 'nonaktif'::character varying, 'arsip'::character varying])::text[]))),
    CONSTRAINT item_stok_total_check CHECK ((stok_total >= 0))
);


--
-- Name: item_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.item ALTER COLUMN item_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.item_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kategori; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kategori (
    kategori_id bigint NOT NULL,
    nama_kategori character varying(100) NOT NULL,
    icon text
);


--
-- Name: kategori_kategori_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kategori ALTER COLUMN kategori_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kategori_kategori_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: keranjang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keranjang (
    user_id bigint NOT NULL,
    item_id bigint NOT NULL,
    jumlah integer NOT NULL,
    ditambahkan_pada timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT keranjang_jumlah_check CHECK (((jumlah >= 1) AND (jumlah <= 99)))
);


--
-- Name: klaim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.klaim (
    klaim_id bigint NOT NULL,
    order_id bigint NOT NULL,
    user_id bigint NOT NULL,
    alasan text NOT NULL,
    status character varying(20) DEFAULT 'diajukan'::character varying NOT NULL,
    keputusan_admin text,
    diputuskan_oleh bigint,
    diajukan_pada timestamp with time zone DEFAULT now() NOT NULL,
    diputuskan_pada timestamp with time zone,
    jenis character varying(20) DEFAULT 'kerusakan'::character varying NOT NULL,
    item_id bigint,
    jumlah_unit integer,
    foto_pelapor text,
    tanggapan_vendor text,
    foto_vendor text,
    barang_kembali_pada timestamp with time zone,
    CONSTRAINT klaim_jenis_check CHECK (((jenis)::text = ANY ((ARRAY['kerusakan'::character varying, 'tidak_sampai'::character varying, 'tidak_sesuai'::character varying, 'kurang'::character varying, 'tidak_berfungsi'::character varying, 'lainnya'::character varying])::text[]))),
    CONSTRAINT klaim_jumlah_unit_check CHECK ((jumlah_unit > 0)),
    CONSTRAINT klaim_status_check CHECK (((status)::text = ANY ((ARRAY['diajukan'::character varying, 'ditinjau'::character varying, 'disetujui'::character varying, 'ditolak'::character varying, 'selesai'::character varying])::text[])))
);


--
-- Name: klaim_klaim_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.klaim ALTER COLUMN klaim_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.klaim_klaim_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kyc_verifikasi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_verifikasi (
    kyc_id bigint NOT NULL,
    user_id bigint NOT NULL,
    jenis_dokumen character varying(40) NOT NULL,
    dokumen_url text NOT NULL,
    status character varying(20) DEFAULT 'menunggu'::character varying NOT NULL,
    catatan_admin text,
    diverifikasi_oleh bigint,
    diajukan_pada timestamp with time zone DEFAULT now() NOT NULL,
    diputuskan_pada timestamp with time zone,
    CONSTRAINT kyc_verifikasi_check CHECK (((diputuskan_pada IS NULL) OR (diputuskan_pada >= diajukan_pada))),
    CONSTRAINT kyc_verifikasi_status_check CHECK (((status)::text = ANY ((ARRAY['menunggu'::character varying, 'terverifikasi'::character varying, 'ditolak'::character varying])::text[])))
);


--
-- Name: kyc_verifikasi_kyc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.kyc_verifikasi ALTER COLUMN kyc_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.kyc_verifikasi_kyc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notifikasi_admin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifikasi_admin (
    user_id bigint NOT NULL,
    kunci character varying(40) NOT NULL,
    dibaca_pada timestamp with time zone,
    dihapus_pada timestamp with time zone
);


--
-- Name: pembayaran; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pembayaran (
    pembayaran_id bigint NOT NULL,
    order_id bigint NOT NULL,
    jenis character varying(20) NOT NULL,
    metode character varying(30) NOT NULL,
    jumlah numeric(14,2) NOT NULL,
    status character varying(20) DEFAULT 'menunggu'::character varying NOT NULL,
    bukti_url text,
    referensi_eksternal character varying(150),
    diverifikasi_oleh bigint,
    dibayar_pada timestamp with time zone,
    diverifikasi_pada timestamp with time zone,
    dibuat_pada timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pembayaran_jenis_check CHECK (((jenis)::text = ANY ((ARRAY['deposit'::character varying, 'pelunasan'::character varying])::text[]))),
    CONSTRAINT pembayaran_jumlah_check CHECK ((jumlah > (0)::numeric)),
    CONSTRAINT pembayaran_metode_check CHECK (((metode)::text = ANY ((ARRAY['transfer_bank'::character varying, 'payment_gateway'::character varying, 'lainnya'::character varying])::text[]))),
    CONSTRAINT pembayaran_status_check CHECK (((status)::text = ANY ((ARRAY['menunggu'::character varying, 'terverifikasi'::character varying, 'ditolak'::character varying, 'gagal'::character varying])::text[])))
);


--
-- Name: pembayaran_pembayaran_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pembayaran ALTER COLUMN pembayaran_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pembayaran_pembayaran_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pemesanan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pemesanan (
    order_id bigint NOT NULL,
    user_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    kode_pemesanan character varying(50) NOT NULL,
    tanggal_mulai_sewa date NOT NULL,
    tanggal_selesai_sewa date NOT NULL,
    lokasi_acara text,
    total_biaya_sewa numeric(14,2) DEFAULT 0 NOT NULL,
    total_dp numeric(14,2) DEFAULT 0 NOT NULL,
    status_pesanan character varying(25) DEFAULT 'menunggu_pembayaran'::character varying NOT NULL,
    tanggal_pemesanan timestamp with time zone DEFAULT now() NOT NULL,
    nama_acara character varying(150),
    kategori_acara character varying(50),
    nama_venue character varying(150),
    nama_pic character varying(120),
    whatsapp_pic character varying(30),
    catatan_akses character varying(300),
    CONSTRAINT pemesanan_check CHECK (((total_dp >= (0)::numeric) AND (total_dp <= total_biaya_sewa))),
    CONSTRAINT pemesanan_check1 CHECK ((tanggal_selesai_sewa > tanggal_mulai_sewa)),
    CONSTRAINT pemesanan_status_pesanan_check CHECK (((status_pesanan)::text = ANY ((ARRAY['menunggu_pembayaran'::character varying, 'menunggu_konfirmasi'::character varying, 'dikonfirmasi'::character varying, 'berjalan'::character varying, 'dikembalikan'::character varying, 'selesai'::character varying, 'dibatalkan'::character varying])::text[]))),
    CONSTRAINT pemesanan_total_biaya_sewa_check CHECK ((total_biaya_sewa >= (0)::numeric))
);


--
-- Name: pemesanan_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pemesanan ALTER COLUMN order_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pemesanan_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pencairan_dana; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pencairan_dana (
    pencairan_id bigint NOT NULL,
    order_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    jumlah numeric(14,2) NOT NULL,
    status character varying(20) DEFAULT 'menunggu'::character varying NOT NULL,
    referensi_transfer character varying(150),
    diproses_oleh bigint,
    diajukan_pada timestamp with time zone DEFAULT now() NOT NULL,
    dicairkan_pada timestamp with time zone,
    bank character varying(20),
    nomor_rekening character varying(20),
    nama_pemilik character varying(120),
    jumlah_kotor numeric(14,2),
    biaya_platform numeric(14,2) DEFAULT 0 NOT NULL,
    persen_biaya numeric(5,2) DEFAULT 0 NOT NULL,
    potongan_klaim numeric(14,2) DEFAULT 0 NOT NULL,
    CONSTRAINT pencairan_dana_biaya_platform_check CHECK ((biaya_platform >= (0)::numeric)),
    CONSTRAINT pencairan_dana_jumlah_check CHECK ((jumlah > (0)::numeric)),
    CONSTRAINT pencairan_dana_persen_biaya_check CHECK (((persen_biaya >= (0)::numeric) AND (persen_biaya <= (100)::numeric))),
    CONSTRAINT pencairan_dana_potongan_klaim_check CHECK ((potongan_klaim >= (0)::numeric)),
    CONSTRAINT pencairan_dana_status_check CHECK (((status)::text = ANY ((ARRAY['menunggu'::character varying, 'diproses'::character varying, 'berhasil'::character varying, 'gagal'::character varying, 'dibatalkan'::character varying])::text[])))
);


--
-- Name: pencairan_dana_pencairan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pencairan_dana ALTER COLUMN pencairan_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pencairan_dana_pencairan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pengembalian_dana; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengembalian_dana (
    pengembalian_id bigint NOT NULL,
    order_id bigint NOT NULL,
    pembayaran_id bigint,
    klaim_id bigint,
    jumlah numeric(14,2) NOT NULL,
    alasan text,
    status character varying(20) DEFAULT 'menunggu'::character varying NOT NULL,
    referensi_transfer character varying(150),
    diproses_oleh bigint,
    diajukan_pada timestamp with time zone DEFAULT now() NOT NULL,
    dikembalikan_pada timestamp with time zone,
    CONSTRAINT pengembalian_dana_jumlah_check CHECK ((jumlah > (0)::numeric)),
    CONSTRAINT pengembalian_dana_status_check CHECK (((status)::text = ANY ((ARRAY['menunggu'::character varying, 'diproses'::character varying, 'berhasil'::character varying, 'gagal'::character varying, 'dibatalkan'::character varying])::text[])))
);


--
-- Name: pengembalian_dana_pengembalian_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pengembalian_dana ALTER COLUMN pengembalian_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pengembalian_dana_pengembalian_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pengguna; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengguna (
    user_id bigint NOT NULL,
    nama character varying(120) NOT NULL,
    email character varying(255) NOT NULL,
    no_telp character varying(30),
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'customer'::character varying NOT NULL,
    status_verifikasi character varying(20) DEFAULT 'belum_diverifikasi'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    google_sub character varying(255),
    foto_profil character varying(500),
    status_akun character varying(10) DEFAULT 'Aktif'::character varying NOT NULL,
    catatan_admin text,
    two_factor_email boolean DEFAULT false NOT NULL,
    password_dibuat boolean DEFAULT true,
    CONSTRAINT pengguna_nama_check CHECK ((length(TRIM(BOTH FROM nama)) > 0)),
    CONSTRAINT pengguna_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'vendor'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT pengguna_status_akun_check CHECK (((status_akun)::text = ANY ((ARRAY['Aktif'::character varying, 'Nonaktif'::character varying])::text[]))),
    CONSTRAINT pengguna_status_verifikasi_check CHECK (((status_verifikasi)::text = ANY ((ARRAY['belum_diverifikasi'::character varying, 'menunggu'::character varying, 'terverifikasi'::character varying, 'ditolak'::character varying])::text[])))
);


--
-- Name: pengguna_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pengguna ALTER COLUMN user_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pengguna_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rekening_refund; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rekening_refund (
    rekening_id bigint NOT NULL,
    user_id bigint NOT NULL,
    bank character varying(20) NOT NULL,
    nomor_rekening character varying(20) NOT NULL,
    nama_pemilik character varying(120) NOT NULL,
    utama boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rekening_refund_bank_check CHECK (((bank)::text = ANY ((ARRAY['BCA'::character varying, 'Mandiri'::character varying, 'BRI'::character varying, 'BNI'::character varying])::text[]))),
    CONSTRAINT rekening_refund_nomor_rekening_check CHECK (((nomor_rekening)::text ~ '^[0-9]{8,20}$'::text))
);


--
-- Name: rekening_refund_rekening_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rekening_refund ALTER COLUMN rekening_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.rekening_refund_rekening_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rekening_vendor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rekening_vendor (
    vendor_id bigint NOT NULL,
    bank character varying(20) NOT NULL,
    nomor_rekening character varying(20) NOT NULL,
    nama_pemilik character varying(120) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rekening_vendor_bank_check CHECK (((bank)::text = ANY ((ARRAY['BCA'::character varying, 'Mandiri'::character varying, 'BRI'::character varying, 'BNI'::character varying])::text[]))),
    CONSTRAINT rekening_vendor_nama_pemilik_check CHECK ((length(TRIM(BOTH FROM nama_pemilik)) > 0)),
    CONSTRAINT rekening_vendor_nomor_rekening_check CHECK (((nomor_rekening)::text ~ '^[0-9]{8,20}$'::text))
);


--
-- Name: riwayat_status_pesanan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riwayat_status_pesanan (
    riwayat_id bigint NOT NULL,
    order_id bigint NOT NULL,
    status_sebelumnya character varying(25),
    status_baru character varying(25) NOT NULL,
    diubah_oleh bigint,
    catatan text,
    diubah_pada timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: riwayat_status_pesanan_riwayat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.riwayat_status_pesanan ALTER COLUMN riwayat_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.riwayat_status_pesanan_riwayat_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ulasan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ulasan (
    ulasan_id bigint NOT NULL,
    order_id bigint NOT NULL,
    user_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    rating smallint NOT NULL,
    komentar text,
    tanggal_ulasan timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ulasan_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: ulasan_ulasan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ulasan ALTER COLUMN ulasan_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ulasan_ulasan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: v_laporan_transaksi; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_laporan_transaksi AS
 WITH bayar AS (
         SELECT pembayaran.order_id,
            COALESCE(sum(pembayaran.jumlah) FILTER (WHERE ((pembayaran.status)::text = 'terverifikasi'::text)), (0)::numeric) AS total_terbayar,
            COALESCE(sum(pembayaran.jumlah) FILTER (WHERE (((pembayaran.status)::text = 'terverifikasi'::text) AND ((pembayaran.jenis)::text = 'deposit'::text))), (0)::numeric) AS deposit_terbayar
           FROM public.pembayaran
          GROUP BY pembayaran.order_id
        ), cair AS (
         SELECT pencairan_dana.order_id,
            COALESCE(sum(pencairan_dana.jumlah) FILTER (WHERE ((pencairan_dana.status)::text = 'berhasil'::text)), (0)::numeric) AS total_dicairkan
           FROM public.pencairan_dana
          GROUP BY pencairan_dana.order_id
        ), kembali AS (
         SELECT pengembalian_dana.order_id,
            COALESCE(sum(pengembalian_dana.jumlah) FILTER (WHERE ((pengembalian_dana.status)::text = 'berhasil'::text)), (0)::numeric) AS total_dikembalikan
           FROM public.pengembalian_dana
          GROUP BY pengembalian_dana.order_id
        )
 SELECT p.order_id,
    p.kode_pemesanan,
    p.tanggal_pemesanan,
    p.tanggal_mulai_sewa,
    p.tanggal_selesai_sewa,
    p.user_id,
    p.vendor_id,
    p.status_pesanan,
    p.total_biaya_sewa,
    p.total_dp,
    COALESCE(b.total_terbayar, (0)::numeric) AS total_terbayar,
    COALESCE(b.deposit_terbayar, (0)::numeric) AS deposit_terbayar,
    COALESCE(c.total_dicairkan, (0)::numeric) AS total_dicairkan,
    COALESCE(k.total_dikembalikan, (0)::numeric) AS total_dikembalikan
   FROM (((public.pemesanan p
     LEFT JOIN bayar b ON ((b.order_id = p.order_id)))
     LEFT JOIN cair c ON ((c.order_id = p.order_id)))
     LEFT JOIN kembali k ON ((k.order_id = p.order_id)));


--
-- Name: vendor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor (
    vendor_id bigint NOT NULL,
    user_id bigint NOT NULL,
    nama_vendor character varying(150) NOT NULL,
    deskripsi text,
    alamat text,
    kota character varying(100),
    latitude numeric(10,7),
    longitude numeric(10,7),
    foto text,
    rating numeric(3,2),
    status_aktif boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_latitude_check CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))),
    CONSTRAINT vendor_longitude_check CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))),
    CONSTRAINT vendor_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: vendor_vendor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.vendor ALTER COLUMN vendor_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.vendor_vendor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist (
    user_id bigint NOT NULL,
    item_id bigint NOT NULL,
    nama_saat_disimpan character varying(255) NOT NULL,
    disimpan_pada timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wishlist_nama_saat_disimpan_check CHECK ((length(btrim((nama_saat_disimpan)::text)) > 0))
);


--
-- Name: alamat_acara alamat_acara_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alamat_acara
    ADD CONSTRAINT alamat_acara_pkey PRIMARY KEY (alamat_id);


--
-- Name: bukti_klaim bukti_klaim_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bukti_klaim
    ADD CONSTRAINT bukti_klaim_pkey PRIMARY KEY (bukti_id);


--
-- Name: cek_barang cek_barang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cek_barang
    ADD CONSTRAINT cek_barang_pkey PRIMARY KEY (cek_barang_id);


--
-- Name: detail_item detail_item_order_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detail_item
    ADD CONSTRAINT detail_item_order_id_item_id_key UNIQUE (order_id, item_id);


--
-- Name: detail_item detail_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detail_item
    ADD CONSTRAINT detail_item_pkey PRIMARY KEY (order_detail_id);


--
-- Name: foto_item foto_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foto_item
    ADD CONSTRAINT foto_item_pkey PRIMARY KEY (foto_id);


--
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (item_id);


--
-- Name: kategori kategori_nama_kategori_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_nama_kategori_key UNIQUE (nama_kategori);


--
-- Name: kategori kategori_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_pkey PRIMARY KEY (kategori_id);


--
-- Name: keranjang keranjang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keranjang
    ADD CONSTRAINT keranjang_pkey PRIMARY KEY (user_id, item_id);


--
-- Name: klaim klaim_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.klaim
    ADD CONSTRAINT klaim_pkey PRIMARY KEY (klaim_id);


--
-- Name: kyc_verifikasi kyc_verifikasi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifikasi
    ADD CONSTRAINT kyc_verifikasi_pkey PRIMARY KEY (kyc_id);


--
-- Name: notifikasi_admin notifikasi_admin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifikasi_admin
    ADD CONSTRAINT notifikasi_admin_pkey PRIMARY KEY (user_id, kunci);


--
-- Name: pembayaran pembayaran_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pembayaran
    ADD CONSTRAINT pembayaran_pkey PRIMARY KEY (pembayaran_id);


--
-- Name: pembayaran pembayaran_referensi_eksternal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pembayaran
    ADD CONSTRAINT pembayaran_referensi_eksternal_key UNIQUE (referensi_eksternal);


--
-- Name: pemesanan pemesanan_kode_pemesanan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pemesanan
    ADD CONSTRAINT pemesanan_kode_pemesanan_key UNIQUE (kode_pemesanan);


--
-- Name: pemesanan pemesanan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pemesanan
    ADD CONSTRAINT pemesanan_pkey PRIMARY KEY (order_id);


--
-- Name: pencairan_dana pencairan_dana_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pencairan_dana
    ADD CONSTRAINT pencairan_dana_pkey PRIMARY KEY (pencairan_id);


--
-- Name: pencairan_dana pencairan_dana_referensi_transfer_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pencairan_dana
    ADD CONSTRAINT pencairan_dana_referensi_transfer_key UNIQUE (referensi_transfer);


--
-- Name: pengembalian_dana pengembalian_dana_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengembalian_dana
    ADD CONSTRAINT pengembalian_dana_pkey PRIMARY KEY (pengembalian_id);


--
-- Name: pengembalian_dana pengembalian_dana_referensi_transfer_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengembalian_dana
    ADD CONSTRAINT pengembalian_dana_referensi_transfer_key UNIQUE (referensi_transfer);


--
-- Name: pengguna pengguna_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengguna
    ADD CONSTRAINT pengguna_pkey PRIMARY KEY (user_id);


--
-- Name: rekening_refund rekening_refund_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rekening_refund
    ADD CONSTRAINT rekening_refund_pkey PRIMARY KEY (rekening_id);


--
-- Name: rekening_refund rekening_refund_user_id_bank_nomor_rekening_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rekening_refund
    ADD CONSTRAINT rekening_refund_user_id_bank_nomor_rekening_key UNIQUE (user_id, bank, nomor_rekening);


--
-- Name: rekening_vendor rekening_vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rekening_vendor
    ADD CONSTRAINT rekening_vendor_pkey PRIMARY KEY (vendor_id);


--
-- Name: riwayat_status_pesanan riwayat_status_pesanan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_status_pesanan
    ADD CONSTRAINT riwayat_status_pesanan_pkey PRIMARY KEY (riwayat_id);


--
-- Name: ulasan ulasan_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ulasan
    ADD CONSTRAINT ulasan_order_id_key UNIQUE (order_id);


--
-- Name: ulasan ulasan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ulasan
    ADD CONSTRAINT ulasan_pkey PRIMARY KEY (ulasan_id);


--
-- Name: vendor vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_pkey PRIMARY KEY (vendor_id);


--
-- Name: vendor vendor_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_user_id_key UNIQUE (user_id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (user_id, item_id);


--
-- Name: idx_alamat_acara_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alamat_acara_user ON public.alamat_acara USING btree (user_id);


--
-- Name: idx_bukti_klaim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bukti_klaim ON public.bukti_klaim USING btree (klaim_id);


--
-- Name: idx_cek_barang_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cek_barang_order ON public.cek_barang USING btree (order_id, tanggal_bukti DESC);


--
-- Name: idx_detail_item_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detail_item_item ON public.detail_item USING btree (item_id);


--
-- Name: idx_foto_item_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foto_item_item ON public.foto_item USING btree (item_id);


--
-- Name: idx_item_kategori; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_kategori ON public.item USING btree (kategori_id);


--
-- Name: idx_item_vendor_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_vendor_status ON public.item USING btree (vendor_id, status);


--
-- Name: idx_keranjang_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keranjang_item ON public.keranjang USING btree (item_id);


--
-- Name: idx_klaim_order_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_klaim_order_status ON public.klaim USING btree (order_id, status);


--
-- Name: idx_kyc_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_user_status ON public.kyc_verifikasi USING btree (user_id, status);


--
-- Name: idx_pembayaran_order_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pembayaran_order_status ON public.pembayaran USING btree (order_id, status);


--
-- Name: idx_pemesanan_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pemesanan_customer ON public.pemesanan USING btree (user_id, tanggal_pemesanan DESC);


--
-- Name: idx_pemesanan_periode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pemesanan_periode ON public.pemesanan USING btree (tanggal_mulai_sewa, tanggal_selesai_sewa);


--
-- Name: idx_pemesanan_vendor_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pemesanan_vendor_status ON public.pemesanan USING btree (vendor_id, status_pesanan);


--
-- Name: idx_pencairan_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pencairan_order ON public.pencairan_dana USING btree (order_id, status);


--
-- Name: idx_pengembalian_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pengembalian_order ON public.pengembalian_dana USING btree (order_id, status);


--
-- Name: idx_riwayat_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_riwayat_order ON public.riwayat_status_pesanan USING btree (order_id, diubah_pada DESC);


--
-- Name: idx_ulasan_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ulasan_vendor ON public.ulasan USING btree (vendor_id, tanggal_ulasan DESC);


--
-- Name: idx_wishlist_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_item ON public.wishlist USING btree (item_id);


--
-- Name: uq_alamat_acara_utama; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_alamat_acara_utama ON public.alamat_acara USING btree (user_id) WHERE utama;


--
-- Name: uq_pencairan_order_aktif; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_pencairan_order_aktif ON public.pencairan_dana USING btree (order_id) WHERE ((status)::text = ANY ((ARRAY['menunggu'::character varying, 'diproses'::character varying, 'berhasil'::character varying])::text[]));


--
-- Name: uq_pengguna_email_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_pengguna_email_ci ON public.pengguna USING btree (lower((email)::text));


--
-- Name: uq_pengguna_google_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_pengguna_google_sub ON public.pengguna USING btree (google_sub);


--
-- Name: uq_rekening_refund_utama; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_rekening_refund_utama ON public.rekening_refund USING btree (user_id) WHERE utama;


--
-- Name: alamat_acara alamat_acara_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alamat_acara
    ADD CONSTRAINT alamat_acara_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE CASCADE;


--
-- Name: bukti_klaim bukti_klaim_klaim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bukti_klaim
    ADD CONSTRAINT bukti_klaim_klaim_id_fkey FOREIGN KEY (klaim_id) REFERENCES public.klaim(klaim_id) ON DELETE CASCADE;


--
-- Name: cek_barang cek_barang_diperiksa_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cek_barang
    ADD CONSTRAINT cek_barang_diperiksa_oleh_fkey FOREIGN KEY (diperiksa_oleh) REFERENCES public.pengguna(user_id) ON DELETE SET NULL;


--
-- Name: cek_barang cek_barang_order_id_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cek_barang
    ADD CONSTRAINT cek_barang_order_id_item_id_fkey FOREIGN KEY (order_id, item_id) REFERENCES public.detail_item(order_id, item_id) ON DELETE RESTRICT;


--
-- Name: detail_item detail_item_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detail_item
    ADD CONSTRAINT detail_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(item_id) ON DELETE RESTRICT;


--
-- Name: detail_item detail_item_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detail_item
    ADD CONSTRAINT detail_item_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pemesanan(order_id) ON DELETE RESTRICT;


--
-- Name: foto_item foto_item_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foto_item
    ADD CONSTRAINT foto_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(item_id) ON DELETE CASCADE;


--
-- Name: item item_kategori_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_kategori_id_fkey FOREIGN KEY (kategori_id) REFERENCES public.kategori(kategori_id) ON DELETE RESTRICT;


--
-- Name: item item_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id) ON DELETE RESTRICT;


--
-- Name: keranjang keranjang_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keranjang
    ADD CONSTRAINT keranjang_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(item_id) ON DELETE CASCADE;


--
-- Name: keranjang keranjang_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keranjang
    ADD CONSTRAINT keranjang_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE CASCADE;


--
-- Name: klaim klaim_diputuskan_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.klaim
    ADD CONSTRAINT klaim_diputuskan_oleh_fkey FOREIGN KEY (diputuskan_oleh) REFERENCES public.pengguna(user_id) ON DELETE SET NULL;


--
-- Name: klaim klaim_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.klaim
    ADD CONSTRAINT klaim_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pemesanan(order_id) ON DELETE RESTRICT;


--
-- Name: klaim klaim_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.klaim
    ADD CONSTRAINT klaim_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE RESTRICT;


--
-- Name: kyc_verifikasi kyc_verifikasi_diverifikasi_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifikasi
    ADD CONSTRAINT kyc_verifikasi_diverifikasi_oleh_fkey FOREIGN KEY (diverifikasi_oleh) REFERENCES public.pengguna(user_id) ON DELETE SET NULL;


--
-- Name: kyc_verifikasi kyc_verifikasi_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifikasi
    ADD CONSTRAINT kyc_verifikasi_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE RESTRICT;


--
-- Name: notifikasi_admin notifikasi_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifikasi_admin
    ADD CONSTRAINT notifikasi_admin_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE CASCADE;


--
-- Name: pembayaran pembayaran_diverifikasi_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pembayaran
    ADD CONSTRAINT pembayaran_diverifikasi_oleh_fkey FOREIGN KEY (diverifikasi_oleh) REFERENCES public.pengguna(user_id) ON DELETE SET NULL;


--
-- Name: pembayaran pembayaran_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pembayaran
    ADD CONSTRAINT pembayaran_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pemesanan(order_id) ON DELETE RESTRICT;


--
-- Name: pemesanan pemesanan_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pemesanan
    ADD CONSTRAINT pemesanan_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE RESTRICT;


--
-- Name: pemesanan pemesanan_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pemesanan
    ADD CONSTRAINT pemesanan_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id) ON DELETE RESTRICT;


--
-- Name: pencairan_dana pencairan_dana_diproses_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pencairan_dana
    ADD CONSTRAINT pencairan_dana_diproses_oleh_fkey FOREIGN KEY (diproses_oleh) REFERENCES public.pengguna(user_id) ON DELETE SET NULL;


--
-- Name: pencairan_dana pencairan_dana_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pencairan_dana
    ADD CONSTRAINT pencairan_dana_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pemesanan(order_id) ON DELETE RESTRICT;


--
-- Name: pencairan_dana pencairan_dana_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pencairan_dana
    ADD CONSTRAINT pencairan_dana_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id) ON DELETE RESTRICT;


--
-- Name: pengembalian_dana pengembalian_dana_diproses_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengembalian_dana
    ADD CONSTRAINT pengembalian_dana_diproses_oleh_fkey FOREIGN KEY (diproses_oleh) REFERENCES public.pengguna(user_id) ON DELETE SET NULL;


--
-- Name: pengembalian_dana pengembalian_dana_klaim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengembalian_dana
    ADD CONSTRAINT pengembalian_dana_klaim_id_fkey FOREIGN KEY (klaim_id) REFERENCES public.klaim(klaim_id) ON DELETE SET NULL;


--
-- Name: pengembalian_dana pengembalian_dana_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengembalian_dana
    ADD CONSTRAINT pengembalian_dana_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pemesanan(order_id) ON DELETE RESTRICT;


--
-- Name: pengembalian_dana pengembalian_dana_pembayaran_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengembalian_dana
    ADD CONSTRAINT pengembalian_dana_pembayaran_id_fkey FOREIGN KEY (pembayaran_id) REFERENCES public.pembayaran(pembayaran_id) ON DELETE RESTRICT;


--
-- Name: rekening_refund rekening_refund_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rekening_refund
    ADD CONSTRAINT rekening_refund_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE CASCADE;


--
-- Name: rekening_vendor rekening_vendor_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rekening_vendor
    ADD CONSTRAINT rekening_vendor_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id) ON DELETE CASCADE;


--
-- Name: riwayat_status_pesanan riwayat_status_pesanan_diubah_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_status_pesanan
    ADD CONSTRAINT riwayat_status_pesanan_diubah_oleh_fkey FOREIGN KEY (diubah_oleh) REFERENCES public.pengguna(user_id) ON DELETE SET NULL;


--
-- Name: riwayat_status_pesanan riwayat_status_pesanan_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_status_pesanan
    ADD CONSTRAINT riwayat_status_pesanan_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pemesanan(order_id) ON DELETE RESTRICT;


--
-- Name: ulasan ulasan_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ulasan
    ADD CONSTRAINT ulasan_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pemesanan(order_id) ON DELETE RESTRICT;


--
-- Name: ulasan ulasan_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ulasan
    ADD CONSTRAINT ulasan_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE RESTRICT;


--
-- Name: ulasan ulasan_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ulasan
    ADD CONSTRAINT ulasan_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id) ON DELETE RESTRICT;


--
-- Name: vendor vendor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE RESTRICT;


--
-- Name: wishlist wishlist_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(item_id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.pengguna(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict cQeZBiie1oa2tIX7qSbZ2aRb0gjlnAWDfYqDBMUpdsLzWVtoEVDpDXAeeu9MeSD

