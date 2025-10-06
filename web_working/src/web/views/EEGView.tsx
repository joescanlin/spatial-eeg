import React, { useState, useEffect } from 'react';
import EEGPanel from '../../components/EEGPanel';
import ContactQualityIndicator from '../../components/ContactQualityIndicator';
import BandPowerVisualization from '../../components/BandPowerVisualization';
import UnifiedGridDisplay from '../../components/UnifiedGridDisplay';
import PatientSelectionModal from '../../components/PatientSelectionModal';
import { useDataStream } from '../../hooks/useDataStream';
import { useEEGStream } from '../../hooks/useEEGStream';
import { UnifiedGridFrame } from '../../types/multistation';
import { Patient } from '../../services/patientApi';
import { Play, Square, Flag, Activity, Brain, Footprints, AlertTriangle, Clock, User } from 'lucide-react';

export default function EEGView() {
  const { gridData, stats } = useDataStream('eeg');
  const { eegData, status, startRecording, stopRecording, addMarker, fetchStatus } = useEEGStream();
  const [isRecording, setIsRecording] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Patient | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [flooringPattern, setFlooringPattern] = useState<string>('Textured Grid Pattern');
  // Static empty grid - no simulated data for now
  const [unifiedGridData] = useState<UnifiedGridFrame | null>(null);

  // Sync isRecording state with backend recording status
  useEffect(() => {
    if (status.recording !== isRecording) {
      setIsRecording(status.recording);
    }
  }, [status.recording]);

  // Use real cognitive metrics from Cortex API (or mock if not available)
  const cognitiveMetrics = eegData.metrics ? {
    focus: eegData.metrics.focus * 100,
    stress: eegData.metrics.stress * 100,
    attention: eegData.metrics.engagement * 100,  // Engagement = attention
    cognitiveLoad: (eegData.metrics.stress + (1 - eegData.metrics.relaxation)) * 50,
  } : {
    // Fallback to 0 if no data
    focus: 0,
    stress: 0,
    attention: 0,
    cognitiveLoad: 0,
  };

  // Calculate gait stability from floor sensors
  const gaitMetrics = {
    stabilityScore: gridData.balanceMetrics?.stabilityScore * 100 || 0,
    activeSensors: gridData?.frame?.reduce((acc, row) =>
      acc + row.reduce((sum, cell) => sum + (cell > 0 ? 1 : 0), 0), 0) || 0,
    centerOfPressure: gridData.balanceMetrics?.cop || { x: 0, y: 0 },
  };

  // Calculate latency (mock - would be real from stream in production)
  const latency = stats.lastUpdate ? Date.now() - stats.lastUpdate : 0;

  const handleStartSession = async () => {
    console.log('🟢 Starting EEG session (opening stream)');
    try {
      const response = await fetch('/api/eeg/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streams: ["eeg", "met", "pow", "mot", "eq", "dev"]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✓ EEG session started:', data);

        // Immediately fetch status to update UI
        setTimeout(() => {
          fetchStatus();
        }, 500);
      } else {
        const error = await response.text();
        console.error('Failed to start session:', error);
        alert('Failed to start EEG session. Make sure the headset is on and connected.');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Error starting EEG session. Check console for details.');
    }
  };

  const handleStartRecording = async () => {
    if (!selectedSubject) {
      alert('Please select a research subject before starting the session');
      return;
    }

    console.log('🔴 Starting EEG recording for subject:', selectedSubject.first_name, selectedSubject.last_name);
    const result = await startRecording();
    if (result) {
      setIsRecording(true);
      setSessionStartTime(new Date());
    }
  };

  const handleStopRecording = async () => {
    console.log('⏹️ Stopping EEG recording and saving session data');
    const result = await stopRecording();
    if (result) {
      // Save session data to database
      await saveSessionData();

      // Stop the EEG session/stream
      await handleStopSession();

      setIsRecording(false);
      setSessionStartTime(null);
    }
  };

  const handleStopSession = async () => {
    console.log('🛑 Stopping EEG session (closing stream)');
    try {
      const response = await fetch('/api/eeg/session/stop', {
        method: 'POST',
      });

      if (response.ok) {
        console.log('✓ EEG session stopped');
      } else {
        const error = await response.text();
        console.error('Failed to stop session:', error);
      }
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  };

  const saveSessionData = async () => {
    if (!selectedSubject || !sessionStartTime) {
      console.error('Cannot save session: missing subject or start time');
      return;
    }

    const sessionEndTime = new Date();
    const durationSeconds = Math.floor((sessionEndTime.getTime() - sessionStartTime.getTime()) / 1000);

    // Prepare session data payload
    const sessionData = {
      patient_id: selectedSubject.id,
      flooring_pattern: flooringPattern,
      start_time: sessionStartTime.toISOString(),
      end_time: sessionEndTime.toISOString(),
      duration: durationSeconds,
      eeg_data: eegData,
      floor_data: gridData,
    };

    try {
      const response = await fetch('/api/sessions/save-eeg-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✓ Session saved successfully:', result);
        alert(`Session saved successfully for ${selectedSubject.first_name} ${selectedSubject.last_name}`);
      } else {
        console.error('Failed to save session:', await response.text());
        alert('Failed to save session data. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Error saving session data. Please check your network connection.');
    }
  };

  const handleAddMarker = async () => {
    console.log('🚩 Adding event marker');
    await addMarker(`Event ${new Date().toISOString()}`);
  };

  const getCognitiveStateColor = (value: number) => {
    if (value >= 70) return 'text-green-400';
    if (value >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStressColor = (value: number) => {
    if (value >= 60) return 'text-red-400';
    if (value >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-4">
      {/* Subject Selection Banner */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg border-2 border-blue-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <User className="w-6 h-6 text-blue-400" />
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Research Subject</div>
              {selectedSubject ? (
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-white">
                    {selectedSubject.first_name} {selectedSubject.last_name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {selectedSubject.age ? `${selectedSubject.age}y` : ''} {selectedSubject.gender || ''}
                  </div>
                  <div className="text-sm bg-blue-900/50 px-2 py-1 rounded">
                    {selectedSubject.diagnosis || 'No flooring condition'}
                  </div>
                </div>
              ) : (
                <div className="text-lg font-semibold text-yellow-400">
                  No subject selected - Click "Select Subject" to begin
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsSubjectModalOpen(true)}
            disabled={isRecording}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              isRecording
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {selectedSubject ? 'Change Subject' : 'Select Subject'}
          </button>
        </div>

        {/* Flooring Pattern Selection */}
        {selectedSubject && !isRecording && (
          <div className="mt-3 flex items-center gap-4">
            <label className="text-sm text-gray-400">Flooring Pattern:</label>
            <select
              value={flooringPattern}
              onChange={(e) => setFlooringPattern(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="Textured Grid Pattern">Textured Grid Pattern</option>
              <option value="High-Contrast Stripes">High-Contrast Stripes</option>
              <option value="Smooth Monochrome">Smooth Monochrome</option>
              <option value="Directional Arrows">Directional Arrows</option>
              <option value="Organic Patterns">Organic Patterns</option>
            </select>
          </div>
        )}
      </div>

      {/* Header with Session Controls */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6" />
              EEG + Floor Fusion Research
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Multimodal observation: Brain activity correlated with spatial movement patterns
            </p>
          </div>

          {/* Session Control Buttons */}
          <div className="flex items-center gap-3">
            {/* Connection Status Indicator */}
            <div className="text-right mr-4">
              <div className="text-xs text-gray-400">EEG Status</div>
              <div className={`text-sm font-bold ${status.streaming ? 'text-green-400' : 'text-red-400'}`}>
                {status.streaming ? '● Streaming' : '● Disconnected'}
              </div>
            </div>

            {/* Reconnect button if not streaming */}
            {!status.streaming && !isRecording && (
              <button
                onClick={handleStartSession}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
              >
                <Activity className="w-4 h-4" />
                Connect & Stream
              </button>
            )}

            {!isRecording && status.streaming ? (
              <button
                onClick={handleStartRecording}
                disabled={!selectedSubject}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedSubject
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4" />
                Start Session
              </button>
            ) : isRecording ? (
              <>
                <button
                  onClick={handleAddMarker}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Add Marker
                </button>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop & Save Session
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Recording indicator */}
        {isRecording && selectedSubject && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              Recording session for {selectedSubject.first_name} {selectedSubject.last_name}
            </div>
            <div className="text-sm text-gray-400">
              Duration: {sessionStartTime ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000) : 0}s
            </div>
          </div>
        )}
      </div>

      {/* Subject Selection Modal */}
      <PatientSelectionModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSelectPatient={(patient) => {
          setSelectedSubject(patient);
          setIsSubjectModalOpen(false);
        }}
      />

      {/* Main Side-by-Side Layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column: EEG Signals */}
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5" />
              EEG Signal Stream
            </h2>
            <EEGPanel sample={eegData.eeg} />

            {/* EEG Status */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">Status</div>
                <div className={`text-sm font-bold ${status.streaming ? 'text-green-400' : 'text-red-400'}`}>
                  {status.streaming ? 'Streaming' : 'Disconnected'}
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">Channels</div>
                <div className="text-sm font-bold text-white">
                  {eegData.eeg?.labels?.length || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Quality Indicator */}
          <ContactQualityIndicator contactQuality={eegData.contactQuality} />

          {/* Cognitive State Metrics */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Cognitive State {eegData.metrics && <span className="text-xs text-green-400">(Live)</span>}
            </h2>

            <div className="space-y-3">
              {/* Focus */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Focus / Engagement</span>
                  <span className={`text-sm font-bold ${getCognitiveStateColor(cognitiveMetrics.focus)}`}>
                    {cognitiveMetrics.focus.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${cognitiveMetrics.focus}%` }}
                  />
                </div>
              </div>

              {/* Stress */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Stress / Anxiety</span>
                  <span className={`text-sm font-bold ${getStressColor(cognitiveMetrics.stress)}`}>
                    {cognitiveMetrics.stress.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${cognitiveMetrics.stress}%` }}
                  />
                </div>
              </div>

              {/* Attention */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Attention</span>
                  <span className={`text-sm font-bold ${getCognitiveStateColor(cognitiveMetrics.attention)}`}>
                    {cognitiveMetrics.attention.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${cognitiveMetrics.attention}%` }}
                  />
                </div>
              </div>

              {/* Cognitive Load */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Cognitive Load</span>
                  <span className={`text-sm font-bold ${getCognitiveStateColor(100 - cognitiveMetrics.cognitiveLoad)}`}>
                    {cognitiveMetrics.cognitiveLoad.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${cognitiveMetrics.cognitiveLoad}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Band Power Visualization */}
          <BandPowerVisualization bandPower={eegData.bandPower} />
        </div>

        {/* Right Column: Floor Sensor Grid */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Footprints className="w-5 h-5" />
                Unified Floor Sensor Grid (4 Basestations)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                80×54 pixels - Real-time gait tracking
              </p>
            </div>
            <div className="p-2">
              <UnifiedGridDisplay
                data={unifiedGridData}
                showLanes={false}
                showBasestationBoundaries={false}
                showLabels={false}
                cellSize={4}
                compact={true}
              />
            </div>
          </div>

          {/* Gait Stability Metrics */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Gait & Stability
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">Stability Score</div>
                <div className={`text-lg font-bold ${gaitMetrics.stabilityScore > 70 ? 'text-green-400' : gaitMetrics.stabilityScore > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {gaitMetrics.stabilityScore.toFixed(1)}%
                </div>
              </div>

              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">Active Sensors</div>
                <div className="text-lg font-bold text-white">
                  {gaitMetrics.activeSensors}
                </div>
              </div>

              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">CoP X</div>
                <div className="text-lg font-bold text-white font-mono">
                  {gaitMetrics.centerOfPressure.x.toFixed(2)}
                </div>
              </div>

              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">CoP Y</div>
                <div className="text-lg font-bold text-white font-mono">
                  {gaitMetrics.centerOfPressure.y.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Gait Metrics */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Walking Speed</span>
                <span className="text-sm font-bold text-white">
                  {gridData.gaitMetrics?.speed?.toFixed(2) || '0.00'} m/s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Stride Length</span>
                <span className="text-sm font-bold text-white">
                  {gridData.gaitMetrics?.strideLength?.toFixed(2) || '0.00'} m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Step Count</span>
                <span className="text-sm font-bold text-white">
                  {gridData.gaitMetrics?.stepCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Synchronization Bar */}
      <div className="bg-gray-800 p-3 rounded-lg shadow-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">EEG Time:</span>
              <span className="font-mono font-bold text-white">
                {eegData.eeg?.timestamp ? `${eegData.eeg.timestamp.toFixed(3)}s` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Floor Time:</span>
              <span className="font-mono font-bold text-white">
                {stats.lastUpdate ? `${(stats.lastUpdate / 1000).toFixed(3)}s` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Sync Status:</span>
            <span className={`font-bold ${latency < 100 ? 'text-green-400' : 'text-yellow-400'}`}>
              {latency < 100 ? '✓ Synchronized' : '⚠ Delayed'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}