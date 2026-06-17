import { useEffect, useState, useRef, useCallback } from 'react';

declare const pendo: any;

export interface TelemetryState {
  agent_id: string;
  persona: 'IMPATIENT' | 'ANALYTICAL' | 'FRUSTRATED';
  current_step: string;
  frustration_matrix: number;
  last_action: 'READ' | 'HOVER' | 'CLICK' | 'SCROLL' | 'ABANDON';
  target_coordinates: number[];
  cognitive_log: string;
}

export function useSimulationStream() {
  const [streamData, setStreamData] = useState<TelemetryState[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsReceivedRef = useRef(0);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const resetStream = useCallback(() => {
    stopStream();
    setStreamData([]);
  }, [stopStream]);

  const startStream = useCallback(async (simulationId: string, persona: 'IMPATIENT' | 'ANALYTICAL' | 'FRUSTRATED', calibrated: boolean = false) => {
    // 1. Immediately clean up and close any existing stream connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStreamData([]);
    setIsStreaming(true);
    eventsReceivedRef.current = 0;

    // 2. Direct connect to Uvicorn using the exact parameters, dynamic hostname matching client origin or NEXT_PUBLIC_API_URL
    const apiBase = process.env.NEXT_PUBLIC_API_URL || `http://${typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'}:8000`;

    // ── Step 4: Health check before opening SSE stream ────────────────────────
    try {
      const healthRes = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(4000) });
      if (!healthRes.ok) throw new Error('Backend unhealthy');
    } catch {
      console.warn('[Prometheus] Backend unreachable — simulation stream aborted.');
      if (typeof pendo !== 'undefined') {
        pendo.track('sse_stream_error', {
          simulation_id: simulationId,
          events_received_count: 0,
          error_type: 'backend_offline'
        });
      }
      setIsStreaming(false);
      return;
    }

    const url = `${apiBase}/api/simulations/${simulationId}/stream?persona=${persona}&calibrated=${calibrated}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    setTimeout(() => {
      if (typeof pendo !== 'undefined') {
        pendo.track('sse_stream_connected', {
          simulation_id: simulationId,
          persona: persona,
          calibrated: calibrated,
          stream_url: url
        });
      }
    }, 200);

    eventSource.addEventListener('state_mutation', (event) => {
      try {
        eventsReceivedRef.current += 1;
        const payload: TelemetryState = JSON.parse(event.data);
        setStreamData((prev) => {
          if (payload.last_action === 'ABANDON') {
            if (typeof pendo !== 'undefined') {
              pendo.track('agent_abandoned_flow', {
                agent_id: payload.agent_id,
                persona: payload.persona,
                abandoned_at_step: payload.current_step,
                frustration_level: payload.frustration_matrix,
                cognitive_log: (payload.cognitive_log || '').substring(0, 200),
                simulation_id: simulationId
              });
            }
            setTimeout(() => stopStream(), 100);
          }
          return [...prev, payload];
        });
      } catch (err) {
        console.error("Failed to parse event telemetry payload:", err);
      }
    });

    // Handle end of stream cleanly from backend
    eventSource.addEventListener('end', () => {
      stopStream();
    });

    eventSource.onerror = (err) => {
      // If we already received events, the stream finished or closed normally
      if (eventsReceivedRef.current > 0) {
        stopStream();
      } else {
        console.error("SSE Telemetry Connection Failure:", err);
        if (typeof pendo !== 'undefined') {
          pendo.track('sse_stream_error', {
            simulation_id: simulationId,
            events_received_count: eventsReceivedRef.current,
            error_type: 'connection_failure'
          });
        }
        stopStream();
      }
    };

    return eventSource;
  }, [stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    streamData,
    isStreaming,
    startStream,
    stopStream,
    resetStream
  };
}
