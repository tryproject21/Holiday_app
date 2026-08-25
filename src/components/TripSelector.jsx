import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { MapPinned, Plus, Key, LogOut, Loader, Users, Calendar, Trash2 } from 'lucide-react';

function TripSelector({ onSelectTrip, onCreateNew }) {
  const { profile, signOut } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trip_members')
      .select(`
        role,
        trips (
          id, name, destination, budget, room_code, created_at
        )
      `)
      .eq('user_id', profile.id);

    if (error) {
      console.error('Error fetching trips:', error);
    } else {
      const tripList = (data || [])
        .filter(d => d.trips)
        .map(d => ({ ...d.trips, role: d.role }));
      setTrips(tripList);
    }
    setLoading(false);
  };

  const handleJoinTrip = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setError('');
    setJoining(true);

    try {
      // Find the trip by room code
      const { data: trip, error: findError } = await supabase
        .from('trips')
        .select('id, name')
        .eq('room_code', roomCode.trim().toUpperCase())
        .single();

      if (findError || !trip) {
        setError('Room code tidak ditemukan. Periksa kembali kodenya.');
        setJoining(false);
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', trip.id)
        .eq('user_id', profile.id)
        .single();

      if (existing) {
        // Already a member, just select the trip
        onSelectTrip(trip.id);
        return;
      }

      // Join the trip
      const { error: joinError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
          user_id: profile.id,
          display_name: profile.display_name,
          role: 'editor',
        });

      if (joinError) throw joinError;

      onSelectTrip(trip.id);
    } catch (err) {
      setError(err.message || 'Gagal bergabung ke trip.');
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Hapus trip ini? Semua data trip akan hilang permanen.')) return;
    
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) {
      alert('Gagal menghapus trip: ' + error.message);
    } else {
      setTrips(prev => prev.filter(t => t.id !== tripId));
    }
  };

  return (
    <div className="trip-selector-wrapper">
      <div className="trip-selector-card">
        <div className="trip-selector-header">
          <div>
            <h1>🏝️ Liburan Kuy!</h1>
            <p>Halo, <strong>{profile?.display_name || 'Traveler'}</strong>!</p>
          </div>
          <button className="btn btn-outline" onClick={signOut} title="Logout">
            <LogOut size={16} /> Keluar
          </button>
        </div>

        {/* Join via Room Code */}
        <div className="trip-join-section">
          <h3><Key size={18} /> Gabung Trip via Room Code</h3>
          {error && <div className="auth-alert auth-alert-error">{error}</div>}
          <form onSubmit={handleJoinTrip} className="trip-join-form">
            <input
              type="text"
              className="form-input"
              placeholder="Masukkan Room Code (6 digit)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 700, textAlign: 'center' }}
            />
            <button type="submit" className="btn btn-primary" disabled={joining || !roomCode.trim()}>
              {joining ? <Loader size={16} className="spin" /> : <Users size={16} />}
              Gabung
            </button>
          </form>
        </div>

        {/* Trip List */}
        <div className="trip-list-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <h3><MapPinned size={18} /> Trip Saya</h3>
            <button className="btn btn-primary" onClick={onCreateNew}>
              <Plus size={16} /> Buat Trip Baru
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <Loader size={32} className="spin" />
              <p>Memuat trip...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="empty-state">
              <MapPinned size={48} />
              <p>Belum ada trip.</p>
              <p>Buat trip baru atau gabung ke trip teman dengan Room Code.</p>
            </div>
          ) : (
            <div className="trip-grid">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="trip-card"
                  onClick={() => onSelectTrip(trip.id)}
                >
                  <div className="trip-card-header">
                    <h4>{trip.name}</h4>
                    {trip.role === 'owner' && (
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTrip(trip.id); }}
                        title="Hapus Trip"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {trip.destination && (
                    <p className="trip-card-dest">✈️ {trip.destination}</p>
                  )}
                  <div className="trip-card-footer">
                    <span className={`badge ${trip.role === 'owner' ? 'badge-primary' : 'badge-success'}`}>
                      {trip.role === 'owner' ? 'Owner' : 'Member'}
                    </span>
                    <span className="trip-card-code">
                      <Key size={12} /> {trip.room_code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TripSelector;
