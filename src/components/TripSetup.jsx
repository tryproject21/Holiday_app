import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { MapPinned, Loader, ArrowLeft, Copy, Check } from 'lucide-react';

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function TripSetup({ onCreated, onBack }) {
  const { profile } = useAuth();
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTrip, setCreatedTrip] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tripName.trim() || !destination.trim() || !budget) return;

    setLoading(true);
    setError('');

    try {
      const roomCode = generateRoomCode();

      // Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: tripName.trim(),
          destination: destination.trim(),
          budget: Number(budget),
          room_code: roomCode,
          created_by: profile.id,
        })
        .select()
        .single();

      if (tripError) {
        // Room code collision, try once more
        if (tripError.message.includes('unique')) {
          const retryCode = generateRoomCode();
          const { data: retryTrip, error: retryError } = await supabase
            .from('trips')
            .insert({
              name: tripName.trim(),
              destination: destination.trim(),
              budget: Number(budget),
              room_code: retryCode,
              created_by: profile.id,
            })
            .select()
            .single();
          if (retryError) throw retryError;
          // Add creator as owner member
          await supabase.from('trip_members').insert({
            trip_id: retryTrip.id,
            user_id: profile.id,
            display_name: profile.display_name,
            role: 'owner',
          });
          setCreatedTrip(retryTrip);
        } else {
          throw tripError;
        }
      } else {
        // Add creator as owner member
        const { error: memberError } = await supabase
          .from('trip_members')
          .insert({
            trip_id: trip.id,
            user_id: profile.id,
            display_name: profile.display_name,
            role: 'owner',
          });
        if (memberError) throw memberError;

        setCreatedTrip(trip);
      }
    } catch (err) {
      setError(err.message || 'Gagal membuat trip.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdTrip.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show success screen with room code
  if (createdTrip) {
    return (
      <div className="setup-wrapper">
        <div className="setup-card">
          <div className="setup-header">
            <MapPinned size={48} color="var(--color-success)" />
            <h1>Trip Berhasil Dibuat! 🎉</h1>
            <p>Bagikan Room Code ini ke teman-teman untuk bergabung</p>
          </div>

          <div className="room-code-display">
            <span className="room-code-label">Room Code</span>
            <div className="room-code-value">{createdTrip.room_code}</div>
            <button className="btn btn-outline" onClick={handleCopy}>
              {copied ? <><Check size={16} /> Tersalin!</> : <><Copy size={16} /> Salin Kode</>}
            </button>
          </div>

          <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-md)' }}>
              <strong>{createdTrip.name}</strong> — {createdTrip.destination}
            </p>
            <button
              className="btn btn-primary setup-submit"
              onClick={() => onCreated(createdTrip.id)}
            >
              Masuk ke Trip →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-wrapper">
      <div className="setup-card">
        <div className="setup-header">
          <MapPinned size={48} color="#0077b6" />
          <h1>Buat Trip Baru 🏝️</h1>
          <p>Atur perjalanan liburan kamu bersama teman-teman</p>
        </div>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}

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

          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-md)', padding: '12px', backgroundColor: 'var(--color-primary-lighter)', borderRadius: '8px' }}>
            💡 <strong>Tips:</strong> Anggota tim tidak perlu ditambah manual! Setelah trip dibuat, teman-teman Anda bisa bergabung melalui <strong>Room Code</strong> yang akan di-generate otomatis.
          </p>

          <button
            type="submit"
            className="btn btn-primary setup-submit"
            disabled={loading || !tripName.trim() || !destination.trim() || !budget}
          >
            {loading ? <><Loader size={18} className="spin" /> Membuat Trip...</> : '🚀 Buat Trip'}
          </button>

          {onBack && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onBack}
              style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
            >
              <ArrowLeft size={16} /> Kembali
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default TripSetup;
