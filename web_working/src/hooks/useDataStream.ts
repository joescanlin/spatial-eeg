import { useState, useEffect } from "react";
import { GridData, GridStats } from "../types/grid";

const API_BASE_URL = "/api";

export function useDataStream(activeView?: string) {
  // Default grid data with empty state
  const [gridData, setGridData] = useState<GridData>({
    frame: Array(15).fill(Array(12).fill(0)),
    fallDetected: false,
    fallProbability: 0,
    decibelLevel: 30,
    timestamp: new Date().toISOString(),
    gaitMetrics: {
      speed: 0,
      strideLength: 0,
      symmetryScore: 0,
      stepCount: 0
    },
    wanderingMetrics: {
      pathLength: 0,
      areaCovered: 0,
      directionChanges: 0,
      repetitiveScore: 0
    },
    balanceMetrics: {
      stabilityScore: 0,
      swayArea: 0,
      weightDistribution: 0,
      copMovement: 0
    },
    alertConfig: {
      enabled: true,
      confidenceThreshold: 75,
      cooldownPeriod: 300,
      messageTemplate: "Fall detected with {confidence}% confidence!",
      phoneNumbers: []
    },
    alerts: []
  });

  // Stats with "connecting" status initially
  const [stats, setStats] = useState<GridStats>({
    frameRate: 0,
    connectionStatus: "connecting",
    lastUpdate: new Date().toISOString(),
    activeSensors: 0
  });

  useEffect(() => {
    // Skip data fetching if we're not in a view that needs the grid data
    // Keep active for dashboard, pt-session, and live-gait views
    const viewsNeedingGridData = ['dashboard', 'pt-session', 'live-gait'];
    
    if (activeView && !viewsNeedingGridData.includes(activeView)) {
      console.log(`🚫 Grid data stream disabled for ${activeView} view`);
      setStats(prev => ({
        ...prev,
        connectionStatus: "simulated",
        lastUpdate: new Date().toISOString()
      }));
      return; // Don't set up EventSource
    }
    
    console.log(`✅ Grid data stream enabled for ${activeView || 'unknown'} view`);
    console.log(`🔍 Debug: Creating EventSource for ${activeView || 'unknown'} view (${Date.now()})`);
    
    let frameCount = 0;
    let lastFrameTime = Date.now();

    console.log("🚀 Initializing EventSource connection...");
    const eventSource = new EventSource(`${API_BASE_URL}/grid-stream`, {
      withCredentials: true,
    });

    const calculateFrameRate = () => {
      const now = Date.now();
      if (now - lastFrameTime >= 1000) {
        setStats((prev) => ({
          ...prev,
          frameRate: frameCount || 0,
        }));
        frameCount = 0;
        lastFrameTime = now;
      }
    };

    const checkMQTTStatus = async () => {
      try {
        console.log("📡 Checking MQTT status...");
        const response = await fetch(`${API_BASE_URL}/mqtt/status`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("📡 MQTT status response:", data);

        setStats((prev) => ({
          ...prev,
          connectionStatus: data.connected ? "connected" : "disconnected",
          lastUpdate: data.timestamp || new Date().toISOString(),
        }));
      } catch (error) {
        console.error("❌ Failed to fetch MQTT status:", error);
        setStats((prev) => ({
          ...prev,
          connectionStatus: "disconnected",
        }));
      }
    };

    checkMQTTStatus();
    const statusInterval = setInterval(checkMQTTStatus, 5000);

    eventSource.onopen = (event) => {
      console.log("🎯 SSE Connection Opened:", event);
      checkMQTTStatus();
    };

   eventSource.addEventListener("grid", (event) => {
     console.log(`📨 SSE Message Received for ${activeView || 'unknown'} view:`, event.data.substring(0, 50) + '...'); // Log truncated event

      try {
        const data = JSON.parse(event.data);
        console.log(`📦 Parsed SSE data for ${activeView || 'unknown'} view, frame present:`, Boolean(data.grid));

        if (!data.keepalive) {
          if (data.grid) {
            console.log(`🔲 Processing grid data for ${activeView || 'unknown'} view`);
            console.log("🔍 Fall Detection Status:", {
              raw_fall_detected: data.fall_detected,
              parsed_fall_detected: Boolean(data.fall_detected),
              confidence: Number(data.confidence),
              decibelLevel: Number(data.decibelLevel)
            });
            console.log("🏃‍♂️ Gait Metrics:", data.gaitMetrics);
            console.log("⚖️ Balance Metrics:", data.balanceMetrics);

           // Calculate active sensors
           const activeCount = data.grid.reduce((sum: number, row: number[]) => 
             sum + row.reduce((rowSum: number, cell: number) => rowSum + (cell > 0 ? 1 : 0), 0), 0);

           setGridData((prev) => {
             const newState = {
              ...prev,
               frame: data.grid,
              fallDetected: Boolean(data.fall_detected),
               fallProbability: Number(data.confidence) / 100,
              decibelLevel: Number(data.decibelLevel),
              timestamp: data.timestamp || new Date().toISOString(),
              gaitMetrics: {
                ...prev.gaitMetrics,
                ...(data.gaitMetrics || {})
              },
              balanceMetrics: {
                ...prev.balanceMetrics,
                ...(data.balanceMetrics || {})
              },
              wanderingMetrics: {
                ...prev.wanderingMetrics,
                ...(data.wanderingMetrics || {})
              },
              eeg: data.eeg || null  // Add EEG data
             };
             console.log("🚨 Updated Grid State:", {
               fallDetected: newState.fallDetected,
               fallProbability: newState.fallProbability,
               decibelLevel: newState.decibelLevel,
               gaitMetrics: newState.gaitMetrics,
               balanceMetrics: newState.balanceMetrics,
               wanderingMetrics: newState.wanderingMetrics,
               eeg: newState.eeg ? `${newState.eeg.vals.length} channels` : 'none'
             });
             return newState;
           });

            frameCount++;
            calculateFrameRate();

            setStats((prev) => ({
              ...prev,
              connectionStatus: "connected",
              lastUpdate: data.timestamp || new Date().toISOString(),
              activeSensors: activeCount
            }));
          }

          if (data.path) {
            console.log("🛣️ Path update received:", data.path);
            setGridData((prev) => ({
              ...prev,
              fallDetected: false,
              fallProbability: 0,
              timestamp: data.timestamp || new Date().toISOString(),
            }));

            setStats((prev) => ({
              ...prev,
              connectionStatus: "connected",
              lastUpdate: data.timestamp || new Date().toISOString(),
            }));
          }
        } else {
          console.log("💤 Keepalive message received.");
        }
      } catch (error) {
        console.error("❌ Error processing SSE message:", error);
        console.error("❌ Raw event data:", event.data);
      }
    });

    eventSource.onerror = (error) => {
      console.error("❌ SSE connection error:", error);
      setStats((prev) => ({
        ...prev,
        connectionStatus: "disconnected",
      }));
    };

    return () => {
      console.log("🧹 Cleaning up EventSource connection...");
      eventSource.close();
      clearInterval(statusInterval);
    };
  }, [activeView]);

  return { gridData, stats };
}
