// Building data type
export interface Building {
  id: string;
  name: string;
  type: 'hospital' | 'office' | 'retail' | 'residence' | 'education';
  location: string;
  size: number; // Size factor for visualization
  position: [number, number, number]; // 3D position
  squareFootage: number;
  performance: number; // Performance score 0-100
  metrics: {
    efficiency: number; // 0-100
    circulation: number; // 0-100
    occupancy: number; // Percentage of capacity
    energyUsage: number; // kWh per sqft
    peakTimes: string[];
    averageDwellTime: number; // minutes
  };
  designPatterns: {
    id: string;
    name: string;
    effectiveness: number; // 0-100
    description: string;
  }[];
}

// Generate random positions in a 3D sphere formation
const generatePositions = (count: number, radius: number = 8) => {
  const positions: [number, number, number][] = [];
  
  for (let i = 0; i < count; i++) {
    // Use spherical coordinates for an evenly distributed sphere
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    
    // Convert to cartesian coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // Add some random variation
    const jitter = radius * 0.2;
    positions.push([
      x + (Math.random() * jitter - jitter/2),
      y + (Math.random() * jitter - jitter/2),
      z + (Math.random() * jitter - jitter/2)
    ]);
  }
  
  return positions;
};

// Create demo mock data for buildings
export const mockBuildingData: Building[] = (() => {
  // Building types and counts
  const buildingTypes = [
    { type: 'hospital', count: 5 },
    { type: 'office', count: 8 },
    { type: 'retail', count: 6 },
    { type: 'residence', count: 4 },
    { type: 'education', count: 3 }
  ];
  
  // City names for locations
  const cities = ['New York', 'Boston', 'Chicago', 'San Francisco'];
  
  // Generate all positions first
  const totalCount = buildingTypes.reduce((sum, t) => sum + t.count, 0);
  const allPositions = generatePositions(totalCount);
  
  // Build the mock data
  const results: Building[] = [];
  let positionIndex = 0;
  
  buildingTypes.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const designPatternCount = Math.floor(Math.random() * 3) + 1;
      const patterns = [];
      
      // Generate random design patterns
      for (let j = 0; j < designPatternCount; j++) {
        patterns.push({
          id: `pattern-${type}-${i}-${j}`,
          name: [
            'Circular Nurse Station',
            'Open Collaboration',
            'Natural Light Maximization',
            'Decentralized Services',
            'Dual Circulation Paths',
            'Privacy Gradients',
            'Activity-Based Zones',
            'Biophilic Elements'
          ][Math.floor(Math.random() * 8)],
          effectiveness: Math.floor(Math.random() * 40) + 60, // 60-100 range
          description: 'A design pattern that optimizes space usage and improves user experience'
        });
      }
      
      results.push({
        id: `${type}-${i}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`,
        type: type as Building['type'],
        location: cities[Math.floor(Math.random() * cities.length)],
        size: (Math.random() * 0.5) + 0.75, // Size variation
        position: allPositions[positionIndex++],
        squareFootage: Math.floor(Math.random() * 50000) + 50000,
        performance: Math.floor(Math.random() * 30) + 70, // 70-100 range
        metrics: {
          efficiency: Math.floor(Math.random() * 30) + 70,
          circulation: Math.floor(Math.random() * 40) + 60,
          occupancy: Math.floor(Math.random() * 50) + 50,
          energyUsage: Math.floor(Math.random() * 20) + 10,
          peakTimes: ['9:00 AM', '12:00 PM', '3:00 PM'],
          averageDwellTime: Math.floor(Math.random() * 20) + 10
        },
        designPatterns: patterns
      });
    }
  });
  
  return results;
})();

// Areas within buildings
export interface BuildingArea {
  id: string;
  buildingId: string;
  name: string;
  type: string;
  squareFootage: number;
  utilizationRate: number; // 0-100
  trafficVolume: {
    time: string;
    value: number;
  }[];
  congestionPoints: {
    location: string;
    severity: number; // 0-100
    timeOfDay: string;
  }[];
}

// Generate mock areas for each building
export const mockBuildingAreas: Record<string, BuildingArea[]> = (() => {
  const result: Record<string, BuildingArea[]> = {};
  
  // Define area types by building type
  const areaTypesByBuilding: Record<string, string[]> = {
    hospital: ['Patient Rooms', 'Nurse Station', 'Operating Theater', 'Waiting Area', 'Cafeteria', 'Admin'],
    office: ['Open Workspace', 'Meeting Rooms', 'Quiet Zones', 'Break Room', 'Reception'],
    retail: ['Sales Floor', 'Checkout', 'Stockroom', 'Fitting Rooms', 'Food Court'],
    residence: ['Apartments', 'Common Areas', 'Dining Hall', 'Activity Room', 'Entrance'],
    education: ['Classrooms', 'Labs', 'Library', 'Cafeteria', 'Administration']
  };
  
  // Generate hourly data patterns
  const generateTrafficPattern = (peakHours: number[]) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return hours.map(hour => {
      // Higher values at peak hours
      const isPeak = peakHours.includes(hour);
      const value = isPeak 
        ? Math.floor(Math.random() * 30) + 70 // 70-100 at peak
        : Math.floor(Math.random() * 50); // 0-50 at off-peak
        
      return { 
        time: `${hour}:00`, 
        value 
      };
    });
  };
  
  // Generate areas for each building
  mockBuildingData.forEach(building => {
    const buildingAreas: BuildingArea[] = [];
    const areaTypes = areaTypesByBuilding[building.type];
    
    // Define peak hours based on building type
    const peakHours = building.type === 'hospital' 
      ? [9, 10, 11, 14, 15, 16] // Hospitals more constant
      : [9, 10, 11, 13, 14, 15, 16]; // Standard business hours
    
    // Create 3-5 areas per building
    const areaCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < areaCount; i++) {
      const areaType = areaTypes[i % areaTypes.length];
      const squareFootage = Math.floor(building.squareFootage / areaCount * (Math.random() * 0.4 + 0.8));
      
      // Generate 1-3 congestion points
      const congestionCount = Math.floor(Math.random() * 3) + 1;
      const congestionPoints = [];
      
      for (let j = 0; j < congestionCount; j++) {
        congestionPoints.push({
          location: `${areaType} - Position ${j+1}`,
          severity: Math.floor(Math.random() * 60) + 40,
          timeOfDay: `${peakHours[Math.floor(Math.random() * peakHours.length)]}:00`
        });
      }
      
      buildingAreas.push({
        id: `area-${building.id}-${i}`,
        buildingId: building.id,
        name: `${areaType} ${i+1}`,
        type: areaType,
        squareFootage,
        utilizationRate: Math.floor(Math.random() * 40) + 60,
        trafficVolume: generateTrafficPattern(peakHours),
        congestionPoints
      });
    }
    
    result[building.id] = buildingAreas;
  });
  
  return result;
})();

// Types of comparative metrics between buildings
export interface MetricComparison {
  name: string;
  description: string;
  buildings: {
    id: string;
    name: string;
    value: number;
    change: number; // Percentage change
  }[];
}

// Generate comparison metrics for buildings
export const mockComparisons: MetricComparison[] = [
  {
    name: 'Space Efficiency',
    description: 'Measures how effectively space is used based on traffic patterns and occupancy',
    buildings: mockBuildingData.slice(0, 6).map(b => ({
      id: b.id,
      name: b.name,
      value: b.metrics.efficiency,
      change: Math.floor(Math.random() * 20) - 5 // -5 to +15
    }))
  },
  {
    name: 'Circulation Effectiveness',
    description: 'Evaluates how well people can navigate through spaces',
    buildings: mockBuildingData.slice(0, 6).map(b => ({
      id: b.id,
      name: b.name,
      value: b.metrics.circulation,
      change: Math.floor(Math.random() * 25) - 10 // -10 to +15
    }))
  },
  {
    name: 'Dwell Time Optimization',
    description: 'Assesses if people spend appropriate amounts of time in each area',
    buildings: mockBuildingData.slice(0, 6).map(b => ({
      id: b.id,
      name: b.name,
      value: Math.floor(Math.random() * 30) + 70,
      change: Math.floor(Math.random() * 30) - 10 // -10 to +20
    }))
  },
  {
    name: 'Proximity Effectiveness',
    description: 'Measures how well related areas are positioned near each other',
    buildings: mockBuildingData.slice(0, 6).map(b => ({
      id: b.id,
      name: b.name,
      value: Math.floor(Math.random() * 25) + 75,
      change: Math.floor(Math.random() * 15) - 5 // -5 to +10
    }))
  }
]; 