import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { MapPin, Plus, Pencil, Trash2, X, CalendarDays, ChevronDown, ChevronRight, Map as MapIcon, List, Search, ExternalLink, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';

// Fix leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const emptyForm = { date: '', time: '', description: '', locationName: '', lat: null, lng: null };

// Fly map to coordinates
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

// Allow clicking on map to pick location + show all existing markers
function LocationPicker({ form, setForm, existingMarkers }) {
  useMapEvents({
    click(e) {
      setForm(prev => ({ ...prev, lat: e.latlng.lat, lng: e.latlng.lng }));
    }
  });

  const selectedIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const grayIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [20, 33],
    iconAnchor: [10, 33],
    popupAnchor: [1, -28],
    shadowSize: [33, 33],
    className: 'leaflet-marker-gray',
  });

  return (
    <>
      {/* Existing activity markers (dimmed) */}
      {existingMarkers.map(act => (
        <Marker key={act.id} position={[act.lat, act.lng]} icon={grayIcon} opacity={0.5}>
          <Popup><strong>{act.description}</strong><br/><em>{act.locationName}</em></Popup>
        </Marker>
      ))}
      {/* Currently selected location */}
      {form.lat && form.lng && (
        <Marker position={[form.lat, form.lng]} icon={selectedIcon}>
          <Popup>📍 Lokasi yang dipilih</Popup>
        </Marker>
      )}
    </>
  );
}

function Itinerary() {
  const { activities, addActivity, updateActivity, deleteActivity, reorderActivities } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedDates, setExpandedDates] = useState({});
  const [viewMode, setViewMode] = useState('list');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  // Drag and drop state
  const [draggedActId, setDraggedActId] = useState(null);
  const [dragOverActId, setDragOverActId] = useState(null);

  const toggleDate = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (activity) => {
    setForm({
      date: activity.date,
      time: activity.time,
      description: activity.description,
      locationName: activity.locationName || '',
      lat: activity.lat || null,
      lng: activity.lng || null,
    });
    setEditingId(activity.id);
    setShowModal(true);
  };

  // Debounced auto-complete
  const handleLocationInput = (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, locationName: val, lat: null, lng: null }));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length >= 3) {
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`
          );
          setSuggestions(res.data || []);
          setShowSuggestions(true);
        } catch (_) {
          setSuggestions([]);
        }
      }, 400);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const pickSuggestion = (s) => {
    const shortName = [s.address?.tourism, s.address?.amenity, s.address?.building, s.name].find(Boolean) || s.display_name.split(',')[0];
    const region = [s.address?.city, s.address?.state, s.address?.country].filter(Boolean).join(', ');
    setForm(prev => ({
      ...prev,
      locationName: shortName + (region ? `, ${region}` : ''),
      lat: parseFloat(s.lat),
      lng: parseFloat(s.lon),
    }));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSearchBtn = async () => {
    if (!form.locationName) return;
    setIsSearching(true);
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.locationName)}&limit=5&addressdetails=1`
      );
      if (res.data && res.data.length > 0) {
        setSuggestions(res.data);
        setShowSuggestions(true);
      } else {
        alert('Lokasi tidak ditemukan. Coba kata kunci lain atau klik langsung di peta.');
      }
    } catch (_) {
      alert('Gagal mencari lokasi.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date || !form.description) return;

    if (editingId) {
      updateActivity(editingId, form);
    } else {
      addActivity(form);
    }

    setExpandedDates(prev => ({ ...prev, [form.date]: true }));
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus kegiatan ini?')) deleteActivity(id);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, id) => {
    setDraggedActId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnter = (e, id, date) => {
    e.preventDefault();
    // Only allow reordering within the same date
    const draggedAct = activities.find(a => a.id === draggedActId);
    if (draggedAct && draggedAct.date === date && draggedActId !== id) {
      setDragOverActId(id);
    }
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnd = (date) => {
    if (draggedActId !== null && dragOverActId !== null && draggedActId !== dragOverActId) {
      reorderActivities(date, draggedActId, dragOverActId);
    }
    setDraggedActId(null);
    setDragOverActId(null);
  };

  const openGoogleMaps = (lat, lng, name) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`, '_blank');
  };

  // Sorted & grouped
  const sorted = [...activities].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    return (a.time || '').localeCompare(b.time || '');
  });
  const grouped = sorted.reduce((acc, act) => {
    if (!acc[act.date]) acc[act.date] = [];
    acc[act.date].push(act);
    return acc;
  }, {});

  const markers = sorted.filter(a => a.lat && a.lng);
  const defaultCenter = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [-2.5, 118.0];

  // For modal map: show existing markers except the one being edited
  const existingMarkersForModal = markers.filter(a => a.id !== editingId);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: viewMode === 'map' ? 'calc(100vh - 180px)' : 'auto' }}>
      <div className="card-header" style={{ flexShrink: 0 }}>
        <h2 className="card-title"><CalendarDays size={22} /> Jadwal Kegiatan</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--color-background)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setViewMode('list')}
              style={{ padding: '6px 12px', border: 'none', background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: viewMode === 'list' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
              <List size={14} /> Daftar
            </button>
            <button type="button" onClick={() => setViewMode('map')}
              style={{ padding: '6px 12px', border: 'none', background: viewMode === 'map' ? 'var(--color-primary)' : 'transparent', color: viewMode === 'map' ? 'white' : 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: viewMode === 'map' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
              <MapIcon size={14} /> Peta
            </button>
          </div>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'list' ? (
          activities.length === 0 ? (
            <div className="empty-state">
              <CalendarDays size={48} />
              <p>Belum ada jadwal.</p>
              <p>Klik <strong>Tambah</strong> untuk menambahkan kegiatan.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, acts]) => {
              const isExpanded = expandedDates[date];
              return (
                <div key={date} style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div onClick={() => toggleDate(date)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 14px',
                      backgroundColor: isExpanded ? 'var(--color-primary-lighter)' : 'var(--color-surface)',
                      border: '1px solid', borderColor: isExpanded ? 'var(--color-primary)' : 'var(--color-border)',
                      borderRadius: 'var(--border-radius-md)', userSelect: 'none', transition: 'all 0.2s ease'
                    }}>
                    {isExpanded ? <ChevronDown size={20} color="var(--color-primary)" /> : <ChevronRight size={20} color="var(--color-text-light)" />}
                    <h3 style={{ margin: 0, fontSize: '1rem', color: isExpanded ? 'var(--color-primary)' : 'var(--color-text)' }}>
                      📅 {formatDate(date)}
                    </h3>
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-light)', backgroundColor: 'var(--color-background)', padding: '2px 10px', borderRadius: '12px' }}>
                      {acts.length} kegiatan
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="timeline" style={{ marginTop: 'var(--spacing-md)', marginLeft: '8px' }}>
                      {acts.map((act) => (
                        <div 
                          key={act.id} 
                          className="timeline-item"
                          draggable
                          onDragStart={(e) => handleDragStart(e, act.id)}
                          onDragEnter={(e) => handleDragEnter(e, act.id, date)}
                          onDragOver={handleDragOver}
                          onDragEnd={() => handleDragEnd(date)}
                          style={{
                            opacity: draggedActId === act.id ? 0.4 : 1,
                            backgroundColor: dragOverActId === act.id ? 'var(--color-primary-lighter)' : 'transparent',
                            borderRadius: '8px',
                            cursor: 'grab',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div className="timeline-dot" />
                          <div className="timeline-content">
                            <div className="timeline-top">
                              <span className="timeline-time">{act.time || '-'}</span>
                              <div className="timeline-actions">
                                <button className="btn-icon" onClick={() => openEdit(act)} title="Edit"><Pencil size={14} /></button>
                                <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(act.id)} title="Hapus"><Trash2 size={14} /></button>
                              </div>
                            </div>
                            <p className="timeline-desc">{act.description}</p>
                            {act.locationName && (
                              <div 
                                onClick={() => act.lat && act.lng && openGoogleMaps(act.lat, act.lng, act.locationName)}
                                style={{ 
                                  fontSize: '0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0 0 0',
                                  cursor: act.lat && act.lng ? 'pointer' : 'default',
                                  padding: '4px 8px', backgroundColor: 'var(--color-primary-lighter)', borderRadius: '6px', width: 'fit-content',
                                  transition: 'all 0.2s ease',
                                }}
                                title={act.lat && act.lng ? 'Klik untuk buka di Google Maps' : ''}
                              >
                                <MapPin size={12}/> 
                                <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.locationName}</span>
                                {act.lat && act.lng && <ExternalLink size={10} />}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          <div style={{ flex: 1, minHeight: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', zIndex: 0 }}>
            <MapContainer center={defaultCenter} zoom={markers.length > 0 ? 10 : 5} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0','mt1','mt2','mt3']} attribution="Google Maps" />
              <FitBounds markers={markers} />
              
              {markers.length > 1 && (
                <Polyline 
                  positions={markers.map(m => [m.lat, m.lng])} 
                  color="var(--color-primary)" 
                  weight={3} 
                  opacity={0.7} 
                  dashArray="8, 8"
                />
              )}

              {markers.map((act, index) => (
                <Marker key={act.id} position={[act.lat, act.lng]}>
                  <Popup>
                    <div style={{ fontSize: '10px', color: '#888', fontWeight: 'bold' }}>HENTIAN {index + 1}</div>
                    <strong>{act.description}</strong><br/>
                    {formatDate(act.date)} {act.time}<br/>
                    <em>{act.locationName}</em><br/>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${act.lat},${act.lng}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>
                      Buka di Google Maps ↗
                    </a>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setShowSuggestions(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', width: '92%' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>
              <button className="btn-icon" onClick={() => { setShowModal(false); setShowSuggestions(false); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tanggal *</label>
                  <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Jam</label>
                  <input type="time" className="form-input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">Deskripsi / Judul *</label>
                <input type="text" className="form-input" placeholder="Contoh: Check-in Hotel" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>

              {/* ─── LOCATION SEARCH ─── */}
              <div className="form-group" style={{ position: 'relative', marginBottom: '8px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Navigation size={14} /> Cari Lokasi
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ketik nama tempat..."
                    value={form.locationName}
                    onChange={handleLocationInput}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchBtn(); } }}
                  />
                  <button type="button" className="btn" onClick={handleSearchBtn} disabled={!form.locationName || isSearching}
                    style={{ padding: '0 14px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    <Search size={14} /> {isSearching ? '...' : 'Cari'}
                  </button>
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: '10px', zIndex: 1000, listStyle: 'none', padding: '4px',
                    margin: '4px 0 0 0', maxHeight: '220px', overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}>
                    {suggestions.map((s, i) => {
                      const mainName = s.display_name.split(',')[0];
                      const subText = s.display_name.split(',').slice(1, 3).join(',').trim();
                      return (
                        <li key={i} onMouseDown={() => pickSuggestion(s)}
                          style={{
                            padding: '10px 12px', cursor: 'pointer', fontSize: '0.85rem',
                            borderRadius: '8px', transition: 'background 0.15s ease',
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-lighter)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{mainName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '2px' }}>{subText}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Location confirmed badge */}
              {form.lat && form.lng && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', marginBottom: '8px',
                  background: 'var(--color-success-light)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--color-success)',
                }}>
                  <MapPin size={14} />
                  <span><strong>Lokasi terpilih</strong> — {form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, lat: null, lng: null }))}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px' }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Map preview */}
              <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)', marginBottom: '12px', position: 'relative' }}>
                <MapContainer
                  center={form.lat && form.lng ? [form.lat, form.lng] : defaultCenter}
                  zoom={form.lat ? 15 : 5}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                >
                  <TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0','mt1','mt2','mt3']} />
                  <MapUpdater center={form.lat && form.lng ? [form.lat, form.lng] : null} />
                  <LocationPicker form={form} setForm={setForm} existingMarkers={existingMarkersForModal} />
                </MapContainer>
                <div style={{
                  position: 'absolute', bottom: '8px', left: '8px', zIndex: 400,
                  backgroundColor: 'rgba(255,255,255,0.9)', padding: '4px 10px',
                  borderRadius: '6px', fontSize: '0.7rem', color: '#666',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  Klik di peta untuk memilih/mengubah lokasi
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingId ? 'Simpan Perubahan' : 'Tambah Kegiatan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Auto-fit all markers into view
function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers, map]);
  return null;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default Itinerary;
