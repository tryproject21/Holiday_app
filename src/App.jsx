import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useAppContext } from './context/AppContext';
import AuthPage from './components/AuthPage';
import TripSelector from './components/TripSelector';
import TripSetup from './components/TripSetup';
import Dashboard from './components/Dashboard';
import Itinerary from './components/Itinerary';
import Ledger from './components/Ledger';
import SplitBill from './components/SplitBill';
import Checklist from './components/Checklist';
import Documents from './components/Documents';
import Planning from './components/Planning';
import { Home, CalendarDays, ReceiptText, Users, CheckSquare, Folder, Lightbulb, LogOut, Sun, Moon, ArrowLeft, Key, Copy, Check, Loader } from 'lucide-react';

function AppContent() {
  const { trip, resetTrip, loading, tripId } = useAppContext();
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'light');
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(trip.room_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="setup-wrapper">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader size={48} className="spin" style={{ color: 'var(--color-primary)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--color-text-light)' }}>Memuat data trip...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: Home },
    { key: 'planning', label: 'Rencana', icon: Lightbulb },
    { key: 'itinerary', label: 'Jadwal', icon: CalendarDays },
    { key: 'ledger', label: 'Keuangan', icon: ReceiptText },
    { key: 'splitbill', label: 'Split Bill', icon: Users },
    { key: 'checklist', label: 'Checklist', icon: CheckSquare },
    { key: 'documents', label: 'Dokumen', icon: Folder },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'planning': return <Planning />;
      case 'itinerary': return <Itinerary />;
      case 'ledger': return <Ledger />;
      case 'splitbill': return <SplitBill />;
      case 'checklist': return <Checklist />;
      case 'documents': return <Documents />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <header className="header" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '8px', position: 'absolute', top: 'var(--spacing-md)', right: '0' }}>
          <button
            onClick={() => setShowRoomCode(!showRoomCode)}
            className="btn-icon"
            title="Room Code"
            style={{ position: 'relative' }}
          >
            <Key size={18} />
          </button>
          <button
            onClick={toggleTheme}
            className="btn-icon"
            title="Toggle Dark Mode"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>

        <h1>🏝️ {trip.name}</h1>
        <p>
          {trip.members.length} anggota • Budget {formatRp(trip.budget)}
          {profile && <span style={{ opacity: 0.7 }}> • Login: {profile.display_name}</span>}
        </p>

        {showRoomCode && (
          <div className="room-code-popup">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Room Code:</span>
            <strong style={{ fontSize: '1.4rem', letterSpacing: '3px' }}>{trip.room_code}</strong>
            <button className="btn btn-outline" onClick={handleCopyRoomCode} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
              {copied ? <><Check size={12} /> Tersalin</> : <><Copy size={12} /> Salin</>}
            </button>
          </div>
        )}
      </header>

      <nav className="tab-nav">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={18} />
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

function AppRouter() {
  const { user, loading: authLoading } = useAuth();
  const [currentTripId, setCurrentTripId] = useState(null);
  const [view, setView] = useState('selector'); // 'selector' | 'setup' | 'app'

  // Reset view when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentTripId(null);
      setView('selector');
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="setup-wrapper">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader size={48} className="spin" style={{ color: 'var(--color-primary)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--color-text-light)' }}>Memuat...</p>
        </div>
      </div>
    );
  }

  // Not logged in → Auth page
  if (!user) {
    return <AuthPage />;
  }

  // Logged in but no trip selected
  if (!currentTripId) {
    if (view === 'setup') {
      return (
        <TripSetup
          onCreated={(tripId) => {
            setCurrentTripId(tripId);
            setView('app');
          }}
          onBack={() => setView('selector')}
        />
      );
    }

    return (
      <TripSelector
        onSelectTrip={(tripId) => {
          setCurrentTripId(tripId);
          setView('app');
        }}
        onCreateNew={() => setView('setup')}
      />
    );
  }

  // Trip selected → Full app
  return (
    <AppProvider tripId={currentTripId}>
      <div style={{ position: 'fixed', top: '12px', left: '12px', zIndex: 1000 }}>
        <button
          className="btn btn-outline"
          onClick={() => {
            setCurrentTripId(null);
            setView('selector');
          }}
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          title="Kembali ke daftar trip"
        >
          <ArrowLeft size={14} /> Trip Lain
        </button>
      </div>
      <AppContent />
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

function formatRp(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

export default App;
