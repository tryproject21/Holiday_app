import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Download, Pencil, Trash2, X, ReceiptText } from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv';

const CATEGORIES = ['Transportasi', 'Akomodasi', 'Konsumsi', 'Tiket Wisata', 'Lainnya', 'Split Bill'];
const emptyForm = { type: 'expense', category: 'Transportasi', amount: '', date: '', note: '', paidBy: '', isSplit: false };

function Ledger() {
  const { trip, transactions, addTransaction, updateTransaction, deleteTransaction } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => {
    setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0], paidBy: trip.members[0] || '' });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (t) => {
    setForm({ type: t.type, category: t.category, amount: t.amount, date: t.date, note: t.note, paidBy: t.paidBy || '', isSplit: t.isSplit || false });
    setEditingId(t.id);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.date) return;

    const payload = { ...form, amount: Number(form.amount) };
    if (form.isSplit && form.type === 'expense') {
      payload.splitType = payload.splitType || 'equal';
      payload.splitAmong = payload.splitAmong || trip.members;
    } else {
      payload.isSplit = false;
      payload.splitType = undefined;
      payload.splitAmong = undefined;
      payload.customAmounts = undefined;
    }

    if (editingId) {
      updateTransaction(editingId, payload);
    } else {
      addTransaction(payload);
    }
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus transaksi ini?')) {
      deleteTransaction(id);
    }
  };

  const handleExport = () => {
    const dataToExport = transactions.map(t => ({
      Tanggal: t.date,
      Tipe: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Kategori: t.category,
      Pembayar: t.paidBy || '-',
      Catatan: t.note,
      Nominal: t.amount,
    }));
    exportToCsv('ledger_liburan.csv', dataToExport);
  };

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title"><ReceiptText size={22} /> Pencatatan Keuangan</h2>
        <div className="flex gap-2">
          {transactions.length > 0 && (
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={16} /> Export CSV
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah</button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <ReceiptText size={48} />
          <p>Belum ada transaksi tercatat.</p>
          <p>Klik <strong>Tambah</strong> untuk mencatat pemasukan atau pengeluaran.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Pembayar</th>
                <th>Catatan</th>
                <th>Nominal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>
                    <span className={`badge ${t.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                      {t.type === 'income' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td>{t.category}</td>
                  <td>{t.paidBy || '-'}</td>
                  <td>{t.note || '-'}</td>
                  <td style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {t.type === 'income' ? '+' : '-'}{formatRp(t.amount)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-icon" onClick={() => openEdit(t)} title="Edit"><Pencil size={14} /></button>
                      <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(t.id)} title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tipe</label>
                <div className="toggle-row">
                  <button type="button" className={`toggle-btn ${form.type === 'expense' ? 'toggle-active-danger' : ''}`} onClick={() => setForm({ ...form, type: 'expense' })}>
                    Pengeluaran
                  </button>
                  <button type="button" className={`toggle-btn ${form.type === 'income' ? 'toggle-active-success' : ''}`} onClick={() => setForm({ ...form, type: 'income' })}>
                    Pemasukan
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal *</label>
                <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  {form.type === 'income' && <option value="Patungan">Patungan</option>}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nominal (Rp) *</label>
                <input type="number" className="form-input" placeholder="500000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" required />
              </div>
              <div className="form-group">
                <label className="form-label">Dibayar oleh</label>
                <select className="form-input" value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}>
                  <option value="">— Pilih —</option>
                  {trip.members.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {form.type === 'expense' && (
                <div className="form-group">
                  <label className="form-label">Beban Biaya</label>
                  <select className="form-input" value={form.isSplit ? 'split' : 'personal'} onChange={(e) => setForm({ ...form, isSplit: e.target.value === 'split' })}>
                    <option value="personal">Pribadi / Tidak Split</option>
                    <option value="split">Split Bill (Bagi Rata ke Semua)</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Catatan</label>
                <input type="text" className="form-input" placeholder="Misalnya: Tiket kereta" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}>
                {editingId ? 'Simpan Perubahan' : 'Tambah Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRp(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

export default Ledger;
