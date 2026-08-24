import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MapPinned, UserPlus, Trash2, Plus } from 'lucide-react';

function TripSetup() {
  const { setupTrip } = useAppContext();
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState([]);

  const handleAddMember = () => {
    const name = memberName.trim();
    if (name && !members.includes(name)) {
      setMembers([...members, name]);
      setMemberName('');
    }
  };

  const handleRemoveMember = (name) => {
    setMembers(members.filter(m => m !== name));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMember();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tripName.trim() || !destination.trim() || !budget || members.length === 0) return;
    setupTrip(tripName.trim(), destination.trim(), budget, members);
  };

  return (
    <div className="setup-wrapper">
      <div className="setup-card">
        <div className="setup-header">
          <MapPinned size={48} color="#0077b6" />
          <h1>Liburan Kuy! 🏝️</h1>
          <p>Atur perjalanan liburan kamu bersama teman-teman</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Perjalanan</label>
            <input
              type="text"
              className="form-input"
              placeholder="Contoh: Liburan Bali 2026"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Destinasi (Kota/Negara)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Contoh: Bali, Indonesia"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Total Anggaran (Rp)</label>
            <input
              type="number"
              className="form-input"
              placeholder="Contoh: 10000000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Anggota Perjalanan</label>
            <div className="member-input-row">
              <input
                type="text"
                className="form-input"
                placeholder="Masukkan nama lalu tekan Enter"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button type="button" className="btn btn-primary" onClick={handleAddMember}>
                <UserPlus size={18} />
              </button>
            </div>

            {members.length > 0 && (
              <div className="member-tags">
                {members.map((m) => (
                  <span key={m} className="member-tag">
                    {m}
                    <button type="button" className="member-tag-remove" onClick={() => handleRemoveMember(m)}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {members.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: 'var(--spacing-xs)' }}>
                Minimal 1 anggota diperlukan untuk memulai.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary setup-submit"
            disabled={!tripName.trim() || !destination.trim() || !budget || members.length === 0}
          >
            <Plus size={18} /> Mulai Perjalanan
          </button>
        </form>
      </div>
    </div>
  );
}

export default TripSetup;
