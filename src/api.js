// Backend dipanggil lewat proxy Vite (/api -> localhost:8080), jadi same-origin dan cookie sesi ikut otomatis.
// Isi VITE_API_URL hanya bila frontend & backend beda origin (backend sudah mengizinkan credentials via CORS).
const BASE = import.meta.env.VITE_API_URL ?? '';
export const apiUrl = path => BASE + path;

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Terjadi kesalahan. Coba lagi.');
    this.status = status;
    this.errors = body?.errors ?? {}; // { field: pesan } untuk 400 validasi
  }
}

export async function api(path, { method = 'GET', body, headers } = {}) {
  const multipart = body instanceof FormData;
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: headers || body && !multipart ? { ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}), ...headers } : undefined,
      body: multipart ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
