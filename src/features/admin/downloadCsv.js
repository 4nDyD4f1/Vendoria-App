// Awalan = + - @ dinetralkan agar Excel tidak menjalankan teks (mis. nama vendor) sebagai rumus.
const cell = value => { const text = value == null ? '' : String(value); return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`; };

export function downloadCsv(filename, rows) {
  const csv = '﻿' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
