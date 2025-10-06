import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, Cell, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { CollapsiblePanel } from '../../components/CollapsiblePanel';
import { 
  generateFullDataset, findSimilarPatients, getAggregatedMetrics, 
  PatientData, PatientDemographics, MetricSnapshot 
} from '../../utils/dummyComparisonData';
import { Activity, BarChart2, Users, Filter, Maximize2, TrendingUp, CheckCircle } from 'lucide-react';

export default function PatientComparisonView() {
  // Load the full dataset (this would be fetched from an API in a real app)
  const allPatients = useMemo(() => generateFullDataset(500), []);
  
  // State for selected patient and comparison filters
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [comparisonSettings, setComparisonSettings] = useState({
    ageRange: 5,
    matchGender: true,
    matchDiagnosis: true,
    matchInjury: false
  });
  
  // State for similar patients
  const [similarPatients, setSimilarPatients] = useState<PatientData[]>([]);
  
  // State for chart metric
  const [activeMetric, setActiveMetric] = useState<string>('gaitSymmetry');
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('overview');
  
  // Select a random patient on initial load
  useEffect(() => {
    const randomPatient = allPatients[Math.floor(Math.random() * allPatients.length)];
    setSelectedPatient(randomPatient);
  }, [allPatients]);
  
  // Update similar patients when selected patient or filters change
  useEffect(() => {
    if (selectedPatient) {
      const similar = findSimilarPatients(
        selectedPatient.demographics,
        allPatients,
        comparisonSettings
      );
      setSimilarPatients(similar);
    }
  }, [selectedPatient, comparisonSettings, allPatients]);
  
  // Calculate aggregated metrics for similar patients
  const aggregatedMetrics = useMemo(() => {
    if (!similarPatients.length) return { byWeek: {} };
    return getAggregatedMetrics(similarPatients);
  }, [similarPatients]);
  
  // Format patient metrics for comparison chart
  const comparisonData = useMemo(() => {
    if (!selectedPatient || !Object.keys(aggregatedMetrics.byWeek).length) return [];
    
    const data: any[] = [];
    
    // Get the maximum week for the selected patient
    const maxPatientWeek = Math.max(
      ...selectedPatient.metrics.map(m => m.weeksFromBaseline)
    );
    
    // Get the maximum week in the aggregated data
    const maxAggregatedWeek = Math.max(
      ...Object.keys(aggregatedMetrics.byWeek).map(w => parseInt(w))
    );
    
    // Use the maximum of both to ensure we cover the full range
    const maxWeek = Math.max(maxPatientWeek, maxAggregatedWeek);
    
    // Create data points for each week
    for (let week = 0; week <= maxWeek; week++) {
      const patientMetric = selectedPatient.metrics.find(
        m => m.weeksFromBaseline === week
      );
      
      const aggregatedMetric = aggregatedMetrics.byWeek[week];
      
      data.push({
        week,
        // Patient metrics (if available for this week)
        patientCadence: patientMetric?.cadence,
        patientGaitSymmetry: patientMetric?.gaitSymmetry,
        patientStepLengthSymmetry: patientMetric?.stepLengthSymmetry,
        patientWalkingSpeed: patientMetric?.walkingSpeed,
        patientBalanceScore: patientMetric?.balanceScore,
        patientPainLevel: patientMetric?.painLevel,
        
        // Aggregated metrics from similar patients (if available)
        avgCadence: aggregatedMetric?.cadence,
        avgGaitSymmetry: aggregatedMetric?.gaitSymmetry,
        avgStepLengthSymmetry: aggregatedMetric?.stepLengthSymmetry,
        avgWalkingSpeed: aggregatedMetric?.walkingSpeed,
        avgBalanceScore: aggregatedMetric?.balanceScore,
        avgPainLevel: aggregatedMetric?.painLevel,
        
        // Sample count for this week
        count: aggregatedMetric?.count || 0
      });
    }
    
    return data;
  }, [selectedPatient, aggregatedMetrics]);
  
  // Handle filter changes
  const handleFilterChange = (setting: string, value: any) => {
    setComparisonSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  // Handle patient selection
  const handlePatientSelection = (patient: PatientData) => {
    setSelectedPatient(patient);
  };
  
  // Get metrics for radar chart
  const radarData = useMemo(() => {
    if (!selectedPatient || !Object.keys(aggregatedMetrics.byWeek).length) return [];
    
    // Get the latest metrics for the patient
    const latestMetrics = selectedPatient.metrics[selectedPatient.metrics.length - 1];
    
    // Get the corresponding week from aggregated data
    const week = latestMetrics.weeksFromBaseline;
    const aggregatedMetric = aggregatedMetrics.byWeek[week];
    
    if (!aggregatedMetric) return [];
    
    return [
      { metric: 'Cadence', patient: latestMetrics.cadence, average: aggregatedMetric.cadence },
      { metric: 'Gait Symmetry', patient: latestMetrics.gaitSymmetry, average: aggregatedMetric.gaitSymmetry },
      { metric: 'Step Length Sym', patient: latestMetrics.stepLengthSymmetry, average: aggregatedMetric.stepLengthSymmetry },
      { metric: 'Walking Speed', patient: latestMetrics.walkingSpeed * 50, average: aggregatedMetric.walkingSpeed * 50 }, // Scale for radar
      { metric: 'Balance Score', patient: latestMetrics.balanceScore, average: aggregatedMetric.balanceScore },
      { metric: 'Pain Level', patient: Math.max(0, 10 - latestMetrics.painLevel) * 10, average: Math.max(0, 10 - aggregatedMetric.painLevel) * 10 } // Invert and scale
    ];
  }, [selectedPatient, aggregatedMetrics]);
  
  // Get title for metric
  const getMetricTitle = (metric: string): string => {
    switch (metric) {
      case 'gaitSymmetry': return 'Gait Symmetry';
      case 'stepLengthSymmetry': return 'Step Length Symmetry';
      case 'cadence': return 'Cadence';
      case 'walkingSpeed': return 'Walking Speed';
      case 'balanceScore': return 'Balance Score';
      case 'painLevel': return 'Pain Level';
      default: return metric;
    }
  };
  
  // Get Y-axis label for metric
  const getMetricUnit = (metric: string): string => {
    switch (metric) {
      case 'gaitSymmetry': return '%';
      case 'stepLengthSymmetry': return '%';
      case 'cadence': return 'steps/min';
      case 'walkingSpeed': return 'm/s';
      case 'balanceScore': return '/100';
      case 'painLevel': return '/10';
      default: return '';
    }
  };
  
  // Get pain level description
  const getPainLevelDescription = (level: number): string => {
    if (level <= 2) return 'Minimal';
    if (level <= 4) return 'Mild';
    if (level <= 6) return 'Moderate';
    if (level <= 8) return 'Severe';
    return 'Extreme';
  };
  
  if (!selectedPatient) {
    return (
      <div className="p-6 flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-4">Patient Comparison Analytics</h1>
      
      {/* Patient info and filter panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Selected Patient Card */}
        <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Users className="mr-2 text-blue-400" size={20} />
            Selected Patient
          </h2>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Age:</span>
              <span className="font-medium">{selectedPatient.demographics.age} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Gender:</span>
              <span className="font-medium capitalize">{selectedPatient.demographics.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Height/Weight:</span>
              <span className="font-medium">{selectedPatient.demographics.height} cm / {selectedPatient.demographics.weight} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Diagnosis:</span>
              <span className="font-medium">{selectedPatient.demographics.diagnosis}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sessions:</span>
              <span className="font-medium">{selectedPatient.metrics.length}</span>
            </div>
            {selectedPatient.demographics.surgeryDate && (
              <div className="flex justify-between">
                <span className="text-gray-400">Surgery Date:</span>
                <span className="font-medium">{new Date(selectedPatient.demographics.surgeryDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          <button 
            className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
            onClick={() => {
              const randomPatient = allPatients[Math.floor(Math.random() * allPatients.length)];
              handlePatientSelection(randomPatient);
            }}
          >
            Select Different Patient
          </button>
        </div>
        
        {/* Comparison Filters Card */}
        <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Filter className="mr-2 text-green-400" size={20} />
            Comparison Filters
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Age Range (±years)</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="range" 
                  min="1" 
                  max="15" 
                  value={comparisonSettings.ageRange} 
                  onChange={(e) => handleFilterChange('ageRange', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium min-w-[30px] text-center">{comparisonSettings.ageRange}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Matching Criteria</label>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="matchGender" 
                  checked={comparisonSettings.matchGender} 
                  onChange={(e) => handleFilterChange('matchGender', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                />
                <label htmlFor="matchGender" className="ml-2 text-sm">Match Gender</label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="matchDiagnosis" 
                  checked={comparisonSettings.matchDiagnosis} 
                  onChange={(e) => handleFilterChange('matchDiagnosis', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                />
                <label htmlFor="matchDiagnosis" className="ml-2 text-sm">Match Diagnosis</label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="matchInjury" 
                  checked={comparisonSettings.matchInjury} 
                  onChange={(e) => handleFilterChange('matchInjury', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                />
                <label htmlFor="matchInjury" className="ml-2 text-sm">Match Injury Type</label>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-800 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-300">Similar Patients:</span>
              <span className="font-bold text-blue-300">{similarPatients.length}</span>
            </div>
            <p className="text-xs text-blue-200 mt-1">
              {similarPatients.length > 0 
                ? `Showing comparison with ${similarPatients.length} similar patients`
                : 'No similar patients found. Try adjusting filters.'}
            </p>
          </div>
        </div>
        
        {/* Metrics Overview Card */}
        <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Activity className="mr-2 text-purple-400" size={20} />
            Current Metrics
          </h2>
          
          {selectedPatient.metrics.length > 0 && (
            <div className="space-y-3">
              {/* Latest metrics */}
              {['gaitSymmetry', 'cadence', 'balanceScore', 'painLevel'].map((metric) => {
                const latestMetrics = selectedPatient.metrics[selectedPatient.metrics.length - 1];
                const value = latestMetrics[metric as keyof MetricSnapshot];
                
                if (typeof value !== 'number') return null;
                
                // Get similar patient average for comparison
                const week = latestMetrics.weeksFromBaseline;
                const avgValue = aggregatedMetrics.byWeek[week]?.[metric as keyof typeof aggregatedMetrics.byWeek[0]] || 0;
                
                // Calculate difference
                const diff = value - (avgValue as number);
                const isPositive = 
                  (metric === 'painLevel' && diff < 0) || 
                  (metric !== 'painLevel' && diff > 0);
                
                return (
                  <div key={metric} className="bg-gray-700 rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">{getMetricTitle(metric)}</span>
                      <div className="flex items-center">
                        <span className="font-medium">{typeof value === 'number' ? value.toFixed(1) : value} {getMetricUnit(metric)}</span>
                        {avgValue !== 0 && (
                          <span className={`ml-2 text-xs ${isPositive ? 'text-green-400' : 'text-orange-400'}`}>
                            {isPositive ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Special case for pain level */}
                    {metric === 'painLevel' && typeof value === 'number' && (
                      <div className="text-xs text-right mt-1 text-gray-400">
                        {getPainLevelDescription(value)}
                      </div>
                    )}
                    
                    {/* Progress bar */}
                    <div className="mt-2 relative h-1.5 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className={`absolute h-full ${isPositive ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ 
                          width: `${metric === 'painLevel' 
                            ? Math.min(100, (value as number) * 10) 
                            : Math.min(100, (value as number))}%` 
                        }}
                      />
                    </div>
                    
                    {/* Comparison text */}
                    {avgValue !== 0 && (
                      <div className="mt-1 text-xs text-gray-400 flex justify-between">
                        <span>Your patient</span>
                        <span>Similar patients avg: {avgValue.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Main comparison chart */}
      <CollapsiblePanel
        title={`Metric Comparison: ${getMetricTitle(activeMetric)}`}
        subtitle={`Comparing patient progress with ${similarPatients.length} similar patients`}
        icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
        defaultExpanded={true}
      >
        <div className="bg-gray-800 p-4 rounded-lg">
          {/* Metric selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['gaitSymmetry', 'stepLengthSymmetry', 'cadence', 'walkingSpeed', 'balanceScore', 'painLevel'].map((metric) => (
              <button
                key={metric}
                className={`px-3 py-1 text-sm rounded-full ${activeMetric === metric 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                onClick={() => setActiveMetric(metric)}
              >
                {getMetricTitle(metric)}
              </button>
            ))}
          </div>
          
          {/* Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={comparisonData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="week" 
                  label={{ 
                    value: 'Weeks Since Baseline', 
                    position: 'insideBottom', 
                    offset: -5,
                    fill: '#9CA3AF'
                  }}
                  stroke="#6B7280"
                />
                <YAxis 
                  label={{ 
                    value: `${getMetricTitle(activeMetric)} (${getMetricUnit(activeMetric)})`, 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#9CA3AF' }
                  }}
                  stroke="#6B7280"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }}
                  formatter={(value: any) => [value ? `${value.toFixed(1)} ${getMetricUnit(activeMetric)}` : 'N/A']}
                  labelFormatter={(week) => `Week ${week}`}
                />
                <Legend />
                
                {/* Area for standard deviation range - implement if needed */}
                
                {/* Line for similar patients average */}
                <Line
                  type="monotone"
                  dataKey={`avg${activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)}`}
                  name="Similar Patients Avg."
                  stroke="#60A5FA"
                  dot={true}
                  strokeWidth={2}
                />
                
                {/* Line for selected patient */}
                <Line
                  type="monotone"
                  dataKey={`patient${activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)}`}
                  name="Your Patient"
                  stroke="#EC4899"
                  dot={{ r: 5 }}
                  activeDot={{ r: 8 }}
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Sample size indicator */}
          <div className="flex justify-end mt-2 text-xs text-gray-400">
            <span>Based on {similarPatients.length} similar patients</span>
          </div>
        </div>
      </CollapsiblePanel>
      
      {/* Bottom metrics panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <CollapsiblePanel
          title="Multi-Metric Comparison"
          subtitle="Current metrics vs similar patients"
          icon={<BarChart2 className="w-6 h-6 text-green-500" />}
          defaultExpanded={true}
        >
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#4B5563" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#9CA3AF' }} />
                  <Radar
                    name="Your Patient"
                    dataKey="patient"
                    stroke="#EC4899"
                    fill="#EC4899"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Similar Patients Avg."
                    dataKey="average"
                    stroke="#60A5FA"
                    fill="#60A5FA"
                    fillOpacity={0.2}
                  />
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CollapsiblePanel>
        
        {/* Treatment Recommendations */}
        <CollapsiblePanel
          title="Treatment Insights"
          subtitle="Based on similar patient outcomes"
          icon={<CheckCircle className="w-6 h-6 text-purple-500" />}
          defaultExpanded={true}
        >
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="space-y-4">
              <div className="p-3 bg-gray-700 rounded-md">
                <h3 className="font-medium text-green-400 mb-1">Key Progress Indicators</h3>
                <p className="text-sm">Similar patients showed greatest improvement in {activeMetric === 'painLevel' ? 'pain reduction' : getMetricTitle(activeMetric)} between weeks 3-5.</p>
              </div>
              
              <div className="p-3 bg-gray-700 rounded-md">
                <h3 className="font-medium text-blue-400 mb-1">Treatment Effectiveness</h3>
                <p className="text-sm">
                  {selectedPatient.demographics.diagnosis.includes('ACL') && 'Patients with ACL reconstruction responded best to progressive weight-bearing and neuromuscular control exercises.'}
                  {selectedPatient.demographics.diagnosis.includes('Ankle') && 'Balance training and progressive resistance exercises showed highest efficacy for this condition.'}
                  {selectedPatient.demographics.diagnosis.includes('Hip') && 'Gait training combined with hip abductor strengthening yielded optimal outcomes.'}
                  {!selectedPatient.demographics.diagnosis.includes('ACL') && 
                   !selectedPatient.demographics.diagnosis.includes('Ankle') && 
                   !selectedPatient.demographics.diagnosis.includes('Hip') && 
                   'Similar patients showed best outcomes with a combination of functional movement and targeted resistance training.'}
                </p>
              </div>
              
              <div className="p-3 bg-gray-700 rounded-md">
                <h3 className="font-medium text-purple-400 mb-1">Expected Timeline</h3>
                <p className="text-sm">Based on similar patients, expect 80% functional recovery by week {Math.floor(Math.random() * 4) + 8}, with continued improvements through week {Math.floor(Math.random() * 8) + 14}.</p>
              </div>
              
              <div className="p-3 bg-gray-700 rounded-md">
                <h3 className="font-medium text-yellow-400 mb-1">Adjustment Considerations</h3>
                <p className="text-sm">
                  {selectedPatient.metrics.length > 0 && selectedPatient.metrics[selectedPatient.metrics.length - 1].painLevel > 5
                    ? 'Consider reducing intensity due to higher than average pain levels.'
                    : 'Patient is progressing well. Continue with current treatment plan.'}
                </p>
              </div>
            </div>
          </div>
        </CollapsiblePanel>
      </div>
    </div>
  );
} 