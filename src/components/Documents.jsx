import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Folder, Plus, Trash2, Link as LinkIcon, FileImage, FileText, X } from 'lucide-react';

const emptyForm = { title: '', type: 'tiket', link: '', image: null };

function Documents() {
  const { documents, addDocument, deleteDocument } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 500 * 1024) {
      alert('Ukuran file terlalu besar! Maksimal 500KB untuk menghemat penyimpanan browser.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    if (!form.link && !form.image) {
      alert('Mohon masukkan Link atau Unggah Gambar!');
      return;
    }

    addDocument(form);
    setShowModal(false);
    setForm(emptyForm);
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus dokumen ini?')) {
      deleteDocument(id);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'tiket': return <FileText size={20} color="var(--color-primary)" />;
      case 'voucher': return <FileText size={20} color="var(--color-warning)" />;
      case 'identitas': return <FileImage size={20} color="var(--color-success)" />;
      default: return <FileText size={20} />;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title"><Folder size={22} /> Dompet Dokumen</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Tambah</button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <Folder size={48} />
          <p>Belum ada dokumen.</p>
          <p>Simpan tiket penerbangan, voucher hotel, atau catatan penting di sini.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
          {documents.map((doc) => (
            <div key={doc.id} style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
              <button 
                className="btn-icon btn-icon-danger" 
                style={{ position: 'absolute', top: '8px', right: '8px' }}
                onClick={() => handleDelete(doc.id)}
                title="Hapus"
              >
                <Trash2 size={16} />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getIcon(doc.type)}
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--color-text-light)' }}>
                  {doc.type}
                </span>
              </div>
              
              <h3 style={{ margin: '4px 0', fontSize: '1.1rem' }}>{doc.title}</h3>

              {doc.image && (
                <div style={{ width: '100%', height: '100px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => window.open(doc.image, '_blank')}>
                  <img src={doc.image} alt={doc.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {doc.link && (
                <a href={doc.link} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', gap: '4px' }}>
                  <LinkIcon size={14} /> Buka Tautan
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Dokumen</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            
            <div className="alert-info" style={{ backgroundColor: 'var(--color-primary-lighter)', color: 'var(--color-primary)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <strong>Tips:</strong> Untuk menghemat penyimpanan browser, lebih disarankan menaruh Link ke Google Drive / Dropbox Anda daripada mengunggah gambar.
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Dokumen *</label>
                <input type="text" className="form-input" placeholder="Misal: Tiket Pesawat Jakarta-Bali" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              
              <div className="form-group">
                <label className="form-label">Jenis Dokumen</label>
                <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="tiket">Tiket Transportasi</option>
                  <option value="voucher">Voucher Akomodasi</option>
                  <option value="identitas">Identitas / Paspor</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Link (Google Drive/URL) - Disarankan</label>
                <input type="url" className="form-input" placeholder="https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">ATAU Unggah Gambar (Maks 500KB)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>
                    <FileImage size={16} /> Pilih Gambar
                  </button>
                  {form.image && <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>✓ Gambar siap</span>}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }}>
                Simpan Dokumen
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
