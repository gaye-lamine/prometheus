'use client';

import React, { useState, useEffect } from 'react';
import { use } from 'react';

export default function SharedReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
    : 'http://127.0.0.1:8000';

  useEffect(() => {
    fetch(`${apiBase}/api/simulations/${id}/report`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setReport(data);
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary, #050710)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary, #94a3b8)',
        fontFamily: 'var(--font-sans)'
      }}>
        <p>Loading report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary, #050710)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary, #94a3b8)',
        fontFamily: 'var(--font-sans)',
        gap: '16px'
      }}>
        <h2 style={{ color: 'var(--text-primary, #f1f5f9)', fontSize: '1.5rem' }}>Report Not Found</h2>
        <p>{error || 'This simulation report does not exist or has expired.'}</p>
        <a
          href="/"
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgb(99, 102, 241), rgb(79, 82, 221))',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          Launch Your Own Simulation →
        </a>
      </div>
    );
  }

  const gradeColors: Record<string, string> = {
    'A': 'rgb(20, 184, 166)',
    'B': '#a855f7',
    'C': 'rgba(99,102,241,1)',
    'D': '#eab308',
    'F': 'rgb(232, 64, 76)'
  };
  const gradeColor = gradeColors[report.grade] || 'rgb(20, 184, 166)';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #050710)',
      fontFamily: 'var(--font-sans)',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: '700px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, rgb(99, 102, 241), rgb(20, 184, 166))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Prometheus UX Post-Mortem
          </h1>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
            Simulation <code style={{ color: 'var(--accent-indigo, #6366f1)' }}>{report.simulation_id}</code> · {report.persona} persona
          </p>
        </div>

        {/* Report Card */}
        <div style={{
          background: 'var(--glass-bg, rgba(15, 23, 42, 0.6))',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '24px', alignItems: 'center' }}>
            {/* Grade */}
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: `3px solid ${gradeColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
              boxShadow: `0 0 20px ${gradeColor}33`
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: gradeColor }}>{report.grade}</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>UX Grade</span>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', marginBottom: '2px' }}>UX Debt Score</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-primary, #f1f5f9)' }}>
                  {report.ux_debt_score} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a3b8)' }}>/ 100</span>
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', marginBottom: '2px' }}>Success Rate</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: report.success_rate === 100 ? 'rgb(20, 184, 166)' : 'rgb(232, 64, 76)' }}>
                  {report.success_rate}%
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', marginBottom: '2px' }}>Max Frustration</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: gradeColor }}>
                  {Math.round(report.max_frustration * 100)}%
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', marginBottom: '2px' }}>Interaction Steps</p>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-primary, #f1f5f9)' }}>
                  {report.steps_count}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgb(99, 102, 241), rgb(79, 82, 221))',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
              transition: 'transform 0.2s'
            }}
          >
            Launch Your Own Simulation →
          </a>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', marginTop: '12px' }}>
            Generated {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'recently'} · Powered by Prometheus
          </p>
        </div>
      </div>
    </div>
  );
}
