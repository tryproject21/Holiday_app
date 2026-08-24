import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Pencil, Trash2, X, CheckSquare, ListPlus } from 'lucide-react';

const CATEGORIES = ['Dokumen & Tiket', 'Pakaian', 'Elektronik', 'Kesehatan & P3K', 'Lainnya'];

function Checklist() {
  const { checklistItems, addChecklistItem, toggleChecklistItem, updateChecklistItem, deleteChecklistItem } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Lainnya');

  const openAdd = () => {
    setInputText('');
    setSelectedCategory('Lainnya');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setInputText(item.text);
    setSelectedCategory(item.category || 'Lainnya');
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (editingId) {
      updateChecklistItem(editingId, inputText.trim(), selectedCategory);
    } else {
      addChecklistItem(inputText.trim(), selectedCategory);
    }
    setShowModal(false);
    setInputText('');
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus item ini?')) {
      deleteChecklistItem(id);
    }
  };

  const doneCount = checklistItems.filter(i => i.done).length;
  const totalCount = checklistItems.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  // Group items by category
  const groupedItems = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = checklistItems.filter(i => (i.category || 'Lainnya') === cat);
    return acc;
  }, {});

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title"><CheckSquare size={22} /> Checklist Persiapan</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Item</button>
      </div>

      {totalCount > 0 && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>Progress persiapan</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{doneCount}/{totalCount}</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, backgroundColor: 'var(--color-success)' }} />
          </div>
        </div>
      )}

      {checklistItems.length === 0 ? (
        <div className="empty-state">
          <CheckSquare size={48} />
          <p>Belum ada item checklist.</p>
          <p>Klik <strong>Tambah Item</strong> untuk membuat daftar persiapan.</p>
        </div>
      ) : (
        <div className="checklist-grouped">
          {CATEGORIES.map(category => {
            const items = groupedItems[category];
            if (items.length === 0) return null;
            
            return (
              <div key={category} style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h4 style={{ 
                  fontSize: '0.9rem', color: 'var(--color-primary)', 
                  borderBottom: '1px solid var(--color-primary-lighter)', 
                  paddingBottom: '4px', marginBottom: '12px',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <ListPlus size={16} /> {category}
                </h4>
                
                <div className="checklist-list" style={{ marginLeft: '4px' }}>
                  {items.map((item) => (
                    <div key={item.id} className={`checklist-item ${item.done ? 'checklist-done' : ''}`} style={{ marginBottom: '8px' }}>
                      <label className="checklist-label" style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="checklist-checkbox"
                        />
                        <span className={`checklist-text ${item.done ? 'checklist-text-done' : ''}`}>
                          {item.text}
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <button className="btn-icon" onClick={() => openEdit(item)} title="Edit"><Pencil size={14} /></button>
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(item.id)} title="Hapus"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Item' : 'Tambah Item'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Kategori *</label>
                <select className="form-input" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nama item *</label>
                <input type="text" className="form-input" placeholder="Misalnya: Paspor & KTP" value={inputText} onChange={(e) => setInputText(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}>
                {editingId ? 'Simpan Perubahan' : 'Tambah Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checklist;
