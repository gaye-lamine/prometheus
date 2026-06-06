'use client';

import React, { useState, useEffect } from 'react';
import { TelemetryState } from '../hooks/useSimulationStream';

declare const pendo: any;

interface FrictionCanvasProps {
  streamData: TelemetryState[];
  isStreaming: boolean;
  targetUrl: string;
  isCalibrated: boolean;
  mappedElements: MappedElement[];
  setMappedElements: (elements: MappedElement[]) => void;
}

interface MappedElement {
  index: number;
  tag: string;
  type: string;
  text: string;
  id: string;
  className: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function FrictionCanvas({ 
  streamData, 
  isStreaming, 
  targetUrl, 
  isCalibrated,
  mappedElements,
  setMappedElements
}: FrictionCanvasProps) {
  const latestState = streamData[streamData.length - 1];

  const isDefaultCheckout = targetUrl.toLowerCase().includes('checkout_form_v2') || targetUrl.toLowerCase().includes('prometheus.test');

  // Helper to dynamically match step states to DOM nodes inside the proxy iframe
  const resolveCoords = (state: TelemetryState): [number, number, number, number] => {
    if (isDefaultCheckout) {
      return (state.target_coordinates || [0, 0, 0, 0]) as [number, number, number, number];
    }

    if (mappedElements.length === 0) {
      return (state.target_coordinates || [0, 0, 0, 0]) as [number, number, number, number];
    }

    const step = state.current_step.toLowerCase();
    let match: MappedElement | undefined;

    if (step.includes('email')) {
      match = mappedElements.find(el => 
        el.tag === 'input' && (el.type === 'email' || el.id.toLowerCase().includes('email') || el.className.toLowerCase().includes('email') || el.text.toLowerCase().includes('email'))
      ) || mappedElements.find(el => el.tag === 'input');
    } else if (step.includes('cta') || step.includes('button') || step.includes('submit')) {
      match = mappedElements.find(el => 
        (el.tag === 'button' || el.tag === 'a' || el.type === 'submit') &&
        (el.text.toLowerCase().includes('submit') || el.text.toLowerCase().includes('start') || el.text.toLowerCase().includes('go') || el.text.toLowerCase().includes('log') || el.text.toLowerCase().includes('sign') || el.id.toLowerCase().includes('submit') || el.className.toLowerCase().includes('submit'))
      ) || mappedElements.find(el => el.tag === 'button' || el.tag === 'a');
    } else if (step.includes('cookie')) {
      match = mappedElements.find(el => 
        el.text.toLowerCase().includes('accept') || el.text.toLowerCase().includes('agree') || el.text.toLowerCase().includes('cookie') || el.text.toLowerCase().includes('allow')
      );
    } else if (step.includes('pricing') || step.includes('tab') || step.includes('plan')) {
      match = mappedElements.find(el => 
        el.text.toLowerCase().includes('pricing') || el.text.toLowerCase().includes('pro') || el.text.toLowerCase().includes('plan') || el.id.toLowerCase().includes('pricing')
      );
    } else if (step.includes('terms') || step.includes('condition')) {
      match = mappedElements.find(el => 
        el.text.toLowerCase().includes('terms') || el.text.toLowerCase().includes('condition') || el.text.toLowerCase().includes('legal')
      );
    } else if (step.includes('hero') || step.includes('landing')) {
      match = mappedElements.find(el => el.tag === 'h1' || el.tag === 'h2') || mappedElements[0];
    } else if (step.includes('feature')) {
      match = mappedElements.find(el => el.text.toLowerCase().includes('feature') || el.id.toLowerCase().includes('feature')) || mappedElements[Math.min(5, mappedElements.length - 1)];
    }

    if (!match) {
      if (state.target_coordinates && state.target_coordinates.length === 4 && (state.target_coordinates[0] > 0 || state.target_coordinates[1] > 0)) {
        return state.target_coordinates as [number, number, number, number];
      }
      match = mappedElements[0];
    }

    if (match) {
      return [match.rect.x, match.rect.y, match.rect.width, match.rect.height];
    }

    return [0, 0, 0, 0];
  };

  // Trigger programmatic action signals inside target iframe proxy
  useEffect(() => {
    if (isDefaultCheckout || !latestState || mappedElements.length === 0) return;

    const coords = resolveCoords(latestState);
    const match = mappedElements.find(el => {
      return el.rect.x === coords[0] && el.rect.y === coords[1] && el.rect.width === coords[2] && el.rect.height === coords[3];
    });

    if (match) {
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        if (latestState.last_action === 'SCROLL' || latestState.current_step.includes('feature') || latestState.current_step.includes('terms')) {
          iframe.contentWindow.postMessage({
            type: 'PROMETHEUS_ACTION',
            action: 'SCROLL_TO_ELEMENT',
            index: match.index
          }, '*');
        }

        setTimeout(() => {
          if (latestState.last_action === 'CLICK') {
            iframe.contentWindow.postMessage({
              type: 'PROMETHEUS_ACTION',
              action: 'CLICK',
              index: match.index
            }, '*');
          } else if (latestState.last_action === 'HOVER') {
            iframe.contentWindow.postMessage({
              type: 'PROMETHEUS_ACTION',
              action: 'HOVER',
              index: match.index
            }, '*');
          } else if (latestState.current_step.includes('email') && latestState.last_action === 'HOVER') {
            const emailVal = isCalibrated ? 'success@prometheus.ai' : 'invalid-email-address';
            iframe.contentWindow.postMessage({
              type: 'PROMETHEUS_ACTION',
              action: 'TYPE',
              index: match.index,
              value: emailVal
            }, '*');
          }
        }, 300);
      }
    }
  }, [latestState, mappedElements, isCalibrated]);

  // Dynamic form states to animate in sync with the local simulation telemetry
  const [emailValue, setEmailValue] = useState('');
  const [cardValue, setCardValue] = useState('');
  const [expiryValue, setExpiryValue] = useState('');
  const [cvcValue, setCvcValue] = useState('');
  const [promoValue, setPromoValue] = useState('');
  
  const [showEmailError, setShowEmailError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [cookieBannerDismissed, setCookieBannerDismissed] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Synchronize the simulated UI states with the telemetry event stream (local mock form)
  useEffect(() => {
    if (streamData.length === 0) {
      // Reset all states when simulation is cleared or idle
      setEmailValue('');
      setCardValue('');
      setExpiryValue('');
      setCvcValue('');
      setPromoValue('');
      setShowEmailError(false);
      setIsSubmitting(false);
      setIsSubmitSuccess(false);
      setCookieBannerDismissed(false);
      setActiveTooltip(null);
      return;
    }

    if (!latestState) return;

    const step = latestState.current_step;
    const action = latestState.last_action;

    // 1. Animate Email Input
    if (step === 'email_input') {
      setEmailValue(isCalibrated ? 'success@prometheus.ai' : 'john.doe@company.domain');
      setShowEmailError(false);
    }

    // 2. Animate Submit Button & Validation Error
    if (step === 'submit_button') {
      if (action === 'CLICK') {
        setIsSubmitting(true);
        if (typeof pendo !== 'undefined') {
          pendo.track('checkout_form_submitted', {
            email_value_present: emailValue.length > 0,
            card_value_present: cardValue.length > 0,
            is_calibrated: isCalibrated,
            triggered_by: 'simulation_agent'
          });
        }
        const timer = setTimeout(() => {
          setIsSubmitting(false);
          if (isCalibrated) {
            setIsSubmitSuccess(true);
            setShowEmailError(false);
            setCardValue('4242 4242 4242 4242');
            setExpiryValue('12/28');
            setCvcValue('123');
            if (typeof pendo !== 'undefined') {
              pendo.track('checkout_form_success', {
                persona: latestState?.persona,
                is_calibrated: isCalibrated,
                steps_to_success: streamData.length,
                email_value_type: 'calibrated'
              });
            }
          } else {
            setShowEmailError(true);
            if (typeof pendo !== 'undefined') {
              pendo.track('checkout_form_validation_failed', {
                email_value: emailValue.substring(0, 50),
                error_message: 'Company domain required or invalid syntax',
                persona: latestState?.persona,
                is_calibrated: isCalibrated,
                frustration_at_failure: latestState?.frustration_matrix
              });
            }
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }

    // 3. Animate Cookie Banner dismissal
    if (step === 'cookie_banner') {
      if (action === 'CLICK') {
        const timer = setTimeout(() => {
          setCookieBannerDismissed(true);
          if (typeof pendo !== 'undefined') {
            pendo.track('cookie_banner_dismissed', {
              dismiss_action: 'simulation_agent',
              persona: latestState?.persona,
              frustration_at_dismissal: latestState?.frustration_matrix,
              simulation_id: latestState?.agent_id
            });
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }

    // 4. Animate Tooltips pricing details
    if (step === 'pricing_table_pro') {
      if (action === 'HOVER') {
        setActiveTooltip('PRO_DETAILS');
      } else {
        setActiveTooltip(null);
      }
    }

    // 5. Animate success state for ANALYTICAL persona
    if (latestState.persona === 'ANALYTICAL' && streamData.length >= 5) {
      const timer = setTimeout(() => {
        setIsSubmitSuccess(true);
        setEmailValue('john.doe@analytical.com');
        setCardValue('4242 4242 4242 4242');
        setExpiryValue('12/28');
        setCvcValue('123');
      }, 1000);
      return () => clearTimeout(timer);
    }

  }, [streamData, latestState, isCalibrated]);

  // Dynamically resolve client-side proxy address
  const clientHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  const proxySrc = `http://${clientHost}:8000/api/proxy?url=${encodeURIComponent(targetUrl)}`;

  return (
    <div className="prometheus-card" style={{ padding: '0', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', background: '#0e1321' }}>
      
      {/* Mock Web Browser Bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#171e30', padding: '10px 15px', borderBottom: '1px solid var(--border-color)', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
        </div>
        
        {/* Mock Address Bar */}
        <div 
          style={{ 
            flex: 1, 
            background: 'rgba(0,0,0,0.4)', 
            borderRadius: '6px', 
            padding: '4px 12px', 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ color: 'var(--text-primary)' }}>
            {latestState ? latestState.current_step === 'terms_and_conditions' ? `${targetUrl.replace(/\/checkout_form_v2$/, '')}/terms` : targetUrl : targetUrl}
          </span>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Viewport: 1000 x 600
        </div>
      </div>

      {/* Screen Render Container */}
      <div style={{ flex: 1, position: 'relative', background: '#ffffff', color: '#1f2937', minHeight: '520px' }}>
        
        {/* SVG Tension overlay canvas */}
        <svg 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            zIndex: 30,
            pointerEvents: 'none'
          }}
        >
          {/* Loop over historical states and draw precise tension polygons */}
          {streamData.map((state, index) => {
            const [x, y, w, h] = resolveCoords(state);
            if (!x && !y && !w && !h) return null;
            
            const frust = state.frustration_matrix;
            const isLast = index === streamData.length - 1;
            const opacity = isLast ? 0.75 : 0.15;
            
            // Scaled friction colors
            const isCritical = frust > 0.75;
            const fillColor = isCritical 
              ? `rgba(232, 64, 76, ${0.25 * opacity})` 
              : `rgba(99, 102, 241, ${0.15 * opacity})`;
            const strokeColor = isCritical 
              ? `rgba(232, 64, 76, ${1 * opacity})` 
              : `rgba(99, 102, 241, ${0.8 * opacity})`;
            
            return (
              <g key={index}>
                {/* Friction Polygon (Rectangle) */}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isLast ? 2 : 1}
                  strokeDasharray={isLast && state.last_action === 'HOVER' ? '4 2' : '0'}
                  style={{ transition: 'all 0.3s ease-out' }}
                />
                
                {/* Friction indicator badge */}
                {isLast && (
                  <foreignObject x={x} y={y - 24 > 0 ? y - 24 : y + h + 4} width={w} height="20">
                    <div 
                      style={{ 
                        background: isCritical ? 'rgba(232, 64, 76, 1)' : 'rgba(99, 102, 241, 1)', 
                        color: '#ffffff', 
                        fontSize: '9px', 
                        fontWeight: 'bold', 
                        padding: '2px 6px',
                        borderRadius: '4px',
                        display: 'inline-block',
                        fontFamily: 'sans-serif',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                      }}
                    >
                      TENSION: {Math.round(frust * 100)}%
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Mouse pointer cursor animation */}
          {latestState && (
            (() => {
              const [x, y, w, h] = resolveCoords(latestState);
              const cursorX = x + w / 2;
              const cursorY = y + h / 2;
              
              if (cursorX === 0 && cursorY === 0) return null;

              return (
                <g style={{ transition: 'all 0.5s ease-out' }}>
                  {/* Cursor click wave */}
                  {latestState.last_action === 'CLICK' && (
                    <circle
                      cx={cursorX}
                      cy={cursorY}
                      r="18"
                      fill="none"
                      stroke="rgba(232, 64, 76, 0.8)"
                      strokeWidth="2"
                    >
                      <animate attributeName="r" values="5;22" dur="0.8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Cursor point circle */}
                  <circle
                    cx={cursorX}
                    cy={cursorY}
                    r="6"
                    fill={latestState.frustration_matrix > 0.75 ? 'rgba(232, 64, 76, 1)' : 'var(--accent-indigo)'}
                    style={{ filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.3))' }}
                  />
                  <path
                    d={`M ${cursorX} ${cursorY} L ${cursorX + 8} ${cursorY + 12} L ${cursorX + 3} ${cursorY + 12} L ${cursorX} ${cursorY + 16} Z`}
                    fill="#ffffff"
                    stroke="#000000"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })()
          )}
        </svg>

        {/* ========================================================== */}
        {/* Render Viewport: Local Form vs Live Proxy Iframe */}
        {/* ========================================================== */}
        {isDefaultCheckout ? (
          /* Secure Checkout View (Default Local Showcase) */
          <div style={{ width: '100%', height: '100%', minHeight: '520px', padding: '24px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', fontSize: '0.85rem' }}>
            {/* Left Checkout Form Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                  Secure Checkout Form
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Please complete your details to finalize your Prometheus license purchase.
                </p>
              </div>

              {/* Email input field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Professional Email Address</label>
                <input
                  type="text"
                  placeholder="name@company.com"
                  value={emailValue}
                  onChange={(e) => {
                    setEmailValue(e.target.value);
                    setShowEmailError(false);
                  }}
                  style={{
                    border: `1px solid ${showEmailError ? 'rgba(232, 64, 76, 1)' : '#d1d5db'}`,
                    borderRadius: '6px',
                    padding: '10px',
                    background: '#ffffff',
                    fontSize: '0.8rem',
                    color: '#374151',
                    width: '100%',
                    outline: 'none',
                    boxShadow: showEmailError ? '0 0 0 2px rgba(232, 64, 76, 0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
                {showEmailError && (
                  <span style={{ color: 'rgba(232, 64, 76, 1)', fontSize: '0.7rem', fontWeight: 600, marginTop: '2px' }}>
                    Error: Company domain required or invalid syntax.
                  </span>
                )}
              </div>

              {/* Credit Card inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Credit Card Number</label>
                <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
                  <input
                    type="text"
                    placeholder="•••• •••• •••• 4242"
                    value={cardValue}
                    onChange={(e) => setCardValue(e.target.value)}
                    style={{ border: 'none', padding: '10px', flex: 1, outline: 'none', background: 'transparent', fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiryValue}
                    onChange={(e) => setExpiryValue(e.target.value)}
                    style={{ border: 'none', borderLeft: '1px solid #d1d5db', padding: '10px', width: '70px', textAlign: 'center', outline: 'none', background: 'transparent', fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    placeholder="CVC"
                    value={cvcValue}
                    onChange={(e) => setCvcValue(e.target.value)}
                    style={{ border: 'none', borderLeft: '1px solid #d1d5db', padding: '10px', width: '60px', textAlign: 'center', outline: 'none', background: 'transparent', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                onClick={() => {
                  setIsSubmitting(true);
                  if (typeof pendo !== 'undefined') {
                    pendo.track('checkout_form_submitted', {
                      email_value_present: emailValue.length > 0,
                      card_value_present: cardValue.length > 0,
                      is_calibrated: isCalibrated,
                      triggered_by: 'user'
                    });
                  }
                  setTimeout(() => {
                    setIsSubmitting(false);
                    if (emailValue.includes('company.domain')) {
                      setShowEmailError(true);
                      if (typeof pendo !== 'undefined') {
                        pendo.track('checkout_form_validation_failed', {
                          email_value: emailValue.substring(0, 50),
                          error_message: 'Company domain required or invalid syntax',
                          is_calibrated: isCalibrated
                        });
                      }
                    } else {
                      setIsSubmitSuccess(true);
                      if (typeof pendo !== 'undefined') {
                        pendo.track('checkout_form_success', {
                          is_calibrated: isCalibrated,
                          email_value_type: emailValue.includes('@') ? 'valid_email' : 'other'
                        });
                      }
                    }
                  }, 1000);
                }}
                style={{
                  background: isSubmitSuccess ? 'var(--accent-teal)' : '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '10px',
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? (
                  <span>Verifying details...</span>
                ) : isSubmitSuccess ? (
                  <span>Payment verified</span>
                ) : (
                  <span>Complete Order (€99)</span>
                )}
              </button>

              {/* Terms and conditions mock link */}
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textAlign: 'center', marginTop: '10px' }}>
                By checkout, you accept our <span style={{ textDecoration: 'underline', color: '#4f46e5', cursor: 'pointer' }}>Terms of Service</span>.
              </div>
            </div>

            {/* Right Product Summary Info Panel */}
            <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
                Order Summary
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#1f2937' }}>Prometheus Enterprise Pack</p>
                  <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>1 Persona Simulation (Eidolon Cohort)</p>
                </div>
                <span style={{ fontWeight: 'bold', color: '#111827' }}>€99</span>
              </div>

              {/* Live Tooltip Pricing trigger area */}
              {activeTooltip === 'PRO_DETAILS' && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '120px', 
                    left: '-20px', 
                    right: '20px', 
                    background: '#1f2937', 
                    color: '#ffffff', 
                    borderRadius: '6px', 
                    padding: '12px', 
                    fontSize: '0.7rem', 
                    zIndex: 40,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Offer details:</p>
                  <p>Unlimited VLM tokens, 50 simultaneous cohorts, JSON export of cognitive load logs.</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563', fontSize: '0.75rem' }}>
                  <span>Subtotal</span>
                  <span>€99.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563', fontSize: '0.75rem' }}>
                  <span>Taxes (20% VAT)</span>
                  <span>€0.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#111827', fontSize: '0.85rem', paddingTop: '8px', borderTop: '1px dotted #d1d5db' }}>
                  <span>Total</span>
                  <span>€99.00</span>
                </div>
              </div>

              {/* Promo Code input mockup */}
              <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', background: '#ffffff', overflow: 'hidden', height: '36px' }}>
                <input
                  type="text"
                  placeholder="Promo Code"
                  value={promoValue}
                  onChange={(e) => setPromoValue(e.target.value)}
                  style={{ border: 'none', padding: '8px', flex: 1, outline: 'none', fontSize: '0.75rem', background: 'transparent' }}
                />
                <button 
                  onClick={() => setPromoValue('PROMETHEUS2026')}
                  style={{ border: 'none', background: '#e5e7eb', borderLeft: '1px solid #d1d5db', padding: '0 12px', fontSize: '0.75rem', color: '#4b5563', cursor: 'pointer' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Live Web Application Iframe Proxy (Bypasses Frame-ancestors & CORS!) */
          <iframe
            src={proxySrc}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '520px',
              border: 'none',
              background: '#ffffff',
              display: 'block'
            }}
            title="Live Web View Simulation"
          />
        )}

        {/* Global Mock Cookie Banner Overlay (Local form only) */}
        {isDefaultCheckout && latestState && latestState.current_step === 'cookie_banner' && !cookieBannerDismissed && (
          <div 
            style={{ 
              position: 'absolute', 
              bottom: '15px', 
              left: '15px', 
              right: '15px', 
              background: '#1f2937', 
              color: '#ffffff', 
              borderRadius: '8px', 
              padding: '15px', 
              zIndex: 10,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <p style={{ fontSize: '0.75rem' }}>
              We use cookies to optimize your experience, track analytics performance with Novus, and serve promotional offers tailored to your Eidolons.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setCookieBannerDismissed(true);
                  if (typeof pendo !== 'undefined') {
                    pendo.track('cookie_banner_dismissed', {
                      dismiss_action: 'decline',
                      persona: latestState?.persona,
                      frustration_at_dismissal: latestState?.frustration_matrix
                    });
                  }
                }}
                style={{ background: '#374151', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                Decline
              </button>
              <button
                onClick={() => {
                  setCookieBannerDismissed(true);
                  if (typeof pendo !== 'undefined') {
                    pendo.track('cookie_banner_dismissed', {
                      dismiss_action: 'accept',
                      persona: latestState?.persona,
                      frustration_at_dismissal: latestState?.frustration_matrix
                    });
                  }
                }}
                style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Accept All
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
