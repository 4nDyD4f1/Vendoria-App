// Backend dipanggil lewat proxy Vite (/api -> localhost:8080), jadi same-origin dan cookie sesi ikut otomatis.
// Isi VITE_API_URL hanya bila frontend & backend beda origin (backend sudah mengizinkan credentials via CORS).
const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Terjadi kesalahan. Coba lagi.');
    this.status = status;
    this.errors = body?.errors ?? {}; // { field: pesan } untuk 400 validasi
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
