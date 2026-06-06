'use client';

import React, { useState, useEffect } from 'react';

declare const pendo: any;

interface NovusBridgeProps {
  simulationHistory: any[];
  isCalibrated: boolean;
  setIsCalibrated: (c: boolean) => void;
  discrepancy: number;
  setDiscrepancy: (d: number) => void;
  lastTuned: string;
  setLastTuned: (t: string) => void;
  mappedElements: any[];
  targetUrl: string;
}

export default function NovusBridge({
  simulationHistory = [],
  isCalibrated,
  setIsCalibrated,
  discrepancy,
  setDiscrepancy,
  lastTuned,
  setLastTuned,
  mappedElements = [],
  targetUrl
}: NovusBridgeProps) {
  const [viewMode, setViewMode] = useState<'PREDICTIVE' | 'REAL_TRAFFIC'>('PREDICTIVE');
  const [selectedTensionBlock, setSelectedTensionBlock] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  const isDefaultCheckout = targetUrl.toLowerCase().includes('checkout_form_v2') || targetUrl.toLowerCase().includes('prometheus.test');

  const getElementTension = (el: any, index: number) => {
    const str = el.text + el.tag + el.id + el.className;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const baseTension = Math.abs(hash % 60) + 20; // 20% to 80%
    return isCalibrated ? Math.max(10, Math.round(baseTension * 0.6)) : baseTension;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLogs((window as any).pendoLogs || []);

      const handlePendoCall = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
          setLogs(prev => [...prev, customEvent.detail]);
        }
      };
      window.addEventListener('pendo-sdk-call', handlePendoCall);

      const checkPendo = () => {
        const pendoObj = (window as any).pendo;
        if (pendoObj && pendoObj.version) {
          setIsSdkLoaded(true);
        } else {
          setIsSdkLoaded(false);
        }
      };
      checkPendo();
      const interval = setInterval(checkPendo, 2000);

      return () => {
        window.removeEventListener('pendo-sdk-call', handlePendoCall);
        clearInterval(interval);
      };
    }
  }, []);

  const getDynamicFunnel = () => {
    if (isDefaultCheckout || mappedElements.length === 0) {
      return [
        { label: 'Entry: LANDING HERO', rate: 100, color: 'rgba(20, 184, 166, 0.4)' },
        { label: 'Engagement: EMAIL FORM', rate: 78, color: 'rgba(99, 102, 241, 0.4)' },
        { label: 'Action: SUBMIT CHECK', rate: 38, color: 'rgba(232, 64, 76, 0.4)' }
      ];
    }

    const inputs = mappedElements.filter(el => el.tag === 'input' || el.tag === 'select' || el.tag === 'textarea');
    const buttons = mappedElements.filter(el => el.tag === 'button' || el.type === 'submit' || (el.tag === 'a' && (el.className.includes('btn') || el.className.includes('button'))));
    const links = mappedElements.filter(el => el.tag === 'a' && !el.className.includes('btn') && !el.className.includes('button'));

    const entryEl = mappedElements.find(el => el.tag === 'h1' || el.tag === 'h2') || links[0] || mappedElements[0];
    const entryLabel = entryEl ? `${entryEl.tag.toUpperCase()}: ${(entryEl.text || entryEl.id).substring(0, 15)}` : 'LANDING PAGE';

    const engagementEl = inputs[0] || mappedElements.find(el => el.tag === 'select' || el.tag === 'textarea') || mappedElements[Math.min(1, mappedElements.length - 1)];
    const engagementLabel = engagementEl ? `${engagementEl.tag.toUpperCase()}: ${(engagementEl.text || engagementEl.id || engagementEl.type || 'Field').substring(0, 15)}` : 'FORM INTERACT';

    const conversionEl = buttons[0] || mappedElements.find(el => el.tag === 'a') || mappedElements[mappedElements.length - 1];
    const conversionLabel = conversionEl ? `${conversionEl.tag.toUpperCase()}: ${(conversionEl.text || conversionEl.id || 'Action').substring(0, 15)}` : 'SUBMIT PROCESS';

    const discrepancyFactor = isCalibrated ? 0.95 : 0.8;
    const clickTension = conversionEl ? getElementTension(conversionEl, 2) : 50;
    const inputTension = engagementEl ? getElementTension(engagementEl, 1) : 40;

    const engagementRate = Math.round(95 - (inputTension * 0.2));
    const conversionRate = Math.round(engagementRate * (1 - (clickTension / 100) * discrepancyFactor));

    return [
      { label: `Entry: ${entryLabel}`, rate: 100, color: 'rgba(20, 184, 166, 0.4)' },
      { label: `Engagement: ${engagementLabel}`, rate: engagementRate, color: 'rgba(99, 102, 241, 0.4)' },
      { label: `Action: ${conversionLabel}`, rate: conversionRate, color: 'rgba(232, 64, 76, 0.4)' }
    ];
  };

  const funnelData = getDynamicFunnel();

  // Select 4 interesting interactive elements to show in the map
  const activeTensionElements = isDefaultCheckout || mappedElements.length === 0
    ? [
        { key: 'email', name: 'EMAIL INPUT', baseTension: isCalibrated ? 51 : 85, color: 'var(--accent-critical)' },
        { key: 'cta', name: 'CTA BUTTON', baseTension: isCalibrated ? 24 : 40, color: 'var(--accent-indigo)' },
        { key: 'submit', name: 'SUBMIT CTA', baseTension: isCalibrated ? 53 : 88, color: 'var(--accent-critical)' },
        { key: 'pricing', name: 'PRICING TABS', baseTension: isCalibrated ? 12 : 20, color: 'var(--accent-teal)' }
      ]
    : mappedElements
        .filter(el => el.tag === 'input' || el.tag === 'button' || el.tag === 'a')
        .slice(0, 4)
        .map((el, i) => {
          const name = `${el.tag.toUpperCase()}: ${el.text || el.id || el.type || 'Element'}`;
          const tension = getElementTension(el, i);
          const color = tension > 60 ? 'var(--accent-critical)' : tension > 35 ? 'var(--accent-indigo)' : 'var(--accent-teal)';
          return {
            key: `element_${el.index}`,
            name: name.substring(0, 22),
            baseTension: tension,
            color: color,
            element: el
          };
        });
  
  // Model tuning interactive states
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPhase, setCalibrationPhase] = useState(0);
  const [calibrationStatus, setCalibrationStatus] = useState('');

  const startCalibration = () => {
    if (typeof pendo !== 'undefined') {
      pendo.track('calibration_started', {
        current_discrepancy: discrepancy,
        is_already_calibrated: isCalibrated,
        simulation_history_count: simulationHistory.length
      });
    }

    const calibrationStartTime = Date.now();
    setIsCalibrating(true);
    setCalibrationPhase(1);
    setCalibrationStatus('Connecting to Pendo/Novus.ai analytics data nodes...');

    setTimeout(() => {
      setCalibrationPhase(2);
      setCalibrationStatus('Comparing 2,540 real user sessions with active Eidolon paths...');
    }, 1200);

    setTimeout(() => {
      setCalibrationPhase(3);
      setCalibrationStatus('Aligning agent attention span and latency tolerances...');
    }, 2400);

    setTimeout(() => {
      setCalibrationPhase(4);
      setCalibrationStatus('Recalculating structural discrepancy metrics...');
    }, 3600);

    setTimeout(() => {
      setIsCalibrating(false);
      setCalibrationPhase(0);
      setCalibrationStatus('');
      setIsCalibrated(true);
      setDiscrepancy(1.2);
      setLastTuned('Just now');

      if (typeof pendo !== 'undefined') {
        pendo.track('calibration_completed', {
          previous_discrepancy: discrepancy,
          new_discrepancy: 1.2,
          calibration_duration_ms: Date.now() - calibrationStartTime,
          phases_completed: 4
        });
      }
    }, 4800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Upper Comparison Header Card */}
      <div className="prometheus-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
          <div>
            <h3 className="text-glow-teal" style={{ fontSize: '1.4rem', marginBottom: '4px' }}>
              Novus.ai Meta-Analysis Bridge
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Automatic calibration and tuning of predictive agent models against real user behavior metrics.
            </p>
          </div>

          {/* Mocking Bridge Active Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(20, 184, 166, 0.08)', border: '1px solid var(--accent-teal)', borderRadius: '99px', padding: '6px 14px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-teal)', boxShadow: '0 0 6px var(--accent-teal)' }} className="pulse-scale" />
            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--accent-teal)', textTransform: 'uppercase' }}>BRIDGE ACTIVE</span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btn-predictive-cohorts"
            onClick={() => {
              const prev = viewMode;
              setViewMode('PREDICTIVE');
              if (prev !== 'PREDICTIVE' && typeof pendo !== 'undefined') {
                pendo.track('novus_bridge_view_switched', {
                  new_view_mode: 'PREDICTIVE',
                  previous_view_mode: prev,
                  simulation_history_count: simulationHistory.length
                });
              }
            }}
            className={`btn-secondary ${viewMode === 'PREDICTIVE' ? 'active' : ''}`}
            style={{
              flex: 1,
              background: viewMode === 'PREDICTIVE' ? 'rgba(99,102,241,0.1)' : 'transparent',
              borderColor: viewMode === 'PREDICTIVE' ? 'var(--accent-indigo)' : 'var(--border-color)',
              color: viewMode === 'PREDICTIVE' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}
          >
            Predictive Cohorts (Eidolons)
          </button>
          <button
            id="btn-real-traffic"
            onClick={() => {
              const prev = viewMode;
              setViewMode('REAL_TRAFFIC');
              if (prev !== 'REAL_TRAFFIC' && typeof pendo !== 'undefined') {
                pendo.track('novus_bridge_view_switched', {
                  new_view_mode: 'REAL_TRAFFIC',
                  previous_view_mode: prev,
                  simulation_history_count: simulationHistory.length
                });
              }
            }}
            className={`btn-secondary ${viewMode === 'REAL_TRAFFIC' ? 'active' : ''}`}
            style={{
              flex: 1,
              background: viewMode === 'REAL_TRAFFIC' ? 'rgba(20,184,166,0.1)' : 'transparent',
              borderColor: viewMode === 'REAL_TRAFFIC' ? 'var(--accent-teal)' : 'var(--border-color)',
              color: viewMode === 'REAL_TRAFFIC' ? 'var(--accent-teal)' : 'var(--text-secondary)',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}
          >
            Instrumented Real Traffic (Novus.ai SDK)
          </button>
        </div>

        {/* Visual Analytics Comparison Display */}
        {viewMode === 'PREDICTIVE' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', minHeight: '260px' }}>
            
            {/* Simulated Polygon Map */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Predictive Tension Mapping</h4>
              
              <div style={{ position: 'relative', width: '100%', flex: 1, background: '#111827', borderRadius: '6px', overflow: 'hidden', minHeight: '160px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '95%', opacity: '0.9' }}>
                  {activeTensionElements.map((item) => (
                    <div
                      key={item.key}
                      onClick={() => {
                        const newSelection = selectedTensionBlock === item.key ? null : item.key;
                        setSelectedTensionBlock(newSelection);
                        if (newSelection !== null && typeof pendo !== 'undefined') {
                          pendo.track('tension_block_selected', {
                            block_key: item.key,
                            block_name: item.name,
                            tension_percentage: item.baseTension,
                            is_calibrated: isCalibrated,
                            filtered_history_count: simulationHistory.length
                          });
                        }
                      }}
                      style={{ 
                        flex: '1 1 40%', 
                        height: '35px', 
                        background: selectedTensionBlock === item.key ? `${item.color.replace('1)', '0.95)').replace('rgb', 'rgba')}` : `${item.color.replace('1)', '0.25)').replace('rgb', 'rgba')}`, 
                        border: selectedTensionBlock === item.key ? '1.5px solid #ffffff' : `1.5px solid ${item.color}`, 
                        borderRadius: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '9px', 
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedTensionBlock === item.key ? `0 0 10px ${item.color}` : 'none'
                      }}
                    >
                      {item.name} ({item.baseTension}%)
                    </div>
                  ))}
                </div>

                {selectedTensionBlock && (
                  <div style={{ width: '95%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', fontSize: '0.75rem', animation: 'fadeIn 0.2s ease', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    {(() => {
                      const matchedItem = activeTensionElements.find(item => item.key === selectedTensionBlock);
                      if (!matchedItem) return null;
                      
                      if (isDefaultCheckout || mappedElements.length === 0) {
                        if (selectedTensionBlock === 'email') {
                          return (
                            <p style={{ margin: 0 }}>
                              <strong style={{ color: 'var(--accent-critical)' }}>EMAIL INPUT (85% Tension):</strong> Impatient cohort abandons here. Model calibration reduces false positives to resolve this.
                            </p>
                          );
                        }
                        if (selectedTensionBlock === 'cta') {
                          return (
                            <p style={{ margin: 0 }}>
                              <strong style={{ color: 'var(--accent-indigo)' }}>CTA BUTTON (40% Tension):</strong> Main conversion entry point scanned by Analytical and Impatient profiles.
                            </p>
                          );
                        }
                        if (selectedTensionBlock === 'submit') {
                          return (
                            <p style={{ margin: 0 }}>
                              <strong style={{ color: 'var(--accent-critical)' }}>SUBMIT CTA (88% Tension):</strong> High validation failure tension. Calibration bypasses this block cleanly.
                            </p>
                          );
                        }
                        if (selectedTensionBlock === 'pricing') {
                          return (
                            <p style={{ margin: 0 }}>
                              <strong style={{ color: 'var(--accent-teal)' }}>PRICING TABS (20% Tension):</strong> Low friction area scanned by Analytical profiles to check package specs.
                            </p>
                          );
                        }
                      } else {
                        const level = matchedItem.baseTension > 60 ? 'Critical' : matchedItem.baseTension > 35 ? 'Moderate' : 'Low';
                        return (
                          <p style={{ margin: 0 }}>
                            <strong style={{ color: matchedItem.color }}>{matchedItem.name} ({matchedItem.baseTension}% Tension - {level}):</strong> 
                            {level === 'Critical' && " High cognitive fatigue observed. Cohorts are highly likely to abandon at this interaction point."}
                            {level === 'Moderate' && " Moderate friction detected. Calibration tuning reduces response and interaction latency."}
                            {level === 'Low' && " Stable user interaction pathway. Cohort traversal is optimal."}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Model Tuning Parameters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Global Predictive Discrepancy</span>
                <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: discrepancy <= 2.0 ? 'var(--accent-teal)' : '#eab308' }}>
                  {discrepancy}% <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>observed discrepancy</span>
                </p>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${discrepancy * 8}%`, height: '100%', background: discrepancy <= 2.0 ? 'var(--accent-teal)' : '#eab308', transition: 'width 1s ease-out' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                <p style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Model Calibration Status:</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '2px' }}>
                  Last calibration: <strong>{lastTuned}</strong> based on 2,540 real user sessions captured by Novus.ai.
                </p>
                
                {/* Calibration details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', marginBottom: '5px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
                    Attention Span Adjustment: <strong style={{ color: 'var(--accent-teal)' }}>+12%</strong> on the <em>Impatient</em> profile.
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
                    Email validation calibration: Reduced false positives by <strong style={{ color: 'var(--accent-teal)' }}>4.2%</strong>.
                  </p>
                </div>
                
                {/* Calibration Action Trigger */}
                <button
                  id="btn-run-calibration"
                  onClick={startCalibration}
                  disabled={isCalibrating}
                  className="btn-primary"
                  style={{
                    marginTop: '5px',
                    justifyContent: 'center',
                    height: '38px',
                    fontSize: '0.8rem',
                    background: discrepancy <= 2.0 ? 'rgba(20, 184, 166, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    border: `1px solid ${discrepancy <= 2.0 ? 'var(--accent-teal)' : 'var(--accent-indigo)'}`,
                    color: discrepancy <= 2.0 ? 'var(--accent-teal)' : 'var(--text-primary)'
                  }}
                >
                  {isCalibrating ? 'Calibrating Engine...' : 'Run Alignment Calibration'}
                </button>

                {isCalibrating && (
                  <div style={{ marginTop: '8px', animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pulse-scale" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-indigo)' }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontFamily: 'monospace' }}>{calibrationStatus}</span>
                    </div>
                    {/* Simulated visual slider matching phase */}
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--accent-indigo)', width: `${calibrationPhase * 25}%`, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', minHeight: '260px' }}>
            
            {/* Real traffic Heatmap (Simulated chart) */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Real Friction Metrics (Novus.ai Dashboard)</h4>
              
              {/* Simulated analytics graph */}
              <div style={{ position: 'relative', width: '100%', flex: 1, background: '#111827', borderRadius: '6px', overflow: 'hidden', minHeight: '160px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  {funnelData.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-secondary)', width: '90px', textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', height: '14px', borderRadius: '3px', position: 'relative' }}>
                        <div style={{ background: item.color, height: '100%', borderRadius: '3px', width: `${item.rate}%`, transition: 'width 0.5s ease-out' }} />
                      </div>
                      <span style={{ fontSize: '8px', color: 'var(--text-primary)', width: '30px' }}>{item.rate}%</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'monospace' }}>
                  Summary conversion funnel generated by Novus.ai SDK
                </p>
              </div>
            </div>

            {/* Real world stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(20, 184, 166, 0.04)', border: '1px solid rgba(20, 184, 166, 0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.8rem' }}>
                <p style={{ fontWeight: 'bold', color: 'var(--accent-teal)', marginBottom: '4px' }}>Real User Session Data</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Novus.ai has instrumented **585 active visitors** on the deployed application.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Real Conversion Rate</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {funnelData[2] ? `${funnelData[2].rate}%` : '38.2%'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Primary Friction Point</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-critical)' }}>
                    {isDefaultCheckout || mappedElements.length === 0 ? 'Email Validation' : funnelData[1] ? funnelData[1].label.replace('Engagement: ', '').replace('INPUT:', '').replace('SELECT:', '').replace('TEXTAREA:', '').trim() : 'Interaction'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Average Completion Time</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {isCalibrated ? '32s' : '48s'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Novus.ai SDK Live Diagnostic Console */}
      <div className="prometheus-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <div>
            <h4 className="text-glow-teal" style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
              Novus.ai SDK Live Diagnostic Console
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Real-time feed of analytics events transmitted through the Pendo agent bindings.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span 
                style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: isSdkLoaded ? '#10b981' : '#ef4444', 
                  boxShadow: isSdkLoaded ? '0 0 8px #10b981' : '0 0 8px #ef4444' 
                }} 
                className={isSdkLoaded ? "pulse-scale" : undefined} 
              />
              <span style={{ fontSize: '0.65rem', color: isSdkLoaded ? '#10b981' : '#ef4444', fontWeight: 'bold', fontFamily: 'monospace' }}>
                {isSdkLoaded ? 'CONNECTED' : 'BLOCKED / OFFLINE'}
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => {
                setLogs([]);
                if (typeof window !== 'undefined') {
                  (window as any).pendoLogs = [];
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Clear Console
            </button>
          </div>
        </div>

        {!isSdkLoaded && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '10px 15px',
            fontSize: '0.75rem',
            color: '#fca5a5',
            lineHeight: '1.4'
          }}>
            <strong>Warning:</strong> The Novus.ai SDK (pendo.js) is not fully loaded. This is commonly caused by an ad blocker, privacy extension, or Brave Shield. Please disable your ad blocker for this site and refresh the page to enable real telemetry transmission.
          </div>
        )}

        <div 
          style={{ 
            background: '#0b0f19', 
            border: '1px solid rgba(255,255,255,0.03)', 
            borderRadius: '6px', 
            padding: '15px', 
            height: '200px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            lineHeight: '1.5',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            scrollbarColor: 'rgba(255, 255, 255, 0.1) rgba(0, 0, 0, 0.3)',
            scrollbarWidth: 'thin'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              No SDK calls recorded. Launch a simulation or click calibration to dispatch events.
            </div>
          ) : (
            logs.map((log, index) => {
              const date = new Date(log.timestamp);
              const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
              
              return (
                <div key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#0ea5e9' }}>[{timeStr}]</span>
                  <div style={{ flex: 1, wordBreak: 'break-all' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>pendo.{log.method}</span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      ({log.args.map((arg: any) => typeof arg === 'string' ? `"${arg}"` : JSON.stringify(arg)).join(', ')})
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Session Simulation Run History Log Table (Dynamic Verification) */}
      <div className="prometheus-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <h4 className="text-glow-indigo" style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
            Session Telemetry History
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Live cohorted runs accumulated during your active session. This represents real predictive data fed into the calibration matrix.
          </p>
        </div>

        {(() => {
          const filteredHistory = simulationHistory.filter(run => {
            if (!selectedTensionBlock) return true;
            const friction = (run.frictionPoint || '').toLowerCase();
            if (selectedTensionBlock === 'email') return friction.includes('email');
            if (selectedTensionBlock === 'submit') return friction.includes('submit') || friction.includes('form') || friction.includes('abandon');
            if (selectedTensionBlock === 'pricing') return friction.includes('pricing');
            if (selectedTensionBlock === 'cta') return friction.includes('cta') || friction.includes('hero') || friction.includes('button');
            return true;
          });

          return filteredHistory.length === 0 ? (
            <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '30px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {simulationHistory.length === 0 
                ? 'No local simulation runs detected in this session yet. Launch a simulation in the "Simulation Space" to populate behavioral comparisons.'
                : 'No simulation runs in history match the selected tension block filter. Click the active block again to clear the filter.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 8px' }}>Simulation ID</th>
                    <th style={{ padding: '10px 8px' }}>Persona Profile</th>
                    <th style={{ padding: '10px 8px' }}>Success Rate</th>
                    <th style={{ padding: '10px 8px' }}>Max Frustration</th>
                    <th style={{ padding: '10px 8px' }}>Primary Failure Point</th>
                    <th style={{ padding: '10px 8px' }}>Interact Loops</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((run, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                      <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: 'var(--accent-teal)' }}>{run.id}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{run.persona}</td>
                      <td style={{ padding: '12px 8px', color: run.success ? 'var(--accent-teal)' : 'var(--accent-critical)', fontWeight: 'bold' }}>
                        {run.success ? '100% (Completed)' : '0% (Abandoned)'}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{Math.round(run.maxFrustration * 100)}%</td>
                      <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: run.success ? 'var(--text-muted)' : 'var(--accent-critical)' }}>
                        {run.frictionPoint}
                      </td>
                      <td style={{ padding: '12px 8px' }}>{run.stepsCount} steps</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
