'use client';

import React, { useEffect } from 'react';
import { TelemetryState } from '../hooks/useSimulationStream';

declare const pendo: any;
const trackedReportSimulations = new Set<string>();

interface PostMortemReportProps {
  streamData: TelemetryState[];
  persona: 'IMPATIENT' | 'ANALYTICAL' | 'FRUSTRATED';
}

export default function PostMortemReport({ streamData, persona }: PostMortemReportProps) {
  const isFinished = streamData.length > 0 && 
    (streamData[streamData.length - 1].last_action === 'ABANDON' || streamData.length >= 5);

  const latestState = streamData.length > 0 ? streamData[streamData.length - 1] : null;
  const reportKey = latestState ? `${persona}_${streamData.length}_${latestState.agent_id}` : '';

  useEffect(() => {
    if (isFinished && latestState && reportKey && !trackedReportSimulations.has(reportKey) && typeof pendo !== 'undefined') {
      trackedReportSimulations.add(reportKey);
      
      const maxFrustration = Math.max(...streamData.map(s => s.frustration_matrix));
      const successRate = latestState.last_action !== 'ABANDON' ? 100 : 0;
      const uxDebtScore = Math.round(maxFrustration * 100);
      
      let grade = 'A';
      let gradeColor = 'var(--accent-teal)';
      if (uxDebtScore > 15 && uxDebtScore <= 35) {
        grade = 'B';
        gradeColor = '#a855f7';
      } else if (uxDebtScore > 35 && uxDebtScore <= 60) {
        grade = 'C';
        gradeColor = 'rgba(99,102,241,1)';
      } else if (uxDebtScore > 60 && uxDebtScore <= 85) {
        grade = 'D';
        gradeColor = '#eab308';
      } else if (uxDebtScore > 85) {
        grade = 'F';
        gradeColor = 'var(--accent-critical)';
      }

      // Tracking moved to page.tsx to ensure sequential firing (Step 4 immediately after Step 3)
    }
  }, [isFinished, reportKey, persona, latestState, streamData]);

  if (!isFinished) {
    return (
      <div 
        className="prometheus-card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flexGrow: 1,
          flexShrink: 0,
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          minHeight: '260px',
          textAlign: 'center'
        }}
      >
        <p>The generative UX Debt report will appear once your agents' simulation session is complete.</p>
      </div>
    );
  }

  // Calculate UX Debt Metrics based on simulated stream behavior
  const maxFrustration = Math.max(...streamData.map(s => s.frustration_matrix));
  const successRate = latestState!.last_action !== 'ABANDON' ? 100 : 0;
  
  // Dynamic Score Formula
  const uxDebtScore = Math.round(maxFrustration * 100);
  
  // Decide Grade
  let grade = 'A';
  let gradeColor = 'var(--accent-teal)';
  if (uxDebtScore > 15 && uxDebtScore <= 35) {
    grade = 'B';
    gradeColor = '#a855f7';
  } else if (uxDebtScore > 35 && uxDebtScore <= 60) {
    grade = 'C';
    gradeColor = 'rgba(99,102,241,1)';
  } else if (uxDebtScore > 60 && uxDebtScore <= 85) {
    grade = 'D';
    gradeColor = '#eab308';
  } else if (uxDebtScore > 85) {
    grade = 'F';
    gradeColor = 'var(--accent-critical)';
  }

  return (
    <div className="prometheus-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.5s ease-out', flexShrink: 0 }}>
      
      {/* Title */}
      <div>
        <h3 className="text-glow-critical" style={{ fontSize: '1.4rem', marginBottom: '4px' }}>
          UX Debt Post-Mortem
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Synthetic analysis generated from the behavioral interactions of the Eidolon cohort.
        </p>
      </div>

      {/* Grade and Global Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', alignItems: 'center' }}>
        
        {/* Grade Bubble */}
        <div 
          style={{ 
            width: '90px', 
            height: '90px', 
            borderRadius: '50%', 
            border: `3px solid ${gradeColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
            boxShadow: `0 0 15px ${gradeColor}22`
          }}
        >
          <span style={{ fontSize: '2rem', fontWeight: 900, color: gradeColor, lineHeight: '1' }}>{grade}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>UX Grade</span>
        </div>

        {/* Global Numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.8rem' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>UX Debt Score</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {uxDebtScore} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 100</span>
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Onboarding Rate</p>
            <p 
              style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                color: successRate === 100 ? 'var(--accent-teal)' : 'var(--accent-critical)' 
              }}
            >
              {successRate}%
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Max Frustration</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: gradeColor }}>
              {Math.round(maxFrustration * 100)}%
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Interaction Steps</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {streamData.length}
            </p>
          </div>
        </div>
      </div>

      {/* Generative Recommendations */}
      <div>
        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Generative Recommendations (Quick-Wins)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {persona === 'IMPATIENT' && (
            <>
              <div style={{ background: 'rgba(232, 64, 76, 0.05)', border: '1px solid rgba(232, 64, 76, 0.15)', borderRadius: '6px', padding: '12px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--accent-critical)', marginBottom: '4px' }}>
                  Critical Bottleneck: Cognitive overload of the onboarding modal
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  The impatient agent abandoned the flow because the modal requested too much information.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', marginTop: '6px', fontWeight: 600 }}>
                  Recommended Fix: Implement a progressive 2-step onboarding process with 1-click social login.
                </p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--accent-indigo)', marginBottom: '4px' }}>
                  Low contrast on Call-to-Action button
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  The agent hesitated for 1.5s (Action: HOVER) before understanding that the primary CTA was clickable.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', marginTop: '6px', fontWeight: 600 }}>
                  Recommended Fix: Increase the button contrast (required ratio 4.5:1) and add a subtle pulsing animation.
                </p>
              </div>
            </>
          )}

          {persona === 'FRUSTRATED' && (
            <>
              <div style={{ background: 'rgba(232, 64, 76, 0.05)', border: '1px solid rgba(232, 64, 76, 0.15)', borderRadius: '6px', padding: '12px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--accent-critical)', marginBottom: '4px' }}>
                  Critical Bottleneck: Block Cookie Banner
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  The agent suffered immediate high cognitive friction (45%) because the cookie banner masked 80% of useful content.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', marginTop: '6px', fontWeight: 600 }}>
                  Recommended Fix: Reduce cookie banner height to 15% of the viewport with a discrete bottom-right anchor.
                </p>
              </div>

              <div style={{ background: 'rgba(232, 64, 76, 0.05)', border: '1px solid rgba(232, 64, 76, 0.15)', borderRadius: '6px', padding: '12px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--accent-critical)', marginBottom: '4px' }}>
                  Critical Bottleneck: Opaque validation error message
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  The agent clicked submit but hit a generic validation error without clear visual cues pointing to the invalid email input field.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', marginTop: '6px', fontWeight: 600 }}>
                  Recommended Fix: Display validation errors contextually directly beneath each invalid input field.
                </p>
              </div>
            </>
          )}

          {persona === 'ANALYTICAL' && (
            <>
              <div style={{ background: 'rgba(20, 184, 166, 0.03)', border: '1px solid rgba(20, 184, 166, 0.15)', borderRadius: '6px', padding: '12px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--accent-teal)', marginBottom: '4px' }}>
                  Workflow successfully completed
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  The analytical agent completed the entire funnel without major bottlenecks due to their high tolerance for text-heavy interfaces.
                </p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--accent-indigo)', marginBottom: '4px' }}>
                  Hesitation on pricing tooltip
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  The agent methodically inspected pricing terms but spent considerable time hovering to read API exclusion details.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', marginTop: '6px', fontWeight: 600 }}>
                  Recommended Fix: Embed a detailed, collapsible comparison grid to clarify limits for the Pro tiers.
                </p>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
