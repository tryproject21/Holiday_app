import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPinned, Mail, Lock, User, LogIn, UserPlus, Loader } from 'lucide-react';

function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Nama tampilan wajib diisi.');
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName.trim());
        setSuccessMsg('Akun berhasil dibuat! Silakan cek email untuk verifikasi, atau langsung login.');
        setIsLogin(true);
      }
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Email atau password salah.');
      } else if (err.message.includes('already registered')) {
        setError('Email sudah terdaftar. Silakan login.');
      } else if (err.message.includes('Password should be at least')) {
        setError('Password minimal 6 karakter.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <MapPinned size={48} />
          </div>
          <h1>Liburan Kuy! 🏝️</h1>
          <p>Rencanakan liburan bersama teman-teman</p>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="auth-alert auth-alert-success">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">
                <User size={16} /> Nama Tampilan
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Juan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <Mail size={16} /> Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="email@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} /> Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder={isLogin ? 'Masukkan password' : 'Minimal 6 karakter'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? (
              <><Loader size={18} className="spin" /> Memproses...</>
            ) : isLogin ? (
              <><LogIn size={18} /> Masuk</>
            ) : (
              <><UserPlus size={18} /> Daftar</>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button type="button" className="auth-link" onClick={switchMode}>
              {isLogin ? 'Daftar di sini' : 'Login di sini'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
