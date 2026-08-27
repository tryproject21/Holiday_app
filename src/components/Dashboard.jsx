import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { MapPin, Wallet, TrendingUp, TrendingDown, ArrowRight, CheckSquare, CloudSun, Sun, CloudRain, CloudLightning, Navigation, Calendar, ExternalLink, Pencil, Check, X, Users } from 'lucide-react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

ChartJS.register(ArcElement, Tooltip, Legend);

const CATEGORY_COLORS = {
  Transportasi: '#ffb703',
  Akomodasi: '#00b4d8',
  Konsumsi: '#fb8500',
  'Tiket Wisata': '#8ecae6',
  Lainnya: '#a8dadc',
  'Split Bill': '#9d4edd',
};

// Auto-fit map to show markers without zooming out too much
function FitBounds({ markers }) {
  const map = useMap();
  React.useEffect(() => {
    if (markers.length > 0) {
      // Focus on the first marker/destination to keep the view compact
      map.setView([markers[0].lat, markers[0].lng], 13);
    }
  }, [markers, map]);
  return null;
}

function Dashboard() {
  const { trip, totalExpense, totalIncome, expenseByCategory, activities, checklistItems, updateBudget, members } = useAppContext();
  const [weather, setWeather] = React.useState({ temp: '--', condition: 'Memuat...', icon: CloudSun });
  const [isEditingBudget, setIsEditingBudget] = React.useState(false);
  const [newBudget, setNewBudget] = React.useState('');

  const handleEditBudget = () => {
    setNewBudget(trip.budget.toString());
    setIsEditingBudget(true);
  };

  const handleSaveBudget = () => {
    updateBudget(newBudget);
    setIsEditingBudget(false);
  };

  const handleCancelBudget = () => {
    setIsEditingBudget(false);
  };

  React.useEffect(() => {
    const fetchWeather = async () => {
      if (!trip.destination) {
        setWeather({ temp: '--', condition: 'Destinasi?', icon: CloudSun });
        return;
      }
      try {
        const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trip.destination)}&count=1`);
        if (geoRes.data.results && geoRes.data.results.length > 0) {
          const { latitude, longitude } = geoRes.data.results[0];
          const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          if (weatherRes.data && weatherRes.data.current_weather) {
            const current = weatherRes.data.current_weather;
            const code = current.weathercode;
            let condition = 'Cerah';
            let WIcon = Sun;
            if (code >= 1 && code <= 3) { condition = 'Berawan'; WIcon = CloudSun; }
            else if (code >= 51 && code <= 67) { condition = 'Hujan'; WIcon = CloudRain; }
            else if (code >= 71 && code <= 82) { condition = 'Salju'; WIcon = CloudRain; }
            else if (code >= 95) { condition = 'Badai'; WIcon = CloudLightning; }
            setWeather({ temp: Math.round(current.temperature), condition, icon: WIcon });
          }
        } else {
          setWeather({ temp: '--', condition: 'Tidak ditemukan', icon: CloudSun });
        }
      } catch (_) {
        setWeather({ temp: '--', condition: 'Gagal memuat', icon: CloudSun });
      }
    };
    fetchWeather();
  }, [trip.destination]);

  const netExpense = Math.max(0, totalExpense - totalIncome);
  const spentPercent = trip.budget > 0 ? Math.min((netExpense / trip.budget) * 100, 100) : 0;

  const categoryLabels = Object.keys(expenseByCategory);
  const categoryData = Object.values(expenseByCategory);

  const totalChecklist = checklistItems.length;
  const doneChecklist = checklistItems.filter(i => i.done).length;
  const checklistPercent = totalChecklist > 0 ? (doneChecklist / totalChecklist) * 100 : 0;

  const data = {
    labels: categoryLabels,
    datasets: [{
      data: categoryData,
      backgroundColor: categoryLabels.map(label => CATEGORY_COLORS[label] || '#ccc'),
      borderWidth: 0,
    }],
  };

  const options = {
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatRp(ctx.raw)}` } },
    },
    maintainAspectRatio: false,
    cutout: '75%',
  };

  // Sorted activities for the journey scroll and map routing
  const sortedActivities = [...activities].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    return (a.time || '').localeCompare(b.time || '');
  });

  // All activities with coordinates (sorted)
  const mapMarkers = sortedActivities.filter(a => a.lat && a.lng);
  const defaultMapCenter = mapMarkers.length > 0 ? [mapMarkers[0].lat, mapMarkers[0].lng] : [-2.5, 118.0];

  return (
    <div className="bento-dashboard fade-in">

      {/* HEADER */}
      <div className="bento-header">
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '4px' }}>{trip.name}</h2>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.95rem' }}>
            {trip.destination ? `✈️ ${trip.destination}` : 'Ringkasan perjalanan & keuangan'}
          </p>
        </div>
        <div className="bento-avatars">
          {trip.members.map((m, i) => (
            <div key={m} className="bento-avatar" title={m} style={{ zIndex: trip.members.length - i }}>
              {m.substring(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div className="bento-grid">

        {/* WIDGET 1: MAIN BALANCE */}
        <div className="bento-card bento-main-balance">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
            <div>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Total Pengeluaran
              </span>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-text)' }}>
                {formatRp(netExpense)}
              </h3>
            </div>
            <div style={{ padding: '12px', background: 'var(--color-primary-lighter)', borderRadius: '16px', color: 'var(--color-primary)' }}>
              <Wallet size={28} />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', fontWeight: 600 }}>
                {trip.budget > 0 ? `Terpakai ${spentPercent.toFixed(0)}% dari Anggaran` : 'Anggaran belum diatur'}
              </span>
            </div>
            <div className="bento-progress-track">
              <div className="bento-progress-fill" style={{ width: `${spentPercent}%`, backgroundColor: spentPercent > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
            </div>
          </div>

          <div className="bento-mini-stats">
            <div className="mini-stat">
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Anggaran
                {!isEditingBudget && (
                  <button onClick={handleEditBudget} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-primary)', display: 'flex' }} title="Edit Anggaran">
                    <Pencil size={12} />
                  </button>
                )}
              </span>
              {isEditingBudget ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    style={{ width: '80px', padding: '2px 4px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--color-border)', outline: 'none' }}
                    autoFocus
                  />
                  <button onClick={handleSaveBudget} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-success)', display: 'flex' }}><Check size={16} /></button>
                  <button onClick={handleCancelBudget} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-danger)', display: 'flex' }}><X size={16} /></button>
                </div>
              ) : (
                <span className="value">{formatRp(trip.budget)}</span>
              )}
            </div>
            <div className="mini-stat">
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={14} color="var(--color-success)" /> Masuk
              </span>
              <span className="value">{formatRp(totalIncome)}</span>
            </div>
            <div className="mini-stat">
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingDown size={14} color="var(--color-danger)" /> Keluar
              </span>
              <span className="value">{formatRp(totalExpense)}</span>
            </div>
          </div>
        </div>

        {/* WIDGET 2: EXPENSE DONUT */}
        <div className="bento-card bento-donut-card">
          <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>Pengeluaran</h4>
          <div style={{ position: 'relative', width: '100%', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {categoryLabels.length > 0 ? (
              <>
                <Doughnut data={data} options={options} />
                <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Total</span>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{categoryLabels.length}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>kategori</span>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', textAlign: 'center' }}>Belum ada transaksi</p>
            )}
          </div>
          <div className="bento-legend">
            {categoryLabels.slice(0, 3).map(label => (
              <div key={label} className="legend-item">
                <span className="dot" style={{ backgroundColor: CATEGORY_COLORS[label] || '#ccc' }} />
                <span>{label}</span>
              </div>
            ))}
            {categoryLabels.length > 3 && <div className="legend-item"><span style={{ color: 'var(--color-text-light)' }}>+{categoryLabels.length - 3} lainnya</span></div>}
          </div>
        </div>

        {/* WIDGET 3: WEATHER */}
        <div className="bento-card bento-weather-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '4px', fontWeight: 700 }}>Cuaca {trip.destination ? trip.destination.split(',')[0] : 'Destinasi'}</h4>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>{weather.condition}</p>
            </div>
            <weather.icon size={36} color="white" />
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 'var(--spacing-md)' }}>
            <span style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1 }}>{weather.temp}°</span>
            <span style={{ fontSize: '1.2rem', opacity: 0.9, fontWeight: 600 }}>C</span>
          </div>
        </div>

        {/* WIDGET 4: CHECKLIST */}
        <div className="bento-card bento-checklist-card" style={{ justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h4 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <CheckSquare size={22} color="var(--color-primary)" /> Persiapan Bawaan
            </h4>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {doneChecklist}/{totalChecklist}
            </span>
          </div>
          <div className="bento-progress-track" style={{ height: '12px', marginBottom: '12px' }}>
            <div className="bento-progress-fill" style={{ width: `${checklistPercent}%`, backgroundColor: checklistPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', margin: 0 }}>
            {totalChecklist === 0 ? 'Belum ada barang di checklist.' :
             checklistPercent === 100 ? 'Bagus! Semua barang sudah siap dibawa.' :
             'Jangan lupa lengkapi checklist Anda sebelum berangkat.'}
          </p>
        </div>

        {/* WIDGET 5: INTERACTIVE MAP — ALWAYS VISIBLE */}
        <div className="bento-card bento-full" style={{ padding: 0, overflow: 'hidden', position: 'relative', zIndex: 0 }}>
          <div style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 400,
            backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '8px 14px',
            borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Navigation size={16} color="var(--color-primary)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#333' }}>Peta Destinasi</div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>{mapMarkers.length} lokasi ditandai</div>
            </div>
          </div>

          <div className="dashboard-map-wrapper">
            {mapMarkers.length > 0 ? (
              <MapContainer center={defaultMapCenter} zoom={10} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0','mt1','mt2','mt3']} attribution="Google Maps" />
                <FitBounds markers={mapMarkers} />
                
                {mapMarkers.length > 1 && (
                  <Polyline 
                    positions={mapMarkers.map(m => [m.lat, m.lng])} 
                    color="var(--color-primary)" 
                    weight={3} 
                    opacity={0.7} 
                    dashArray="8, 8"
                  />
                )}

                {mapMarkers.map((act, index) => (
                  <Marker key={act.id} position={[act.lat, act.lng]}>
                    <Popup>
                      <div style={{ minWidth: '150px' }}>
                        <div style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginBottom: '2px' }}>
                          HENTIAN {index + 1}
                        </div>
                        <strong style={{ fontSize: '0.9rem' }}>{act.description}</strong><br/>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>
                          <Calendar size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          {formatDateShort(act.date)} • {act.time || '-'}
                        </span><br/>
                        {act.locationName && <em style={{ fontSize: '0.8rem', color: '#888' }}>{act.locationName}</em>}
                        <br/>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${act.lat},${act.lng}`}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}
                        >
                          <ExternalLink size={10} /> Buka di Google Maps
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--color-primary-lighter), var(--color-background))',
              }}>
                <MapPin size={48} color="var(--color-primary)" style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '260px' }}>
                  Belum ada lokasi. Tambahkan kegiatan dengan lokasi di menu <strong>Jadwal</strong> untuk melihat peta destinasi.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* WIDGET 6: JOURNEY CARDS */}
        {sortedActivities.length > 0 && (
          <div className="bento-card bento-full">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h4 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--color-primary)" /> Rute Perjalanan
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Geser <ArrowRight size={14} />
              </div>
            </div>

            <div className="bento-journey-scroll">
              {sortedActivities.map((act) => (
                <div key={act.id} className="bento-journey-card">
                  <div className="journey-card-header">
                    <span className="journey-card-date">{formatDateShort(act.date)}</span>
                    <span className="journey-card-time">{act.time || '-'}</span>
                  </div>
                  <div className="journey-card-body">
                    <div className="journey-card-title">{act.description}</div>
                    {act.locationName && act.lat && act.lng && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${act.lat},${act.lng}`}
                        target="_blank" rel="noreferrer"
                        style={{ fontSize: '0.7rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px', textDecoration: 'none' }}
                      >
                        <MapPin size={10} /> {act.locationName.split(',')[0]} <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatRp(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

export default Dashboard;
