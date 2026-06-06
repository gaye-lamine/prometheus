'use client';

import React, { useState, useEffect } from 'react';
import PersonaFoundry, { PersonaConfig } from '../components/PersonaFoundry';
import TelemetryStream from '../components/TelemetryStream';
import FrictionCanvas from '../components/FrictionCanvas';
import PostMortemReport from '../components/PostMortemReport';
import NovusBridge from '../components/NovusBridge';
import { useSimulationStream } from '../hooks/useSimulationStream';

declare const pendo: any;

const pendoInitialized = { current: false };
const trackedCompletedSimulations = new Set<string>();

export default function Home() {
  const [activeTab, setActiveTab] = useState<'SIMULATION' | 'NOVUS_BRIDGE'>('SIMULATION');
  const [simulationId, setSimulationId] = useState<string>('sim_4892');
  const [selectedPersona, setSelectedPersona] = useState<'IMPATIENT' | 'ANALYTICAL' | 'FRUSTRATED'>('ANALYTICAL');
  const [targetUrl, setTargetUrl] = useState<string>('https://checkout.prometheus.test/checkout_form_v2');
  
  // Lifted calibration state
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [discrepancy, setDiscrepancy] = useState(8.4);
  const [lastTuned, setLastTuned] = useState('Today at 16:20');
  
  // Lifted DOM elements mapping state
  const [mappedElements, setMappedElements] = useState<any[]>([]);

  useEffect(() => {
    if (!pendoInitialized.current) {
      pendoInitialized.current = true;
      pendo.initialize({
        visitor: {
          id: ''
        }
      });
    }
  }, []);

  const {
    streamData,
    isStreaming,
    startStream,
    resetStream
  } = useSimulationStream();

  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);

  // Reset elements database when target application URL changes
  useEffect(() => {
    setMappedElements([]);
  }, [targetUrl]);

  // Listen globally to the iframe DOM mapper postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PROMETHEUS_DOM_MAP') {
        setMappedElements(event.data.elements);
        if (typeof pendo !== 'undefined') {
          const elements = event.data.elements || [];
          pendo.track('dom_mapping_received', {
            element_count: elements.length,
            target_url: targetUrl,
            interactive_element_count: elements.filter((el: any) => el.tag === 'input' || el.tag === 'button' || el.tag === 'a').length
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (streamData.length > 0) {
      const latest = streamData[streamData.length - 1];
      const isFinished = latest.last_action === 'ABANDON' || streamData.length >= 5;
      if (isFinished) {
        if (typeof pendo !== 'undefined' && !trackedCompletedSimulations.has(simulationId)) {
          trackedCompletedSimulations.add(simulationId);
          pendo.track('simulation_completed', {
            simulation_id: simulationId,
            persona: selectedPersona,
            success: latest.last_action !== 'ABANDON',
            max_frustration: Math.max(...streamData.map(s => s.frustration_matrix)),
            friction_point: latest.last_action === 'ABANDON' ? latest.current_step : 'None',
            steps_count: streamData.length,
            is_calibrated: isCalibrated
          });
        }
        setSimulationHistory(prev => {
          if (prev.some(run => run.id === simulationId)) {
            return prev.map(run => run.id === simulationId ? {
              id: simulationId,
              persona: selectedPersona,
              stepsCount: streamData.length,
              maxFrustration: Math.max(...streamData.map(s => s.frustration_matrix)),
              success: latest.last_action !== 'ABANDON',
              frictionPoint: latest.last_action === 'ABANDON' ? latest.current_step : 'None'
            } : run);
          }
          return [...prev, {
            id: simulationId,
            persona: selectedPersona,
            stepsCount: streamData.length,
            maxFrustration: Math.max(...streamData.map(s => s.frustration_matrix)),
            success: latest.last_action !== 'ABANDON',
            frictionPoint: latest.last_action === 'ABANDON' ? latest.current_step : 'None'
          }];
        });
      }
    }
  }, [streamData, simulationId, selectedPersona]);

  const handleLaunchSimulation = (config: PersonaConfig) => {
    const newSimId = 'sim_' + Math.floor(Math.random() * 9000 + 1000);
    setSimulationId(newSimId);
    setSelectedPersona(config.persona);
    setTargetUrl(config.targetUrl);

    if (typeof pendo !== 'undefined') {
      pendo.track('simulation_launched', {
        simulation_id: newSimId,
        persona: config.persona,
        is_calibrated: isCalibrated,
        target_url: config.targetUrl
      });
    }

    // Trigger direct connection immediately using new parameters with calibration state
    startStream(newSimId, config.persona, isCalibrated);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* PREMIUM GLOWING STICKY HEADER */}
      <header 
        style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 100, 
          background: 'rgba(5, 7, 12, 0.85)', 
          backdropFilter: 'blur(12px)', 
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* Logo and Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <h1 className="text-glow-teal" style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1 }}>
              PROMETHEUS
            </h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Predictive UX Simulation Engine
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <nav style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setActiveTab('SIMULATION')}
            className={`tab-button ${activeTab === 'SIMULATION' ? 'active' : ''}`}
          >
            Simulation Space
          </button>
          <button
            onClick={() => setActiveTab('NOVUS_BRIDGE')}
            className={`tab-button ${activeTab === 'NOVUS_BRIDGE' ? 'active' : ''}`}
          >
            Novus.ai Bridge
          </button>
        </nav>

        {/* Status indicator badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '99px', padding: '6px 14px', fontSize: '0.75rem' }}>
          <span 
            style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              background: isStreaming ? 'var(--accent-teal)' : isCalibrated ? 'var(--accent-teal)' : 'var(--text-muted)',
              boxShadow: isStreaming || isCalibrated ? '0 0 6px var(--accent-teal)' : 'none'
            }} 
            className={isStreaming ? 'pulse-scale' : ''}
          />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {isStreaming ? 'SIMULATOR ACTIVE' : isCalibrated ? 'CALIBRATED' : 'SYS_READY'}
          </span>
        </div>
      </header>

      {/* APP CONTENT MAIN CONTAINER */}
      <main style={{ flex: 1, padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {activeTab === 'SIMULATION' ? (
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '380px 1fr', 
              gap: '30px', 
              alignItems: 'stretch'
            }}
          >
            
            {/* Left Control Column (Sliders & Final Report) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <PersonaFoundry 
                onLaunch={handleLaunchSimulation} 
                isStreaming={isStreaming} 
              />
              <PostMortemReport 
                streamData={streamData} 
                persona={selectedPersona} 
              />
            </div>

            {/* Right Simulation Screen & Log Terminal Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', minHeight: '800px' }}>
              
              {/* Friction SVG Overlay Matrix Canvas */}
              <div style={{ flex: 1.2, minHeight: '480px' }}>
                <FrictionCanvas 
                  streamData={streamData} 
                  isStreaming={isStreaming} 
                  targetUrl={targetUrl}
                  isCalibrated={isCalibrated}
                  mappedElements={mappedElements}
                  setMappedElements={setMappedElements}
                />
              </div>

              {/* Logs thought stream terminal console */}
              <div style={{ flex: 0.8, minHeight: '320px' }}>
                <TelemetryStream 
                  streamData={streamData} 
                  isStreaming={isStreaming} 
                />
              </div>

            </div>

          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <NovusBridge 
              simulationHistory={simulationHistory} 
              isCalibrated={isCalibrated}
              setIsCalibrated={setIsCalibrated}
              discrepancy={discrepancy}
              setDiscrepancy={setDiscrepancy}
              lastTuned={lastTuned}
              setLastTuned={setLastTuned}
              mappedElements={mappedElements}
              targetUrl={targetUrl}
            />
          </div>
        )}

      </main>

      {/* Footer bar */}
      <footer 
        style={{ 
          background: 'rgba(5,7,12,0.9)', 
          borderTop: '1px solid var(--border-color)', 
          padding: '16px 40px', 
          textAlign: 'center', 
          fontSize: '0.7rem', 
          color: 'var(--text-muted)' 
        }}
      >
        <p>
          Prometheus – Developed for World Product Day 2026 in partnership with Novus.ai. All rights reserved.
        </p>
      </footer>

      {/* Background DOM mapping iframe proxy (runs only when needed to map custom URL elements in bridge tab) */}
      {(() => {
        const isDefaultCheckout = targetUrl.toLowerCase().includes('checkout_form_v2') || targetUrl.toLowerCase().includes('prometheus.test');
        const clientHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
        if (!isDefaultCheckout && mappedElements.length === 0) {
          return (
            <iframe
              src={`http://${clientHost}:8000/api/proxy?url=${encodeURIComponent(targetUrl)}`}
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, border: 'none', pointerEvents: 'none' }}
              title="Background DOM Scanner Proxy"
            />
          );
        }
        return null;
      })()}

    </div>
  );
}
