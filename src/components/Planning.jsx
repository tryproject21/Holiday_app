import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Lightbulb, Plus, Trash2, CheckCircle2, Circle, X } from 'lucide-react';

const CATEGORIES = ['Akomodasi', 'Transportasi Lokal', 'Transportasi Utama', 'Aktivitas', 'Lainnya'];

function Planning() {
  const { plans, addPlan, deletePlan, addPlanOption, deletePlanOption, selectPlanOption } = useAppContext();
  
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ title: '', category: 'Akomodasi' });
  
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [activePlanId, setActivePlanId] = useState(null);
  const [optionForm, setOptionForm] = useState({ name: '', price: '', note: '' });

  const handleAddPlan = (e) => {
    e.preventDefault();
    if (!planForm.title) return;
    addPlan(planForm);
    setShowPlanModal(false);
    setPlanForm({ title: '', category: 'Akomodasi' });
  };

  const handleAddOption = (e) => {
    e.preventDefault();
    if (!optionForm.name || !optionForm.price) return;
    addPlanOption(activePlanId, {
      name: optionForm.name,
      price: Number(optionForm.price),
      note: optionForm.note,
    });
    setShowOptionModal(false);
    setOptionForm({ name: '', price: '', note: '' });
    setActivePlanId(null);
  };

  const openOptionModal = (planId) => {
    setActivePlanId(planId);
    setOptionForm({ name: '', price: '', note: '' });
    setShowOptionModal(true);
  };

  return (
    <div className="card fade-in">
      <div className="card-header">
        <h2 className="card-title"><Lightbulb size={22} /> Papan Perencanaan</h2>
        <button className="btn btn-primary" onClick={() => setShowPlanModal(true)}>
          <Plus size={16} /> Rencana Baru
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <Lightbulb size={48} />
          <p>Belum ada rencana atau perbandingan opsi.</p>
          <p>Klik <strong>Rencana Baru</strong> untuk mulai membandingkan hotel, kendaraan, dsb.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: 'var(--spacing-md)', background: 'var(--color-background)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px' }}>{plan.title}</h3>
                  <span className="badge badge-primary">{plan.category}</span>
                </div>
                <button className="btn-icon btn-icon-danger" onClick={() => { if(window.confirm('Hapus rencana ini?')) deletePlan(plan.id); }}>
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="options-grid" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', marginBottom: '12px' }}>
                {plan.options.map(opt => (
                  <div key={opt.id} style={{ 
                    border: opt.isSelected ? '2px solid var(--color-success)' : '1px solid var(--color-border)', 
                    borderRadius: '8px', padding: '12px', position: 'relative',
                    background: opt.isSelected ? 'rgba(46, 204, 113, 0.05)' : 'var(--color-surface)' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '1.05rem' }}>{opt.name}</strong>
                      <button className="btn-icon" style={{ padding: 0 }} onClick={() => selectPlanOption(plan.id, opt.id)}>
                        {opt.isSelected ? <CheckCircle2 size={20} color="var(--color-success)" /> : <Circle size={20} color="var(--color-text-light)" />}
                      </button>
                    </div>
                    <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', margin: '4px 0' }}>
                      {formatRp(opt.price)}
                    </div>
                    {opt.note && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>{opt.note}</div>}
                    <button 
                      className="btn-icon btn-icon-danger" 
                      style={{ position: 'absolute', bottom: '8px', right: '8px', padding: '4px' }}
                      onClick={() => { if(window.confirm('Hapus opsi ini?')) deletePlanOption(plan.id, opt.id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={() => openOptionModal(plan.id)}>
                <Plus size={14} /> Tambah Opsi / Alternatif
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Rencana */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Rencana Baru</h3>
              <button className="btn-icon" onClick={() => setShowPlanModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddPlan}>
              <div className="form-group">
                <label className="form-label">Judul Rencana</label>
                <input type="text" className="form-input" placeholder="Contoh: Pilihan Hotel di Bali" value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-input" value={planForm.category} onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>Buat Rencana</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Opsi */}
      {showOptionModal && (
        <div className="modal-overlay" onClick={() => setShowOptionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Pilihan Alternatif</h3>
              <button className="btn-icon" onClick={() => setShowOptionModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddOption}>
              <div className="form-group">
                <label className="form-label">Nama Opsi</label>
                <input type="text" className="form-input" placeholder="Contoh: Hotel Hilton" value={optionForm.name} onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Perkiraan Harga (Rp)</label>
                <input type="number" className="form-input" placeholder="1500000" value={optionForm.price} onChange={(e) => setOptionForm({ ...optionForm, price: e.target.value })} min="0" required />
              </div>
              <div className="form-group">
                <label className="form-label">Catatan Tambahan / Link</label>
                <textarea className="form-input" placeholder="Lokasi strategis, free breakfast" value={optionForm.note} onChange={(e) => setOptionForm({ ...optionForm, note: e.target.value })} rows="3"></textarea>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>Simpan Opsi</button>
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

export default Planning;
