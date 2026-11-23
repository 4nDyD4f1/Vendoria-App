import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUpDown, Eye, ImagePlus, Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { money, shortDate } from './vendorData';
import { useWorkspaceResource } from '../shared/workspaceResource';
import { BackLink, EmptyState, Modal, PageHeading, Pagination, Status } from './VendorUi';

function Value({ field, value }) {
  if (field === 'status') return <Status>{value}</Status>;
  if (['price', 'total', 'amount'].includes(field)) return <span className="v-number">{money(value)}</span>;
  if (['date', 'start', 'end'].includes(field)) return shortDate(value);
  return value || value === 0 ? String(value) : '—';
}

function RecordList({ resourceKey, records, onDelete }) {
  const { resource, base } = useWorkspaceResource(resourceKey);
  const RecordIcon = resource.icon || Package;
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [size, setSize] = useState(5);
  const [requestedPage, setPage] = useState(1);
  const [sort, setSort] = useState({ key: '', direction: 1 });
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const filtered = records.filter(record => (!keyword || Object.values(record).some(value => String(value).toLowerCase().includes(keyword.toLowerCase()))) && (!status || record.status === status) && (!category || record.category === category));
  const sorted = [...filtered].sort((a, b) => !sort.key ? 0 : sort.direction * (typeof a[sort.key] === 'number' ? a[sort.key] - b[sort.key] : String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), 'id')));
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(sorted.length / size)));
  const shown = sorted.slice((page - 1) * size, page * size);
  const statuses = resource.fields.find(field => field.key === 'status').options;
  const toggle = id => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const clearFilters = () => { setKeyword(''); setStatus(''); setCategory(''); setPage(1); };
  const selectedIds = selected.filter(id => records.some(record => record.id === id));

  return <>
    <PageHeading title={resource.title} description={resource.description}><Link to={`${base}/tambah`} className="v-button v-button-primary"><Plus size={17} />Tambah {resource.singular}</Link></PageHeading>
    {resourceKey === 'payouts' && <div className="v-inline-stats"><div><span>Total pencairan selesai</span><strong>{money(records.filter(record => record.status === 'Selesai').reduce((sum, record) => sum + Number(record.amount), 0))}</strong></div><div><span>Dalam proses</span><strong>{money(records.filter(record => ['Diajukan', 'Diproses'].includes(record.status)).reduce((sum, record) => sum + Number(record.amount), 0))}</strong></div><div><span>Rekening tujuan</span><strong>{new Set(records.map(record => record.bank)).size} bank</strong></div></div>}
    <section className="v-card v-records-card" aria-label={`Daftar ${resource.singular}`}>
      <div className="v-table-toolbar"><div className="v-search-field"><Search size={17} /><input aria-label={`Cari ${resource.singular}`} placeholder={`Cari ${resource.singular}…`} value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1); }} />{keyword && <button className="v-search-clear" type="button" aria-label="Hapus pencarian" onClick={() => { setKeyword(''); setPage(1); }}><X size={15} /></button>}</div><div className="v-table-filters">{resourceKey === 'catalog' && <select aria-label="Filter kategori" value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">Semua kategori</option>{resource.fields.find(field => field.key === 'category').options.map(value => <option key={value}>{value}</option>)}</select>}<select aria-label="Filter status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></div></div>
      {selectedIds.length > 0 && <div className="v-selection-bar"><span>{selectedIds.length} data dipilih</span><button className="v-text-danger" type="button" onClick={() => setDeleting(selectedIds)}><Trash2 size={15} />Hapus pilihan</button><button className="v-text-button" type="button" onClick={() => setSelected([])}>Batalkan</button></div>}
      <div className="v-table-scroll" tabIndex={0} role="region" aria-label={`Tabel ${resource.title}`}><table className="v-table"><caption className="v-sr-only">Daftar {resource.singular}{resource.live ? '' : ', data contoh frontend'}</caption><thead><tr><th className="v-checkbox-cell"><input type="checkbox" aria-label="Pilih semua data di halaman ini" checked={shown.length > 0 && shown.every(record => selectedIds.includes(record.id))} onChange={event => setSelected(current => event.target.checked ? [...new Set([...current, ...shown.map(record => record.id)])] : current.filter(id => !shown.some(record => record.id === id)))} /></th>{resource.columns.map(([key, title]) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => setSort(current => ({ key, direction: current.key === key ? -current.direction : 1 }))}>{title}{sort.key === key ? <ArrowDown size={13} style={{ transform: sort.direction === -1 ? 'rotate(180deg)' : undefined }} /> : <ArrowUpDown size={12} />}</button></th>)}<th scope="col" className="v-actions-cell">Aksi</th></tr></thead><tbody>{shown.map(record => <tr key={record.id} className={selectedIds.includes(record.id) ? 'is-selected' : ''}><td className="v-checkbox-cell"><input type="checkbox" aria-label={`Pilih ${record.name || record.id}`} checked={selectedIds.includes(record.id)} onChange={() => toggle(record.id)} /></td>{resource.columns.map(([key]) => <td key={key}>{key === 'name' ? <div className="v-product-cell">{record.image ? <img src={record.image} alt="" /> : <span className="v-product-placeholder"><RecordIcon size={20} /></span>}<div><Link to={`${base}/${record.id}`}>{record.name}</Link><small>{record.id}</small></div></div> : key === 'id' ? <Link className="v-record-id" to={`${base}/${record.id}`}>{record.id}</Link> : <Value field={key} value={record[key]} />}</td>)}<td><div className="v-row-actions"><Link className="v-icon-button" to={`${base}/${record.id}`} aria-label={`Lihat ${record.name || record.id}`} title="Lihat detail"><Eye size={16} /></Link><Link className="v-icon-button" to={`${base}/${record.id}/edit`} aria-label={`Edit ${record.name || record.id}`} title="Edit"><Pencil size={15} /></Link><button className="v-icon-button v-delete-button" type="button" aria-label={`Hapus ${record.name || record.id}`} title="Hapus" onClick={() => setDeleting([record.id])}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
      {!shown.length && <EmptyState title={records.length ? 'Tidak ada hasil yang cocok' : `Belum ada ${resource.singular}`} description={records.length ? 'Coba kata kunci lain atau sesuaikan filter Anda.' : `Tambahkan ${resource.singular} pertama untuk memulai.`}>{records.length ? <button className="v-button v-button-secondary" type="button" onClick={clearFilters}>Reset filter</button> : <Link className="v-button v-button-primary" to={`${base}/tambah`}><Plus size={16} />Tambah {resource.singular}</Link>}</EmptyState>}
      <Pagination count={filtered.length} page={page} onPage={setPage} size={size} onSize={value => { setSize(value); setPage(1); }} />
    </section>
    {deleting && <Modal title={`Hapus ${resource.singular}?`} onClose={() => setDeleting(null)} narrow><p className="v-modal-copy">{deleting.length === 1 ? records.find(record => record.id === deleting[0])?.name || deleting[0] : `${deleting.length} data terpilih`} {resource.live ? 'akan dihapus permanen dari database.' : 'akan dihapus dari data contoh. Muat ulang halaman untuk mengembalikannya.'}</p><div className="v-modal-actions"><button className="v-button v-button-secondary" type="button" onClick={() => setDeleting(null)}>Batal</button><button className="v-button v-button-danger" type="button" onClick={() => { onDelete(resourceKey, deleting); setSelected([]); setDeleting(null); }}><Trash2 size={16} />Ya, hapus</button></div></Modal>}
  </>;
}

function RecordForm({ resourceKey, record, onSave, onUpload }) {
  const { resource, base } = useWorkspaceResource(resourceKey);
  const [values, setValues] = useState(() => Object.fromEntries(resource.fields.map(field => [field.key, record?.[field.key] ?? (field.type === 'select' ? field.options[0] : '')])));
  const [image, setImage] = useState(record?.image || '');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const submit = async event => {
    event.preventDefault();
    const nextErrors = {};
    resource.fields.forEach(field => {
      const value = String(values[field.key]).trim();
      // field.secret (kata sandi): wajib saat menambah, boleh kosong saat mengedit (= tidak diubah)
      if (!(field.optional || (field.secret && record)) && !value) nextErrors[field.key] = `${field.label} wajib diisi.`;
      else if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < field.min || !Number.isInteger(Number(value)))) nextErrors[field.key] = `Masukkan angka bulat minimal ${field.min}.`;
    });
    if (values.start && values.end && values.end < values.start) nextErrors.end = 'Tanggal selesai harus sama atau setelah tanggal mulai.';
    if (errors.image) nextErrors.image = errors.image;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { document.getElementById(`vendor-${Object.keys(nextErrors)[0]}`)?.focus(); return; }
    const data = Object.fromEntries(resource.fields.map(field => [field.key, field.type === 'number' ? Number(values[field.key]) : field.secret ? values[field.key] : String(values[field.key]).trim()]));
    try { await onSave(resourceKey, { ...record, ...data, ...(resourceKey === 'catalog' ? { image } : {}) }); }
    catch (error) { // onSave async (data dari server) menolak: tampilkan di field terkait, atau di field pertama bila bukan error per-field
      const serverErrors = Object.keys(error.errors ?? {}).length ? error.errors : { [resource.fields[0].key]: error.message };
      setErrors(serverErrors);
      document.getElementById(`vendor-${Object.keys(serverErrors)[0]}`)?.focus();
      return;
    }
    navigate(base);
  };
  return <><BackLink to={base}>Kembali ke {resource.title.toLowerCase()}</BackLink><PageHeading title={`${record ? 'Edit' : 'Tambah'} ${resource.singular}`} description={record ? `Perbarui informasi ${record.id}.` : `Lengkapi informasi ${resource.singular} di bawah ini.`} /><form className="v-editor-layout" onSubmit={submit} noValidate><section className="v-card v-editor-main"><div className="v-section-heading"><h2>Informasi {resource.singular}</h2><p>Kolom bertanda <span aria-hidden="true">*</span> wajib diisi.</p></div><div className="v-form-grid">{resource.fields.map(field => <div className={`v-field${field.type === 'textarea' ? ' v-field-wide' : ''}`} key={field.key}><label htmlFor={`vendor-${field.key}`}>{field.label}{!field.optional && <span className="v-required" aria-hidden="true"> *</span>}</label>{field.type === 'select' ? <select id={`vendor-${field.key}`} required={!field.optional} value={values[field.key]} onChange={event => { setValues(current => ({ ...current, [field.key]: event.target.value })); setErrors(current => ({ ...current, [field.key]: '' })); }}><option value="" disabled>Pilih {field.label.toLowerCase()}</option>{field.options.map(option => <option key={option}>{option}</option>)}</select> : field.type === 'textarea' ? <textarea id={`vendor-${field.key}`} rows={4} value={values[field.key]} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} placeholder="Tambahkan informasi yang diperlukan…" /> : <input id={`vendor-${field.key}`} type={field.type} min={field.min} step={field.type === 'number' ? 1 : undefined} required={!field.optional} value={values[field.key]} aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `vendor-error-${field.key}` : undefined} onChange={event => { setValues(current => ({ ...current, [field.key]: event.target.value })); setErrors(current => ({ ...current, [field.key]: '' })); }} autoComplete={field.secret ? 'new-password' : undefined} placeholder={field.type === 'text' ? `Masukkan ${field.label.toLowerCase()}` : field.secret && record ? 'Kosongkan bila tidak diubah' : undefined} />}{errors[field.key] && <p className="v-field-error" id={`vendor-error-${field.key}`}>{errors[field.key]}</p>}</div>)}</div><div className="v-form-actions"><Link to={base} className="v-button v-button-secondary">Batal</Link><button className="v-button v-button-primary" type="submit">{record ? 'Simpan perubahan' : `Tambahkan ${resource.singular}`}</button></div></section><aside className="v-editor-aside">{resourceKey === 'catalog' && <section className="v-card v-upload-card"><h2>Foto alat</h2>{image ? <img className="v-upload-preview" src={image} alt="Pratinjau foto alat" /> : <div className="v-upload-placeholder"><ImagePlus size={32} strokeWidth={1.3} /><span>Tambahkan foto perlengkapan</span></div>}<label className="v-button v-button-secondary v-file-label"><ImagePlus size={16} />{image ? 'Ganti foto' : 'Pilih foto'}<input className="v-sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setErrors(current => ({ ...current, image: 'Gunakan JPG, PNG, atau WebP maksimal 5 MB.' })); return; }
      setErrors(current => ({ ...current, image: '' })); setImage(onUpload(file));
    }} /></label><p>JPG, PNG, atau WebP. Maksimal 5 MB.</p>{errors.image && <p className="v-field-error">{errors.image}</p>}</section>}<section className="v-editor-note">{resource.live ? <><h3>Tersimpan di database</h3><p>Perubahan langsung berlaku dan tidak dapat dibatalkan dengan memuat ulang halaman.</p></> : <><h3>Pratinjau frontend</h3><p>Perubahan hanya berlaku pada data contoh selama workspace ini terbuka.</p></>}</section></aside></form></>;
}

function RecordDetail({ resourceKey, record }) {
  const { resource, base, renderActions } = useWorkspaceResource(resourceKey);
  return <><BackLink to={base}>Kembali ke {resource.title.toLowerCase()}</BackLink><PageHeading eyebrow={record.id} title={record.name || `Detail ${resource.singular}`} description={resourceKey === 'catalog' ? record.category : undefined}><Link className="v-button v-button-primary" to={`${base}/${record.id}/edit`}><Pencil size={16} />Edit {resource.singular}</Link>{renderActions?.(resourceKey, record)}</PageHeading><div className={`v-detail-layout${resourceKey !== 'catalog' ? ' v-detail-single' : ''}`}>{resourceKey === 'catalog' && <section className="v-card v-detail-image">{record.image ? <img src={record.image} alt={record.name} /> : <Package size={64} strokeWidth={1} />}</section>}<section className="v-card v-detail-card"><div className="v-section-heading"><h2>Informasi {resource.singular}</h2><Status>{record.status}</Status></div><dl>{resource.fields.filter(field => field.key !== 'status' && !field.secret).map(field => <div key={field.key}><dt>{field.label}</dt><dd><Value field={field.key} value={record[field.key]} /></dd></div>)}</dl></section></div></>;
}

export default function VendorResource({ resourceKey, segments, data, onSave, onDelete, onUpload }) {
  const { resource, base } = useWorkspaceResource(resourceKey);
  const records = data[resourceKey];
  if (!segments[1]) return <RecordList resourceKey={resourceKey} records={records} onDelete={onDelete} />;
  if (segments[1] === 'tambah') return <RecordForm key="new" resourceKey={resourceKey} onSave={onSave} onUpload={onUpload} />;
  const record = records.find(item => item.id === segments[1]);
  if (!record) return <><PageHeading title="Data tidak ditemukan" /><section className="v-card"><EmptyState title={`${resource.singular[0].toUpperCase() + resource.singular.slice(1)} tidak tersedia`} description="Data mungkin telah dihapus dari pratinjau atau alamatnya tidak sesuai."><Link className="v-button v-button-primary" to={base}>Kembali ke daftar</Link></EmptyState></section></>;
  if (segments[2] === 'edit') return <RecordForm key={record.id} resourceKey={resourceKey} record={record} onSave={onSave} onUpload={onUpload} />;
  return <RecordDetail resourceKey={resourceKey} record={record} />;
}
