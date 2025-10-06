// Utility to generate dummy data for patient comparison analytics
// This simulates data from 15 clinics, 60 patients per week per clinic, for 12 months

// Types for our dummy data
export interface PatientDemographics {
  id: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // in cm
  weight: number; // in kg
  injury: string;
  diagnosis: string;
  dxCode: string;
  surgeryDate?: string;
  clinic: number;
}

export interface MetricSnapshot {
  timestamp: string;
  sessionNumber: number;
  weeksFromBaseline: number;
  cadence: number;
  gaitSymmetry: number;
  stepLengthSymmetry: number;
  walkingSpeed: number;
  strideLength: number;
  balanceScore: number;
  romKnee?: number; // Optional: Range of motion - knee (degrees)
  romAnkle?: number; // Optional: Range of motion - ankle (degrees)
  stabilityIndex: number;
  weightBearing: number; // Percentage of full weight bearing
  painLevel: number; // 0-10 scale
}

export interface PatientData {
  demographics: PatientDemographics;
  metrics: MetricSnapshot[];
}

// Common injuries and diagnoses based on different body regions
const injuries = {
  knee: [
    { injury: 'ACL Tear', diagnosis: 'ACL Reconstruction', dxCode: 'S83.51A' },
    { injury: 'Meniscus Tear', diagnosis: 'Meniscectomy', dxCode: 'S83.211A' },
    { injury: 'PCL Tear', diagnosis: 'PCL Reconstruction', dxCode: 'S83.52A' },
    { injury: 'MCL Sprain', diagnosis: 'MCL Sprain, Grade II', dxCode: 'S83.411A' },
    { injury: 'Total Knee Replacement', diagnosis: 'Post-op TKA', dxCode: 'Z47.1' }
  ],
  ankle: [
    { injury: 'Ankle Sprain', diagnosis: 'Lateral Ankle Sprain', dxCode: 'S93.401A' },
    { injury: 'Achilles Tendon Rupture', diagnosis: 'Achilles Repair', dxCode: 'S86.011A' },
    { injury: 'Ankle Fracture', diagnosis: 'Post-ORIF Ankle Fracture', dxCode: 'S82.891A' }
  ],
  hip: [
    { injury: 'Hip Fracture', diagnosis: 'Post-ORIF Hip Fracture', dxCode: 'S72.001A' },
    { injury: 'Hip Replacement', diagnosis: 'Post-op THA', dxCode: 'Z47.1' },
    { injury: 'Hip Labral Tear', diagnosis: 'Hip Labral Repair', dxCode: 'S76.111A' }
  ],
  back: [
    { injury: 'Herniated Disc', diagnosis: 'Lumbar Disc Herniation', dxCode: 'M51.26' },
    { injury: 'Lumbar Fusion', diagnosis: 'Post-op Lumbar Fusion', dxCode: 'Z98.1' },
    { injury: 'Sciatica', diagnosis: 'Sciatica', dxCode: 'M54.3' }
  ]
};

// Function to create a realistic timestamp within the past year
function getRandomTimestamp(weeksAgo: number): string {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (weeksAgo * 7 * 24 * 60 * 60 * 1000));
  return pastDate.toISOString();
}

// Function to create a surgery date (if applicable)
function getSurgeryDate(weeksAgo: number): string | undefined {
  // 80% of patients have surgery, 20% don't
  if (Math.random() > 0.2) {
    const now = new Date();
    const surgeryDate = new Date(now.getTime() - (weeksAgo * 7 * 24 * 60 * 60 * 1000));
    return surgeryDate.toISOString().split('T')[0]; // Just the date part
  }
  return undefined;
}

// Function to generate a realistic progression of metrics for a patient
function generatePatientMetrics(demographics: PatientDemographics, numberOfSessions: number): MetricSnapshot[] {
  const metrics: MetricSnapshot[] = [];
  const hasKneeInjury = demographics.injury.toLowerCase().includes('knee');
  const hasAnkleInjury = demographics.injury.toLowerCase().includes('ankle');
  
  // Initial baseline metrics based on injury type and demographic
  let baselineCadence = 0;
  let baselineGaitSymmetry = 0;
  let baselineStepLengthSymmetry = 0;
  let baselineWalkingSpeed = 0;
  let baselineStrideLength = 0;
  let baselineBalanceScore = 0;
  let baselineStabilityIndex = 0;
  let baselineWeightBearing = 0;
  let baselinePainLevel = 0;
  
  // Set realistic baseline values based on injury
  if (hasKneeInjury) {
    baselineCadence = Math.random() * 20 + 70; // 70-90 steps/min
    baselineGaitSymmetry = Math.random() * 30 + 50; // 50-80% (asymmetrical)
    baselineStepLengthSymmetry = Math.random() * 40 + 50; // 50-90%
    baselineWalkingSpeed = Math.random() * 0.3 + 0.5; // 0.5-0.8 m/s
    baselineStrideLength = Math.random() * 20 + 80; // 80-100 cm
    baselineBalanceScore = Math.random() * 20 + 50; // 50-70 (out of 100)
    baselineStabilityIndex = Math.random() * 3 + 3; // 3-6 (lower is better)
    baselineWeightBearing = Math.random() * 30 + 50; // 50-80%
    baselinePainLevel = Math.random() * 3 + 4; // 4-7 out of 10
  } else if (hasAnkleInjury) {
    baselineCadence = Math.random() * 15 + 75; // 75-90 steps/min
    baselineGaitSymmetry = Math.random() * 30 + 55; // 55-85%
    baselineStepLengthSymmetry = Math.random() * 30 + 60; // 60-90%
    baselineWalkingSpeed = Math.random() * 0.3 + 0.6; // 0.6-0.9 m/s
    baselineStrideLength = Math.random() * 20 + 85; // 85-105 cm
    baselineBalanceScore = Math.random() * 20 + 45; // 45-65 (out of 100)
    baselineStabilityIndex = Math.random() * 2.5 + 3; // 3-5.5 (lower is better)
    baselineWeightBearing = Math.random() * 25 + 60; // 60-85%
    baselinePainLevel = Math.random() * 3 + 3; // 3-6 out of 10
  } else {
    // Other injuries (hip, back, etc.)
    baselineCadence = Math.random() * 15 + 80; // 80-95 steps/min
    baselineGaitSymmetry = Math.random() * 25 + 60; // 60-85%
    baselineStepLengthSymmetry = Math.random() * 25 + 65; // 65-90%
    baselineWalkingSpeed = Math.random() * 0.3 + 0.7; // 0.7-1.0 m/s
    baselineStrideLength = Math.random() * 20 + 90; // 90-110 cm
    baselineBalanceScore = Math.random() * 20 + 55; // 55-75 (out of 100)
    baselineStabilityIndex = Math.random() * 2 + 2.5; // 2.5-4.5 (lower is better)
    baselineWeightBearing = Math.random() * 20 + 70; // 70-90%
    baselinePainLevel = Math.random() * 3 + 2; // 2-5 out of 10
  }
  
  // Target values: what we expect at the end of therapy
  const targetCadence = 110 + Math.random() * 10; // 110-120 steps/min
  const targetGaitSymmetry = 95 + Math.random() * 5; // 95-100% (nearly symmetrical)
  const targetStepLengthSymmetry = 95 + Math.random() * 5; // 95-100%
  const targetWalkingSpeed = 1.2 + Math.random() * 0.3; // 1.2-1.5 m/s
  const targetStrideLength = 120 + Math.random() * 10; // 120-130 cm
  const targetBalanceScore = 90 + Math.random() * 10; // 90-100 (out of 100)
  const targetStabilityIndex = 1 + Math.random() * 0.5; // 1-1.5 (lower is better)
  const targetWeightBearing = 95 + Math.random() * 5; // 95-100%
  const targetPainLevel = Math.random() * 1.5; // 0-1.5 out of 10
  
  // Create a progression of metrics that gradually improve
  for (let i = 0; i < numberOfSessions; i++) {
    const progress = i / (numberOfSessions - 1); // 0 to 1
    
    // Add some noise to make data realistic
    const noise = () => (Math.random() - 0.5) * 0.1;
    const weeksBetweenSessions = Math.floor(Math.random() * 2) + 1; // 1-2 weeks between sessions
    const weeksFromBaseline = i * weeksBetweenSessions;
    
    // Calculate current metrics with a bit of noise
    const currentCadence = baselineCadence + (targetCadence - baselineCadence) * (progress + noise());
    const currentGaitSymmetry = baselineGaitSymmetry + (targetGaitSymmetry - baselineGaitSymmetry) * (progress + noise());
    const currentStepLengthSymmetry = baselineStepLengthSymmetry + (targetStepLengthSymmetry - baselineStepLengthSymmetry) * (progress + noise());
    const currentWalkingSpeed = baselineWalkingSpeed + (targetWalkingSpeed - baselineWalkingSpeed) * (progress + noise());
    const currentStrideLength = baselineStrideLength + (targetStrideLength - baselineStrideLength) * (progress + noise());
    const currentBalanceScore = baselineBalanceScore + (targetBalanceScore - baselineBalanceScore) * (progress + noise());
    const currentStabilityIndex = baselineStabilityIndex - (baselineStabilityIndex - targetStabilityIndex) * (progress + noise());
    const currentWeightBearing = baselineWeightBearing + (targetWeightBearing - baselineWeightBearing) * (progress + noise());
    const currentPainLevel = baselinePainLevel - (baselinePainLevel - targetPainLevel) * (progress + noise());
    
    // Add optional ROM values for knee injuries
    let romKnee: number | undefined;
    let romAnkle: number | undefined;
    
    if (hasKneeInjury) {
      const baselineROM = 90 + Math.random() * 20; // 90-110 degrees
      const targetROM = 125 + Math.random() * 10; // 125-135 degrees
      romKnee = baselineROM + (targetROM - baselineROM) * (progress + noise());
    }
    
    if (hasAnkleInjury) {
      const baselineROM = 15 + Math.random() * 10; // 15-25 degrees
      const targetROM = 40 + Math.random() * 10; // 40-50 degrees
      romAnkle = baselineROM + (targetROM - baselineROM) * (progress + noise());
    }
    
    // Create the metric snapshot
    metrics.push({
      timestamp: getRandomTimestamp(weeksFromBaseline),
      sessionNumber: i + 1,
      weeksFromBaseline,
      cadence: Math.round(currentCadence * 10) / 10,
      gaitSymmetry: Math.round(currentGaitSymmetry * 10) / 10,
      stepLengthSymmetry: Math.round(currentStepLengthSymmetry * 10) / 10,
      walkingSpeed: Math.round(currentWalkingSpeed * 100) / 100,
      strideLength: Math.round(currentStrideLength * 10) / 10,
      balanceScore: Math.round(currentBalanceScore * 10) / 10,
      romKnee: romKnee ? Math.round(romKnee) : undefined,
      romAnkle: romAnkle ? Math.round(romAnkle) : undefined,
      stabilityIndex: Math.round(currentStabilityIndex * 100) / 100,
      weightBearing: Math.round(currentWeightBearing * 10) / 10,
      painLevel: Math.round(currentPainLevel * 10) / 10
    });
  }
  
  return metrics;
}

// Generate a single patient with realistic progression data
export function generatePatient(id: number): PatientData {
  // Random patient demographics
  const age = Math.floor(Math.random() * 50) + 20; // 20-70 years
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const height = Math.floor(Math.random() * 30) + 160; // 160-190 cm
  const weight = Math.floor(Math.random() * 50) + 60; // 60-110 kg
  const clinic = Math.floor(Math.random() * 15) + 1; // 15 clinics
  
  // Select random body region and injury
  const bodyRegions = Object.keys(injuries);
  const bodyRegion = bodyRegions[Math.floor(Math.random() * bodyRegions.length)];
  const injuryData = injuries[bodyRegion as keyof typeof injuries][
    Math.floor(Math.random() * injuries[bodyRegion as keyof typeof injuries].length)
  ];
  
  // Number of sessions (patients typically have 6-12 sessions)
  const numberOfSessions = Math.floor(Math.random() * 6) + 6;
  
  // Create patient demographics
  const demographics: PatientDemographics = {
    id,
    age,
    gender,
    height,
    weight,
    injury: injuryData.injury,
    diagnosis: injuryData.diagnosis,
    dxCode: injuryData.dxCode,
    surgeryDate: getSurgeryDate(Math.floor(Math.random() * 12) + 1), // Surgery 1-12 weeks ago
    clinic
  };
  
  // Generate metrics data for the patient
  const metrics = generatePatientMetrics(demographics, numberOfSessions);
  
  return {
    demographics,
    metrics
  };
}

// Generate the full dataset with 10,800 patients (15 clinics * 60 patients/week * 12 months)
// For performance, we're limiting this to a random subset
let fullDataset: PatientData[] = [];

export function generateFullDataset(count: number = 500): PatientData[] {
  if (fullDataset.length === 0) {
    console.log("Generating comparison dataset...");
    fullDataset = Array.from({ length: count }, (_, i) => generatePatient(i + 1));
    console.log(`Generated ${count} patient records for comparison`);
  }
  return fullDataset;
}

// Function to find similar patients based on demographics and condition
export function findSimilarPatients(
  patient: PatientDemographics, 
  allPatients: PatientData[],
  options: {
    ageRange?: number,
    matchGender?: boolean,
    matchDiagnosis?: boolean,
    matchInjury?: boolean
  } = {
    ageRange: 5,
    matchGender: true,
    matchDiagnosis: true,
    matchInjury: false
  }
): PatientData[] {
  const {
    ageRange = 5,
    matchGender = true,
    matchDiagnosis = true,
    matchInjury = false
  } = options;
  
  return allPatients.filter(p => {
    const ageMatch = Math.abs(p.demographics.age - patient.age) <= ageRange;
    const genderMatch = !matchGender || p.demographics.gender === patient.gender;
    const diagnosisMatch = !matchDiagnosis || p.demographics.diagnosis === patient.diagnosis;
    const injuryMatch = !matchInjury || p.demographics.injury === patient.injury;
    
    return ageMatch && genderMatch && (diagnosisMatch || injuryMatch) && p.demographics.id !== patient.id;
  });
}

// Get aggregated metrics for a group of patients
export function getAggregatedMetrics(patients: PatientData[]): { 
  byWeek: Record<number, { 
    cadence: number, 
    gaitSymmetry: number,
    stepLengthSymmetry: number,
    walkingSpeed: number,
    balanceScore: number,
    painLevel: number,
    count: number 
  }> 
} {
  const aggregated: Record<number, {
    cadence: number,
    gaitSymmetry: number,
    stepLengthSymmetry: number,
    walkingSpeed: number,
    balanceScore: number,
    painLevel: number,
    count: number
  }> = {};
  
  patients.forEach(patient => {
    patient.metrics.forEach(metric => {
      const week = metric.weeksFromBaseline;
      
      if (!aggregated[week]) {
        aggregated[week] = {
          cadence: 0,
          gaitSymmetry: 0,
          stepLengthSymmetry: 0,
          walkingSpeed: 0,
          balanceScore: 0,
          painLevel: 0,
          count: 0
        };
      }
      
      aggregated[week].cadence += metric.cadence;
      aggregated[week].gaitSymmetry += metric.gaitSymmetry;
      aggregated[week].stepLengthSymmetry += metric.stepLengthSymmetry;
      aggregated[week].walkingSpeed += metric.walkingSpeed;
      aggregated[week].balanceScore += metric.balanceScore;
      aggregated[week].painLevel += metric.painLevel;
      aggregated[week].count += 1;
    });
  });
  
  // Calculate averages
  Object.keys(aggregated).forEach(weekStr => {
    const week = parseInt(weekStr);
    const data = aggregated[week];
    
    if (data.count > 0) {
      data.cadence = Math.round((data.cadence / data.count) * 10) / 10;
      data.gaitSymmetry = Math.round((data.gaitSymmetry / data.count) * 10) / 10;
      data.stepLengthSymmetry = Math.round((data.stepLengthSymmetry / data.count) * 10) / 10;
      data.walkingSpeed = Math.round((data.walkingSpeed / data.count) * 100) / 100;
      data.balanceScore = Math.round((data.balanceScore / data.count) * 10) / 10;
      data.painLevel = Math.round((data.painLevel / data.count) * 10) / 10;
    }
  });
  
  return { byWeek: aggregated };
}

// Export dummy dataset for development
export const dummyDataset = generateFullDataset(); 