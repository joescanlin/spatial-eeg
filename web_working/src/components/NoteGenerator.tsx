import React, { useState } from 'react';
import { ClipboardList, RefreshCw, Check, Edit2 } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';
import SOAPNoteEditor from './SOAPNoteEditor';

interface SessionMetric {
  timestamp: number;
  cadence?: number;
  symmetry?: number;
  stepLengthSymmetry?: number;
  stanceTimeAsymmetry?: number;
  gaitVariability?: number;
  balanceScore?: number;
  weightBearing?: {
    left: number;
    right: number;
  };
  range?: {
    leftKnee: number;
    rightKnee: number;
  };
  stepCount?: number;
}

interface Session {
  id: string;
  patientId: number;
  startTime: string;
  endTime: string;
  duration: number;
  metrics: SessionMetric[];
  notes: string;
  selectedMetrics: string[];
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  diagnosis: string;
  sessions_count: number;
  last_visit: string;
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface NoteGeneratorProps {
  session: Session;
  patient: Patient;
}

const NoteGenerator: React.FC<NoteGeneratorProps> = ({ session, patient }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<SOAPNote | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Helper function to extract pain level from notes
  const extractPainLevel = (notes: string): string => {
    const painRegex = /pain (?:rated |at |of |is |reports |)(?:a |)(\d+)\/10/i;
    const match = notes.match(painRegex);
    return match ? match[1] : "not reported";
  };
  
  // Generate a SOAP note based on session data
  const generateNote = async () => {
    setIsGenerating(true);
    
    try {
      // In a real application, this would make an API call to an AI service
      // For now, we'll simulate a delay and return dummy data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Extract relevant metrics for the note
      const firstMetric = session.metrics[0] || null;
      const lastMetric = session.metrics.length > 0 
        ? session.metrics[session.metrics.length - 1] 
        : null;
      
      // Calculate average metrics if available
      const avgCadence = session.metrics.reduce((sum, metric) => 
        sum + (metric.cadence || 0), 0) / (session.metrics.length || 1);
      
      const avgSymmetry = session.metrics.reduce((sum, metric) => 
        sum + (metric.symmetry || 0), 0) / (session.metrics.length || 1);
      
      const avgBalanceScore = session.metrics.reduce((sum, metric) => 
        sum + (metric.balanceScore || 0), 0) / (session.metrics.length || 1);
      
      // Calculate changes throughout session
      const startSymmetry = firstMetric?.symmetry || 0;
      const endSymmetry = lastMetric?.symmetry || 0;
      const symmetryChange = endSymmetry - startSymmetry;
      
      const startCadence = firstMetric?.cadence || 0;
      const endCadence = lastMetric?.cadence || 0;
      const cadenceChange = endCadence - startCadence;
      
      // Extract ROM data if available
      const startLeftKneeROM = firstMetric?.range?.leftKnee;
      const endLeftKneeROM = lastMetric?.range?.leftKnee;
      const leftKneeROMChange = endLeftKneeROM && startLeftKneeROM ? endLeftKneeROM - startLeftKneeROM : 0;
      
      const startRightKneeROM = firstMetric?.range?.rightKnee;
      const endRightKneeROM = lastMetric?.range?.rightKnee;
      const rightKneeROMChange = endRightKneeROM && startRightKneeROM ? endRightKneeROM - startRightKneeROM : 0;
      
      // Extract weight bearing data if available
      const weightBearingAsymmetry = lastMetric?.weightBearing ? 
        Math.abs(lastMetric.weightBearing.left - lastMetric.weightBearing.right) : 0;
      
      // Extract pain level from notes
      const painLevel = extractPainLevel(session.notes);
      
      // Get the date and format it
      const sessionDate = new Date(session.startTime).toLocaleDateString();
      
      // Generate dummy SOAP note based on available data
      const note: SOAPNote = {
        subjective: `Patient ${patient.first_name} ${patient.last_name} presented on ${sessionDate} for treatment of ${patient.diagnosis}. ${
          painLevel !== "not reported" ? `Patient reports pain level at ${painLevel}/10. ` : 'Pain level not reported. '
        }${
          session.notes.includes('discomfort') ? 'Patient reports discomfort with weight-bearing activities. ' : ''
        }${
          session.notes.includes('improved') ? 'Patient reports improved tolerance to exercise since last visit. ' : ''
        }Patient's goals include improved function and return to normal activities.`,
        
        objective: `Session duration: ${Math.floor(session.duration / 60)} minutes. ${
          avgCadence ? `Cadence: ${Math.round(avgCadence)} steps/min (${cadenceChange > 0 ? '+' : ''}${Math.round(cadenceChange)} change during session). ` : ''
        }${
          avgSymmetry ? `Gait symmetry: ${Math.round(avgSymmetry)}% (${symmetryChange > 0 ? '+' : ''}${Math.round(symmetryChange)}% change). ` : ''
        }${
          lastMetric?.stanceTimeAsymmetry ? `Stance time asymmetry: ${Math.round(lastMetric.stanceTimeAsymmetry)}%. ` : ''
        }${
          lastMetric?.gaitVariability ? `Gait variability: ${lastMetric.gaitVariability.toFixed(1)}% CV. ` : ''
        }${
          avgBalanceScore ? `Balance score: ${Math.round(avgBalanceScore * 100)}/100. ` : ''
        }${
          weightBearingAsymmetry > 0 ? `Weight bearing asymmetry: ${weightBearingAsymmetry.toFixed(1)}% difference. ` : ''
        }${
          endLeftKneeROM && endRightKneeROM ? `Knee ROM: Left ${Math.round(endLeftKneeROM)}° (${leftKneeROMChange > 0 ? '+' : ''}${Math.round(leftKneeROMChange)}°), Right ${Math.round(endRightKneeROM)}° (${rightKneeROMChange > 0 ? '+' : ''}${Math.round(rightKneeROMChange)}°). ` : ''
        }${
          lastMetric?.stepCount ? `Total steps during session: ${lastMetric.stepCount}. ` : ''
        }${session.notes.includes('resistance') ? 'Patient performed resistance exercises with good form. ' : ''}`,
        
        assessment: `Patient demonstrates ${
          avgSymmetry > 85 ? 'good' : avgSymmetry > 70 ? 'fair' : 'poor'
        } gait symmetry with ${
          avgBalanceScore > 0.8 ? 'good' : 
          avgBalanceScore > 0.6 ? 'fair' : 'compromised'
        } balance. ${
          symmetryChange > 5 ? 'Significant improvement in symmetry noted during session, indicating good response to treatment. ' :
          symmetryChange > 0 ? 'Slight improvement in symmetry noted during session. ' :
          symmetryChange < -5 ? 'Decline in symmetry during session, possibly indicating fatigue or compensatory movement patterns. ' :
          symmetryChange < 0 ? 'Slight decline in symmetry during session. ' :
          'No significant change in symmetry during session. '
        }${
          cadenceChange > 5 ? 'Cadence increased meaningfully during session, showing improved efficiency of movement. ' :
          cadenceChange < -5 ? 'Cadence decreased during session, potentially indicating fatigue. ' : ''
        }${
          patient.diagnosis.includes('ACL') ? 'Continue to monitor knee stability and quadriceps function. ' :
          patient.diagnosis.includes('back') ? 'Core stability and proper movement patterns are improving. ' :
          patient.diagnosis.includes('post-operative') ? 'Post-operative recovery progressing as expected. ' : 
          'Recovery progressing appropriately based on objective metrics. '
        }${
          weightBearingAsymmetry > 10 ? 'Significant weight bearing asymmetry noted, requiring continued focus. ' :
          weightBearingAsymmetry > 5 ? 'Mild weight bearing asymmetry present. ' :
          'Weight bearing symmetry is within functional limits. '
        }`,
        
        plan: `Continue with ${
          session.notes.includes('gait') ? 'gait training' : 
          session.notes.includes('balance') ? 'balance activities' :
          session.notes.includes('strength') ? 'progressive strengthening' :
          'current rehabilitation protocol'
        } focusing on ${
          avgSymmetry < 70 ? 'gait symmetry improvement' : 
          weightBearingAsymmetry > 10 ? 'weight shifting exercises' :
          avgBalanceScore < 0.7 ? 'balance training' :
          'functional strength and motor control'
        }. ${
          avgCadence < 100 ? 'Include cadence training to increase step rate. ' :
          'Maintain current cadence with focus on quality of movement. '
        }${
          (lastMetric?.range && 
           ((typeof endLeftKneeROM === 'number' && endLeftKneeROM < 120) || 
            (typeof endRightKneeROM === 'number' && endRightKneeROM < 120))) ?
          'Continue with ROM exercises to improve knee flexion. ' : ''
        }${
          avgBalanceScore < 0.7 ? 'Incorporate progressively challenging balance activities. ' : ''
        }Home exercise program updated to reflect current status. Reassess in 1 week.`
      };
      
      setGeneratedNote(note);
    } catch (error) {
      console.error("Error generating note:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveEdit = (editedNote: SOAPNote) => {
    setGeneratedNote(editedNote);
    setEditMode(false);
  };
  
  return (
    <CollapsiblePanel
      title="AI-Generated SOAP Note"
      icon={<ClipboardList className="w-6 h-6 text-indigo-400" />}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {!generatedNote ? (
          <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-gray-800 rounded-lg">
            <p className="text-gray-300 text-center">
              Generate a structured SOAP note based on this session's data
            </p>
            <button
              onClick={generateNote}
              disabled={isGenerating}
              className={`flex items-center px-4 py-2 rounded ${
                isGenerating ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ClipboardList className="w-5 h-5 mr-2" />
                  Generate SOAP Note
                </>
              )}
            </button>
          </div>
        ) : editMode ? (
          <SOAPNoteEditor 
            note={generatedNote}
            onSave={handleSaveEdit}
            onCancel={() => setEditMode(false)}
          />
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg space-y-4">
              <div>
                <h3 className="text-sm text-gray-400 font-medium mb-1">SUBJECTIVE</h3>
                <p className="text-white">{generatedNote.subjective}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400 font-medium mb-1">OBJECTIVE</h3>
                <p className="text-white">{generatedNote.objective}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400 font-medium mb-1">ASSESSMENT</h3>
                <p className="text-white">{generatedNote.assessment}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400 font-medium mb-1">PLAN</h3>
                <p className="text-white">{generatedNote.plan}</p>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </button>
              
              <button
                onClick={generateNote}
                className="flex items-center text-sm px-3 py-1 rounded bg-indigo-700 hover:bg-indigo-600"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Regenerate
              </button>
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
              <div className="flex items-center text-sm text-gray-400">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                SOAP note ready for your EHR system
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
};

export default NoteGenerator; 