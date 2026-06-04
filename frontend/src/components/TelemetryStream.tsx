'use client';

import React, { useEffect, useRef } from 'react';
import { TelemetryState } from '../hooks/useSimulationStream';

interface TelemetryStreamProps {
  streamData: TelemetryState[];
  isStreaming: boolean;
}

export default function TelemetryStream({ streamData, isStreaming }: TelemetryStreamProps) {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the terminal logs when new states arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamData]);

  // Extract the latest telemetry state
  const latestState = streamData[streamData.length - 1];
  const frustration = latestState ? latestState.frustration_matrix : 0.0;
  
  // Decide the gauge color and warning state based on frustration score
  let gaugeColor = 'var(--accent-teal)';
  let isFrustrationCritical = false;
  if (frustration > 0.4 && frustration <= 0.75) {
    gaugeColor = 'var(--accent-indigo)';
  } else if (frustration > 0.75) {
    gaugeColor = 'var(--accent-critical)';
    isFrustrationCritical = true;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Real-time metrics bar */}
      <div className="prometheus-card" style={{ padding: '18px' }}>
        <h4 className="text-glow-teal" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
          Cognitive Load Monitor
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '20px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Frustration Level (Cognitive Load)</span>
              <span 
                style={{ 
                  color: gaugeColor, 
                  fontWeight: 'bold',
                  textShadow: `0 0 8px ${gaugeColor}`
                }}
              >
                {Math.round(frustration * 100)}%
              </span>
            </div>
            
            {/* ProgressBar */}
            <div style={{ background: 'rgba(255,255,255,0.05)', height: '10px', borderRadius: '99px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${frustration * 100}%`, 
                  height: '100%', 
                  background: gaugeColor,
                  boxShadow: `0 0 10px ${gaugeColor}`,
                  borderRadius: '99px',
                  transition: 'width 0.4s ease-out, background-color 0.4s ease'
                }}
              />
            </div>
          </div>

          {/* Indicator Light */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: isFrustrationCritical ? 'rgba(232, 64, 76, 0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isFrustrationCritical ? 'var(--accent-critical)' : 'var(--border-color)'}`,
              borderRadius: '8px',
              padding: '8px 12px',
              height: '42px',
              gap: '8px'
            }}
            className={isFrustrationCritical ? 'glow-pulse-red' : ''}
          >
            <div 
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: gaugeColor,
                boxShadow: `0 0 8px ${gaugeColor}`
              }} 
            />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              {isFrustrationCritical ? 'CRITICAL FATIGUE' : isStreaming ? 'SIMULATION' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Live States Info */}
        {latestState && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Active Action:</span>
              <span 
                style={{ 
                  marginLeft: '6px', 
                  color: latestState.last_action === 'ABANDON' ? 'var(--accent-critical)' : 'var(--accent-teal)',
                  fontWeight: 600
                }}
              >
                {latestState.last_action}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Active Step:</span>
              <span style={{ marginLeft: '6px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                {latestState.current_step}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Raw Thought Stream Terminal */}
      <div 
        className="prometheus-card" 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          minHeight: '280px',
          background: 'rgba(5, 7, 12, 0.95)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            raw_thought_stream.log
          </span>
        </div>

        {/* Stream Terminal Logs */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            fontFamily: 'monospace', 
            fontSize: '0.8rem',
            paddingRight: '6px'
          }}
        >
          {streamData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
              Waiting for Eidolon Foundry initialization...
            </div>
          ) : (
            streamData.map((state, i) => (
              <div 
                key={i} 
                style={{ 
                  borderLeft: `2px solid ${state.last_action === 'ABANDON' ? 'var(--accent-critical)' : 'rgba(255,255,255,0.08)'}`,
                  paddingLeft: '10px',
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '2px' }}>
                  <span>[{state.agent_id}] - Action: {state.last_action}</span>
                  <span>Step: {state.current_step}</span>
                </div>
                <p 
                  style={{ 
                    color: state.last_action === 'ABANDON' ? 'var(--accent-critical)' : state.frustration_matrix > 0.7 ? 'var(--accent-indigo)' : 'var(--text-primary)'
                  }}
                >
                  &gt; {state.cognitive_log}
                </p>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
