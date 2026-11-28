import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import SlidingTabs from '../interface/SlidingTabs';
import { BackLink, EmptyState, PageHeading, Pagination } from './VendorUi';
import { money } from './vendorData';
import OrderProcessModal, { OrderDetailSections, OrderStatusBadge } from './OrderProcessModal';
import {
  formatOrderDate,
  formatOrderDateTime,
  getVendorOrder,
  listVendorOrders,
  orderStatusFilters,
  orderStatusLabels,
  setupOrdersVendor,
} from './vendorOrdersApi';
import './vendor-orders.css';
import Skeleton from '../../components/Skeleton';

function OrderDetailPage({ orderId, notify, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const lifecycle = new AbortController();
    getVendorOrder(orderId)
      .then(value => { if (!lifecycle.signal.aborted) { setDetail(value); setError(''); } })
      .catch(reason => { if (!lifecycle.signal.aborted) setError(reason.message); });
    return () => lifecycle.abort();
  }, [orderId, refresh]);

  if (error) {
    return <>
      <BackLink to="/vendor/pesanan">Kembali ke pesanan</BackLink>
      <PageHeading title="Detail pesanan" />
      <section className="v-card v-detail-card">
        <EmptyState title="Pesanan tidak tersedia" description={error}>
          <Link className="v-button v-button-primary" to="/vendor/pesanan">Kembali ke daftar pesanan</Link>
        </EmptyState>
      </section>
    </>;
  }

  if (!detail) return <Skeleton variant="detail" label="Memuat detail pesanan…" />;

  return <div className="vendor-orders">
    <BackLink to="/vendor/pesanan">Kembali ke pesanan</BackLink>
    <PageHeading eyebrow={detail.order.kode_pemesanan} title={`Pesanan ${detail.order.kode_pemesanan}`} description={`Pelanggan: ${detail.order.customer_name}`}>
      <button type="button" className="v-button v-button-primary" onClick={() => setProcessing(true)}>Proses</button>
    </PageHeading>
    <section className="v-card v-detail-card vendor-orders-detail-page">
      <OrderDetailSections detail={detail} />
    </section>
    {processing && <OrderProcessModal
      orderId={orderId}
      onClose={() => setProcessing(false)}
      onCompleted={(updated, action) => {
        setProcessing(false);
        setDetail(updated);
        setRefresh(value => value + 1);
        onUpdated?.();
        notify(action === 'batalkan'
          ? `Pesanan ${updated.order.kode_pemesanan} berhasil dibatalkan.`
          : `Pesanan ${updated.order.kode_pemesanan} diperbarui menjadi ${orderStatusLabels[updated.order.status_pesanan]}.`);
      }}
    />}
  </div>;
}

export default function VendorOrdersPage({ segments, onLoaded, notify }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('semua');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [loaded, setLoaded] = useState({ key: null, result: null, error: '' });
  const [refresh, setRefresh] = useState(0);
  const [processingId, setProcessingId] = useState(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState('');

  const routeId = segments[1];
  const isList = !routeId;
  const requestKey = JSON.stringify([user.user_id, status, query, page, size, refresh]);
  const result = loaded.result;
  const loading = loaded.key !== requestKey;
  const error = loading ? '' : loaded.error;

  const reloadList = useCallback(() => setRefresh(value => value + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isList) return;
    const lifecycle = new AbortController();
    listVendorOrders({ status, q: query, page, size })
      .then(value => {
        if (lifecycle.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(value.total / size));
        if (page > lastPage) { setPage(lastPage); return; }
        setLoaded({ key: requestKey, result: value, error: '' });
        onLoaded(value);
      })
      .catch(reason => {
        if (!lifecycle.signal.aborted) setLoaded({ key: requestKey, result: null, error: reason.message });
      });
    return () => lifecycle.abort();
  }, [isList, status, query, page, size, refresh, onLoaded, requestKey]);

  if (routeId && (segments[2] || routeId === 'tambah' || !/^[0-9]+$/.test(routeId))) {
    return <Navigate to="/vendor/pesanan" replace />;
  }
  if (routeId) {
    return <OrderDetailPage orderId={routeId} notify={notify} onUpdated={reloadList} />;
  }

  if (error && !result) {
    return <>
      <PageHeading eyebrow="PORTAL VENDOR" title="Pesanan" description="Kelola pesanan masuk dan proses status penyewaan pelanggan." />
      <section className="v-card v-settings-form" role="alert">
        <p>{error}</p>
        <button type="button" className="v-button v-button-secondary" onClick={reloadList}>Coba lagi</button>
      </section>
    </>;
  }

  if (!result) return <Skeleton variant="list" label="Memuat daftar pesanan…" />;

  if (!result.vendor) {
    return <>
      <PageHeading eyebrow="PORTAL VENDOR" title="Siapkan profil bisnis Anda" description="Isi nama bisnis sebelum mengelola pesanan pelanggan." />
      <form className="v-card v-settings-form" onSubmit={async event => {
        event.preventDefault();
        if (setupBusy) return;
        const name = new FormData(event.currentTarget).get('name').trim();
        setSetupBusy(true);
        setSetupError('');
        try {
          const value = await setupOrdersVendor(name);
          setLoaded({ key: requestKey, result: value, error: '' });
          onLoaded(value);
        } catch (reason) {
          setSetupError(reason.message);
        } finally {
          setSetupBusy(false);
        }
      }}>
        <div className="v-field">
          <label htmlFor="orders-business-name">Nama bisnis</label>
          <input id="orders-business-name" name="name" required maxLength={150} placeholder="Nama usaha penyewaan Anda" disabled={setupBusy} />
        </div>
        {setupError && <p className="v-field-error" role="alert">{setupError}</p>}
        <div className="v-form-actions">
          <button className="v-button v-button-primary" type="submit" disabled={setupBusy}>
            {setupBusy ? 'Menyimpan…' : 'Simpan dan lanjutkan'}
          </button>
        </div>
      </form>
    </>;
  }

  const tabs = orderStatusFilters.map(([key, label]) => ({
    key: `vendor-orders-${key}`,
    label: `${label} (${result.counts?.[key] ?? 0})`,
  }));

  return <div className="vendor-orders">
    <PageHeading
      eyebrow="PORTAL VENDOR"
      title="Pesanan"
      description="Pantau pesanan pelanggan, lihat detail penyewaan, dan proses atau batalkan pesanan."
    />

    <SlidingTabs
      tabs={tabs}
      active={orderStatusFilters.findIndex(([key]) => key === status)}
      onSelect={index => { setStatus(orderStatusFilters[index][0]); setPage(1); }}
      label="Filter status pesanan"
      className="vendor-orders-status-tabs"
    />

    <section
      className="v-card v-records-card"
      id={`vendor-orders-${status}-panel`}
      role="tabpanel"
      aria-labelledby={`vendor-orders-${status}-tab`}
      tabIndex={0}
    >
      <div className="vendor-orders-toolbar">
        <label>
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            maxLength={120}
            placeholder="Cari kode pesanan, pelanggan, lokasi, atau alat…"
            aria-label="Cari pesanan"
          />
        </label>
        <button type="button" className="v-button v-button-secondary" disabled={loading} onClick={reloadList}>
          <RefreshCw size={16} />
          Muat ulang
        </button>
      </div>

      {error ? <p className="vendor-orders-error vendor-orders-list-error" role="alert">{error}</p>
        : loading ? <Skeleton variant="list" label="Memuat pesanan…" />
          : !result.items.length ? <EmptyState
              title={query ? 'Tidak ada hasil yang cocok' : 'Belum ada pesanan'}
              description={query ? 'Coba kode pesanan, nama pelanggan, atau kata kunci lain.' : 'Pesanan dengan status ini akan muncul di sini.'}
            >
              {(query || status !== 'semua') && <button
                type="button"
                className="v-button v-button-secondary"
                onClick={() => { setSearch(''); setQuery(''); setStatus('semua'); setPage(1); }}
              >
                Reset filter
              </button>}
            </EmptyState>
            : <div className="v-table-scroll" tabIndex={0} role="region" aria-label="Tabel Pesanan">
                <table className="v-table">
                  <caption className="v-sr-only">Daftar pesanan vendor</caption>
                  <thead>
                    <tr>
                      <th scope="col">No. pesanan</th>
                      <th scope="col">Pelanggan</th>
                      <th scope="col">Perlengkapan</th>
                      <th scope="col">Tanggal sewa</th>
                      <th scope="col">Total sewa</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="v-actions-cell">Operasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map(record => <tr key={record.order_id}>
                      <td>
                        <Link className="v-record-id" to={`/vendor/pesanan/${record.order_id}`}>{record.kode_pemesanan}</Link>
                        <small className="vendor-orders-subtext">{formatOrderDateTime(record.tanggal_pemesanan)}</small>
                      </td>
                      <td>
                        <div className="v-stacked-cell">
                          <strong>{record.customer_name}</strong>
                          <small>{record.lokasi_acara || record.customer_email}</small>
                        </div>
                      </td>
                      <td>
                        <div className="v-stacked-cell">
                          <span>{record.equipment_summary || '—'}</span>
                          {record.item_count > 0 && <small>{record.item_count} unit</small>}
                        </div>
                      </td>
                      <td className="v-number">
                        {formatOrderDate(record.tanggal_mulai_sewa)} – {formatOrderDate(record.tanggal_selesai_sewa)}
                      </td>
                      <td className="v-number">{money(record.total_biaya_sewa)}</td>
                      <td><OrderStatusBadge status={record.status_pesanan} awaiting={record.awaiting_settlement} /></td>
                      <td>
                        <div className="v-row-actions vendor-orders-row-actions">
                          <Link
                            className="v-icon-button"
                            to={`/vendor/pesanan/${record.order_id}`}
                            aria-label={`Lihat detail ${record.kode_pemesanan}`}
                            title="Lihat detail"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            type="button"
                            className="v-button v-button-secondary vendor-orders-process-btn"
                            onClick={() => setProcessingId(String(record.order_id))}
                          >
                            Proses
                          </button>
                        </div>
                      </td>
                    </tr>)}
                  </tbody>
                </table>
              </div>}

      {!loading && !error && <Pagination
        count={result.total || 0}
        page={page}
        onPage={setPage}
        size={size}
        onSize={value => { setSize(value); setPage(1); }}
      />}
    </section>

    {processingId && <OrderProcessModal
      key={processingId}
      orderId={processingId}
      onClose={() => setProcessingId(null)}
      onCompleted={(updated, action) => {
        setProcessingId(null);
        reloadList();
        notify(action === 'batalkan'
          ? `Pesanan ${updated.order.kode_pemesanan} berhasil dibatalkan.`
          : `Pesanan ${updated.order.kode_pemesanan} diperbarui menjadi ${orderStatusLabels[updated.order.status_pesanan]}.`);
      }}
    />}
  </div>;
}
