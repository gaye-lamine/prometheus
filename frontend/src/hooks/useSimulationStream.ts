import { useEffect, useState, useRef, useCallback } from 'react';

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

  const startStream = useCallback((simulationId: string, persona: 'IMPATIENT' | 'ANALYTICAL' | 'FRUSTRATED', calibrated: boolean = false) => {
    // 1. Immediately clean up and close any existing stream connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setStreamData([]);
    setIsStreaming(true);
    eventsReceivedRef.current = 0;

    // 2. Direct connect to Uvicorn using the exact parameters, dynamic hostname matching client origin
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    const url = `http://${host}:8000/api/simulations/${simulationId}/stream?persona=${persona}&calibrated=${calibrated}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('state_mutation', (event) => {
      try {
        eventsReceivedRef.current += 1;
        const payload: TelemetryState = JSON.parse(event.data);
        setStreamData((prev) => {
          if (payload.last_action === 'ABANDON') {
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
