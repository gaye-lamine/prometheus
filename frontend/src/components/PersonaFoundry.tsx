'use client';

import React, { useState } from 'react';

declare const pendo: any;

export interface PersonaConfig {
  persona: 'IMPATIENT' | 'ANALYTICAL' | 'FRUSTRATED';
  attentionSpan: number;
  technicalLiteracy: number;
  latencyTolerance: number;
  isMobile: boolean;
  networkProfile: 'FAST_FIBER' | 'SLOW_3G' | 'LATENT_CRITICAL';
  targetUrl: string;
}

interface PersonaFoundryProps {
  onLaunch: (config: PersonaConfig) => void;
  isStreaming: boolean;
}

export default function PersonaFoundry({ onLaunch, isStreaming }: PersonaFoundryProps) {
  const [persona, setPersona] = useState<'IMPATIENT' | 'ANALYTICAL' | 'FRUSTRATED'>('ANALYTICAL');
  const [attentionSpan, setAttentionSpan] = useState(70);
  const [technicalLiteracy, setTechnicalLiteracy] = useState(85);
  const [latencyTolerance, setLatencyTolerance] = useState(60);
  const [isMobile, setIsMobile] = useState(false);
  const [networkProfile, setNetworkProfile] = useState<'FAST_FIBER' | 'SLOW_3G' | 'LATENT_CRITICAL'>('FAST_FIBER');
  const [targetUrl, setTargetUrl] = useState('https://checkout.prometheus.test/checkout_form_v2');

  const handlePersonaChange = (type: 'IMPATIENT' | 'ANALYTICAL' | 'FRUSTRATED') => {
    setPersona(type);
    // Auto-adjust parameters to match realistic persona profiles
    let autoAttentionSpan: number;
    let autoTechnicalLiteracy: number;
    let autoLatencyTolerance: number;
    if (type === 'IMPATIENT') {
      autoAttentionSpan = 25;
      autoTechnicalLiteracy = 55;
      autoLatencyTolerance = 20;
    } else if (type === 'ANALYTICAL') {
      autoAttentionSpan = 90;
      autoTechnicalLiteracy = 95;
      autoLatencyTolerance = 75;
    } else {
      autoAttentionSpan = 45;
      autoTechnicalLiteracy = 40;
      autoLatencyTolerance = 35;
    }
    setAttentionSpan(autoAttentionSpan);
    setTechnicalLiteracy(autoTechnicalLiteracy);
    setLatencyTolerance(autoLatencyTolerance);

    if (typeof pendo !== 'undefined') {
      pendo.track('persona_profile_configured', {
        persona_type: type,
        auto_attention_span: autoAttentionSpan,
        auto_technical_literacy: autoTechnicalLiteracy,
        auto_latency_tolerance: autoLatencyTolerance
      });
    }
  };

  const handleSimulate = () => {
    // Fire Pendo/Novus.ai analytics event to show the meta-analytical bridge
    if (typeof window !== 'undefined' && (window as any).pendo) {
      (window as any).pendo.track('simulation_initialized', {
        persona_type: persona,
        attention_span: attentionSpan,
        technical_literacy: technicalLiteracy,
        network_profile: networkProfile,
        is_mobile: isMobile
      });
    }

    if (typeof pendo !== 'undefined') {
      pendo.track('simulation_initialized', {
        persona_type: persona,
        attention_span: attentionSpan,
        technical_literacy: technicalLiteracy,
        latency_tolerance: latencyTolerance,
        network_profile: networkProfile,
        is_mobile: isMobile,
        target_url: targetUrl
      });
    }

    onLaunch({
      persona,
      attentionSpan,
      technicalLiteracy,
      latencyTolerance,
      isMobile,
      networkProfile,
      targetUrl
    });
  };

  return (
    <div className="prometheus-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
      <div>
        <h3 className="text-glow-indigo" style={{ fontSize: '1.4rem', marginBottom: '4px' }}>
          Eidolon Foundry
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Configure and launch cohorts of autonomous agents with heterogeneous psychological profiles.
        </p>
      </div>

      {/* Segment Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Persona Segment
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {(['ANALYTICAL', 'IMPATIENT', 'FRUSTRATED'] as const).map((type) => (
            <button
              key={type}
              id={`persona-${type.toLowerCase()}`}
              type="button"
              onClick={() => handlePersonaChange(type)}
              style={{
                background: persona === type ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${persona === type ? 'var(--accent-indigo)' : 'var(--border-color)'}`,
                color: persona === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '10px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                textAlign: 'center',
                transition: 'var(--transition-smooth)'
              }}
            >
              {type === 'ANALYTICAL' && 'Analytical'}
              {type === 'IMPATIENT' && 'Impatient'}
              {type === 'FRUSTRATED' && 'Frustrated'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
          {persona === 'ANALYTICAL' && "Seeks precision, reads copy carefully, has a high tolerance for slowness."}
          {persona === 'IMPATIENT' && "Wants to go fast, scans briefly, abandons as soon as a delay is encountered."}
          {persona === 'FRUSTRATED' && "Prone to frustration, highly sensitive to complex forms or ambiguous validation errors."}
        </p>
      </div>

      {/* State Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Attention Span</span>
            <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>{attentionSpan}%</span>
          </div>
          <div>
            <input
              id="slider-attention-span"
              type="range"
              min="10"
              max="100"
              value={attentionSpan}
              onChange={(e) => setAttentionSpan(Number(e.target.value))}
              className="prometheus-slider"
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Technical Literacy</span>
            <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>{technicalLiteracy}%</span>
          </div>
          <div>
            <input
              id="slider-technical-literacy"
              type="range"
              min="10"
              max="100"
              value={technicalLiteracy}
              onChange={(e) => setTechnicalLiteracy(Number(e.target.value))}
              className="prometheus-slider"
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Latency Tolerance</span>
            <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>{latencyTolerance}%</span>
          </div>
          <div>
            <input
              id="slider-latency-tolerance"
              type="range"
              min="10"
              max="100"
              value={latencyTolerance}
              onChange={(e) => setLatencyTolerance(Number(e.target.value))}
              className="prometheus-slider"
            />
          </div>
        </div>
      </div>

      {/* Target URL & Network Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Application</label>
          <input
            id="input-target-url"
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '0.8rem',
              outline: 'none',
              fontFamily: 'monospace'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mobile Profile (Reduced Viewport)</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              id="checkbox-mobile-profile"
              type="checkbox"
              checked={isMobile}
              onChange={(e) => setIsMobile(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: 'var(--accent-teal)',
                cursor: 'pointer'
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Network Profile</label>
          <select
            id="select-network-profile"
            value={networkProfile}
            onChange={(e) => setNetworkProfile(e.target.value as any)}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          >
            <option value="FAST_FIBER">Fiber (100+ Mbps, Latency ~5ms)</option>
            <option value="SLOW_3G">Unstable Mobile 3G (1.2 Mbps, Latency ~250ms)</option>
            <option value="LATENT_CRITICAL">Degraded Network (500 Kbps, 5% Packet Loss)</option>
          </select>
        </div>
      </div>

      {/* Action Trigger */}
      <button
        id="btn-launch-simulation"
        onClick={handleSimulate}
        disabled={isStreaming}
        className="btn-primary"
        style={{
          width: '100%',
          justifyContent: 'center',
          marginTop: '10px',
          height: '45px'
        }}
      >
        {isStreaming ? (
          <>
            <span
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'pulse-scale-anim 1s infinite linear'
              }}
            />
            Simulation Active...
          </>
        ) : (
          'Launch Simulation'
        )}
      </button>
    </div>
  );
}
