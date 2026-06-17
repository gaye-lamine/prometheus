'use client';

import React, { useState } from 'react';

declare const pendo: any;

interface AuthModalProps {
  onAuthenticated: (visitorId: string, email: string) => void;
}

export default function AuthModal({ onAuthenticated }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBase = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
    : 'http://127.0.0.1:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/visitors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), display_name: displayName.trim() })
      });
      const data = await res.json();
      if (data.visitor_id) {
        localStorage.setItem('prometheus_visitor_id', data.visitor_id);
        localStorage.setItem('prometheus_email', email.trim());
        localStorage.setItem('prometheus_display_name', displayName.trim());
        onAuthenticated(data.visitor_id, email.trim());
      }
    } catch (err) {
      setError('Connection failed. Continuing as guest.');
      // Fallback to guest mode
      const guestId = 'usr_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('prometheus_visitor_id', guestId);
      onAuthenticated(guestId, '');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    const guestId = 'usr_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('prometheus_visitor_id', guestId);
    onAuthenticated(guestId, '');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      <div style={{
        background: 'var(--glass-bg, rgba(15, 23, 42, 0.95))',
        border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '420px',
        width: '90%',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, rgb(99, 102, 241), rgb(20, 184, 166))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Welcome to Prometheus
          </h2>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
            Sign in to save your simulations and share reports with your team.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Email *</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                color: 'var(--text-primary, #f1f5f9)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Display Name</label>
            <input
              id="auth-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name (optional)"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                color: 'var(--text-primary, #f1f5f9)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--accent-critical, #e8404c)', fontSize: '0.8rem', margin: 0 }}>{error}</p>
          )}

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, rgb(99, 102, 241), rgb(79, 82, 221))',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: isLoading ? 'wait' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.2s, transform 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? 'Connecting...' : 'Get Started'}
          </button>

          <button
            id="btn-auth-guest"
            type="button"
            onClick={handleGuest}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
              background: 'transparent',
              color: 'var(--text-muted, #64748b)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
          >
            Continue as guest
          </button>
        </form>
      </div>
    </div>
  );
}
