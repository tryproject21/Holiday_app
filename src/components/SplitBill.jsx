import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Users, Plus, Pencil, Trash2, X, ArrowRight } from 'lucide-react';

const emptyForm = { description: '', amount: '', paidBy: '', splitType: 'equal', splitAmong: [], customAmounts: {} };

function SplitBill() {
  const { trip, splitBills, addTransaction, updateTransaction, deleteTransaction, calculateDebts } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const debts = calculateDebts();

  const openAdd = () => {
    setForm({ ...emptyForm, paidBy: trip.members[0] || '', splitAmong: [...trip.members] });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (bill) => {
    setForm({
      description: bill.note || bill.description || '',
      amount: bill.amount,
      paidBy: bill.paidBy,
      splitType: bill.splitType,
      splitAmong: bill.splitAmong || [...trip.members],
      customAmounts: bill.customAmounts || {},
    });
    setEditingId(bill.id);
    setShowModal(true);
  };

  const handleToggleMember = (name) => {
    setForm(prev => {
      const isSelected = prev.splitAmong.includes(name);
      const newSplitAmong = isSelected
        ? prev.splitAmong.filter(m => m !== name)
        : [...prev.splitAmong, name];
      return { ...prev, splitAmong: newSplitAmong };
    });
  };

  const handleCustomAmount = (name, value) => {
    setForm(prev => ({
      ...prev,
      customAmounts: { ...prev.customAmounts, [name]: value },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.paidBy || form.splitAmong.length === 0) return;

    const billData = {
      type: 'expense',
      category: 'Split Bill',
      date: new Date().toISOString().split('T')[0],
      note: form.description,
      amount: Number(form.amount),
      paidBy: form.paidBy,
      isSplit: true,
      splitType: form.splitType,
      splitAmong: form.splitAmong,
      customAmounts: form.splitType === 'custom' ? form.customAmounts : {},
    };

    if (editingId) {
      updateTransaction(editingId, billData);
    } else {
      addTransaction(billData);
    }
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus tagihan ini?')) {
      deleteTransaction(id);
    }
  };

  const perPersonAmount = form.splitAmong.length > 0 && form.amount
    ? Number(form.amount) / form.splitAmong.length
    : 0;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title"><Users size={22} /> Split Bill</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Tagihan</button>
      </div>

      {/* Debt summary */}
      {debts.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: '1rem' }}>💸 Ringkasan Hutang</h3>
          <div className="debt-grid">
            {debts.map((d, i) => (
              <div key={i} className="debt-card">
                <span className="debt-from">{d.from}</span>
                <ArrowRight size={16} className="debt-arrow" />
                <span className="debt-to">{d.to}</span>
                <span className="debt-amount">{formatRp(d.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bills list */}
      {splitBills.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>Belum ada tagihan untuk dibagi.</p>
          <p>Klik <strong>Tambah Tagihan</strong> untuk membagi biaya bersama.</p>
        </div>
      ) : (
        <div className="bills-list">
          {splitBills.map((bill) => (
            <div key={bill.id} className="bill-item">
              <div className="bill-info">
                <div className="bill-title">{bill.note || bill.description}</div>
                <div className="bill-meta">
                  Dibayar oleh <strong>{bill.paidBy}</strong> • {bill.splitType === 'equal' ? 'Bagi rata' : 'Kustom'} ke {bill.splitAmong?.join(', ')}
                </div>
              </div>
              <div className="bill-right">
                <span className="bill-amount">{formatRp(bill.amount)}</span>
                <div className="flex gap-2">
                  <button className="btn-icon" onClick={() => openEdit(bill)} title="Edit"><Pencil size={14} /></button>
                  <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(bill.id)} title="Hapus"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Tagihan' : 'Tambah Tagihan'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Deskripsi *</label>
                <input type="text" className="form-input" placeholder="Contoh: Makan siang" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Total Nominal (Rp) *</label>
                <input type="number" className="form-input" placeholder="200000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" required />
              </div>
              <div className="form-group">
                <label className="form-label">Dibayar oleh *</label>
                <select className="form-input" value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} required>
                  {trip.members.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Metode Pembagian</label>
                <div className="toggle-row">
                  <button type="button" className={`toggle-btn ${form.splitType === 'equal' ? 'toggle-active-primary' : ''}`} onClick={() => setForm({ ...form, splitType: 'equal' })}>
                    Bagi Rata
                  </button>
                  <button type="button" className={`toggle-btn ${form.splitType === 'custom' ? 'toggle-active-primary' : ''}`} onClick={() => setForm({ ...form, splitType: 'custom' })}>
                    Kustom
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Dibagi kepada</label>
                <div className="member-select-grid">
                  {trip.members.map(m => (
                    <label key={m} className={`member-select-item ${form.splitAmong.includes(m) ? 'member-selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.splitAmong.includes(m)}
                        onChange={() => handleToggleMember(m)}
                        style={{ display: 'none' }}
                      />
                      <span>{m}</span>
                      {form.splitType === 'equal' && form.splitAmong.includes(m) && form.amount && (
                        <span className="split-preview">{formatRp(perPersonAmount)}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              {form.splitType === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Nominal per orang</label>
                  {form.splitAmong.map(m => (
                    <div key={m} className="custom-split-row">
                      <span>{m}</span>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={form.customAmounts[m] || ''}
                        onChange={(e) => handleCustomAmount(m, e.target.value)}
                        style={{ width: '160px' }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}>
                {editingId ? 'Simpan Perubahan' : 'Tambah Tagihan'}
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

export default SplitBill;
