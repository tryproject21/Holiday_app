import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import TripSetup from './components/TripSetup';
import Dashboard from './components/Dashboard';
import Itinerary from './components/Itinerary';
import Ledger from './components/Ledger';
import SplitBill from './components/SplitBill';
import Checklist from './components/Checklist';
import Documents from './components/Documents';
import Planning from './components/Planning';
import { Home, CalendarDays, ReceiptText, Users, CheckSquare, Folder, Lightbulb, LogOut, Sun, Moon } from 'lucide-react';

function AppContent() {
  const { trip, resetTrip } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (!trip.isSetup) {
    return <TripSetup />;
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

  const handleReset = () => {
    if (window.confirm('Reset semua data perjalanan? Data yang tersimpan akan hilang.')) {
      resetTrip();
    }
  };

  return (
    <div className="app-container">
      <header className="header" style={{ position: 'relative' }}>
        <button 
          onClick={toggleTheme} 
          className="btn-icon" 
          style={{ position: 'absolute', top: 'var(--spacing-md)', right: '0' }}
          title="Toggle Dark Mode"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <h1>🏝️ {trip.name}</h1>
        <p>{trip.members.length} anggota • Budget {formatRp(trip.budget)}</p>
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
        <button className="tab-btn tab-btn-reset" onClick={handleReset} title="Reset Perjalanan">
          <LogOut size={18} />
          <span className="tab-label">Reset</span>
        </button>
      </nav>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function formatRp(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

export default App;
