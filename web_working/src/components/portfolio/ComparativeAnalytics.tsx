import React, { useMemo, useState } from 'react';
import { mockBuildingData, mockBuildingAreas } from './mockData';

interface ComparativeAnalyticsProps {
  selectedBuildings: string[];
  timeFilter: string;
}

export const ComparativeAnalytics: React.FC<ComparativeAnalyticsProps> = ({
  selectedBuildings,
  timeFilter
}) => {
  const [comparisonType, setComparisonType] = useState<
    'traffic' | 'dwell' | 'congestion' | 'area'
  >('traffic');
  
  const [selectedArea, setSelectedArea] = useState('all');
  
  // Get buildings to compare - either selected or top performers
  const buildingsToCompare = useMemo(() => {
    if (selectedBuildings.length > 0) {
      return mockBuildingData.filter(b => selectedBuildings.includes(b.id));
    }
    
    // If no buildings selected, use top 2 performers
    return mockBuildingData
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 2);
  }, [selectedBuildings]);
  
  // Get areas for each building
  const buildingAreas = useMemo(() => {
    return buildingsToCompare.map(building => ({
      building,
      areas: mockBuildingAreas[building.id] || []
    }));
  }, [buildingsToCompare]);
  
  // Get areas common to all buildings being compared
  const commonAreaTypes = useMemo(() => {
    if (buildingAreas.length === 0) return [];
    
    // Get all area types from the first building
    const types = [...new Set(buildingAreas[0].areas.map(a => a.type))];
    
    // Filter to only include types that exist in all buildings
    return types.filter(type => 
      buildingAreas.every(ba => 
        ba.areas.some(a => a.type === type)
      )
    );
  }, [buildingAreas]);
  
  // Generate hourly traffic data for comparison
  const trafficData = useMemo(() => {
    const hourlyData: {hour: number; values: {buildingId: string; value: number}[]}[] = [];
    
    // Initialize hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.push({
        hour,
        values: []
      });
    }
    
    // Add data for each building
    buildingsToCompare.forEach(building => {
      const areas = mockBuildingAreas[building.id] || [];
      
      // Filter areas by selected type if needed
      const relevantAreas = selectedArea === 'all' 
        ? areas 
        : areas.filter(a => a.type === selectedArea);
      
      if (relevantAreas.length === 0) return;
      
      // Calculate average traffic by hour across relevant areas
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = `${hour}:00`;
        
        // Calculate average traffic for this hour across all relevant areas
        const totalTraffic = relevantAreas.reduce((sum, area) => {
          const hourData = area.trafficVolume.find(tv => tv.time === hourKey);
          return sum + (hourData ? hourData.value : 0);
        }, 0);
        
        const avgTraffic = Math.round(totalTraffic / relevantAreas.length);
        
        // Add to hourly data
        hourlyData[hour].values.push({
          buildingId: building.id,
          value: avgTraffic
        });
      }
    });
    
    return hourlyData;
  }, [buildingsToCompare, selectedArea]);
  
  // Generate utilization data
  const utilizationData = useMemo(() => {
    if (selectedArea === 'all') {
      // Compare overall building utilization
      return buildingsToCompare.map(building => {
        const areas = mockBuildingAreas[building.id] || [];
        
        // Calculate weighted average utilization across all areas
        const totalSqFt = areas.reduce((sum, area) => sum + area.squareFootage, 0);
        const weightedUtilization = areas.reduce(
          (sum, area) => sum + (area.utilizationRate * area.squareFootage), 0
        );
        
        return {
          buildingId: building.id,
          buildingName: building.name,
          value: Math.round(totalSqFt > 0 ? weightedUtilization / totalSqFt : 0)
        };
      });
    } else {
      // Compare specific area type utilization
      return buildingsToCompare.map(building => {
        const areas = mockBuildingAreas[building.id] || [];
        const relevantAreas = areas.filter(a => a.type === selectedArea);
        
        if (relevantAreas.length === 0) {
          return {
            buildingId: building.id,
            buildingName: building.name,
            value: 0
          };
        }
        
        // Average utilization across matching areas
        const avgUtilization = relevantAreas.reduce(
          (sum, area) => sum + area.utilizationRate, 0
        ) / relevantAreas.length;
        
        return {
          buildingId: building.id,
          buildingName: building.name,
          value: Math.round(avgUtilization)
        };
      });
    }
  }, [buildingsToCompare, selectedArea]);
  
  // Generate congestion data
  const congestionData = useMemo(() => {
    return buildingsToCompare.map(building => {
      const areas = mockBuildingAreas[building.id] || [];
      
      // Filter areas by selected type if needed
      const relevantAreas = selectedArea === 'all' 
        ? areas 
        : areas.filter(a => a.type === selectedArea);
        
      if (relevantAreas.length === 0) {
        return {
          buildingId: building.id,
          buildingName: building.name,
          congestionPoints: []
        };
      }
      
      // Get all congestion points from relevant areas
      const allPoints = relevantAreas.flatMap(area => 
        area.congestionPoints.map(cp => ({
          ...cp,
          areaName: area.name
        }))
      );
      
      // Sort by severity
      const sortedPoints = allPoints.sort((a, b) => b.severity - a.severity);
      
      return {
        buildingId: building.id,
        buildingName: building.name,
        congestionPoints: sortedPoints.slice(0, 5) // Top 5 congestion points
      };
    });
  }, [buildingsToCompare, selectedArea]);
  
  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header and controls */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Comparative Analytics</h2>
          <p className="text-gray-400 text-sm">
            {buildingsToCompare.length > 0 
              ? `Comparing ${buildingsToCompare.length} buildings` 
              : 'Select buildings to compare'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Comparison type selector */}
          <div className="bg-gray-800 rounded-lg flex">
            <button 
              className={`px-3 py-1 text-sm rounded-l-lg ${comparisonType === 'traffic' ? 'bg-blue-600' : ''}`}
              onClick={() => setComparisonType('traffic')}
            >
              Traffic
            </button>
            <button 
              className={`px-3 py-1 text-sm ${comparisonType === 'dwell' ? 'bg-blue-600' : ''}`}
              onClick={() => setComparisonType('dwell')}
            >
              Utilization
            </button>
            <button 
              className={`px-3 py-1 text-sm ${comparisonType === 'congestion' ? 'bg-blue-600' : ''}`}
              onClick={() => setComparisonType('congestion')}
            >
              Congestion
            </button>
            <button 
              className={`px-3 py-1 text-sm rounded-r-lg ${comparisonType === 'area' ? 'bg-blue-600' : ''}`}
              onClick={() => setComparisonType('area')}
            >
              Area Type
            </button>
          </div>
          
          {/* Area selector */}
          <div className="flex items-center">
            <label className="text-sm text-gray-400 mr-2">Area:</label>
            <select 
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="all">All Areas</option>
              {commonAreaTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* No buildings selected message */}
      {buildingsToCompare.length === 0 && (
        <div className="flex-1 flex items-center justify-center bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="text-gray-400 mb-2">Select buildings to compare</div>
            <p className="text-sm text-gray-500">
              Use the Building Network view to select buildings for comparison
            </p>
          </div>
        </div>
      )}
      
      {/* Traffic comparison view */}
      {buildingsToCompare.length > 0 && comparisonType === 'traffic' && (
        <div className="flex-1 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">
            {selectedArea === 'all' ? 'Overall Traffic Patterns' : `${selectedArea} Traffic Patterns`}
          </h3>
          
          {/* Traffic chart */}
          <div className="h-64 mb-4 flex items-end relative">
            {/* Y-axis labels */}
            <div className="absolute inset-y-0 left-0 w-10 flex flex-col justify-between text-xs text-gray-400 pb-6">
              <div>100%</div>
              <div>75%</div>
              <div>50%</div>
              <div>25%</div>
              <div>0%</div>
            </div>
            
            {/* Grid lines */}
            <div className="absolute inset-0 ml-10 flex flex-col justify-between pb-6">
              <div className="border-t border-gray-700 w-full"></div>
              <div className="border-t border-gray-700 w-full"></div>
              <div className="border-t border-gray-700 w-full"></div>
              <div className="border-t border-gray-700 w-full"></div>
              <div className="border-t border-gray-700 w-full"></div>
            </div>
            
            {/* Chart bars */}
            <div className="ml-10 flex-1 flex items-end">
              {trafficData.map(hourData => (
                <div key={hourData.hour} className="flex-1 flex flex-col items-center">
                  {hourData.values.map((value, index) => {
                    const building = buildingsToCompare.find(b => b.id === value.buildingId);
                    if (!building) return null;
                    
                    // Get color based on building type
                    const color = 
                      building.type === 'hospital' ? 'bg-blue-600' : 
                      building.type === 'office' ? 'bg-green-600' : 
                      building.type === 'retail' ? 'bg-amber-600' : 
                      building.type === 'residence' ? 'bg-purple-600' : 
                      'bg-pink-600';
                      
                    return (
                      <div 
                        key={`${hourData.hour}-${index}`}
                        className={`w-3 ${color} mx-0.5`}
                        style={{ 
                          height: `${value.value}%`,
                          opacity: 0.8
                        }}
                        title={`${building.name}: ${value.value}%`}
                      ></div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* X-axis labels */}
          <div className="ml-10 flex text-xs text-gray-400">
            {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => (
              <div key={hour} className="flex-1 text-center">{hour}:00</div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex justify-center space-x-4">
            {buildingsToCompare.map(building => (
              <div key={building.id} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-1"
                  style={{ 
                    backgroundColor: 
                      building.type === 'hospital' ? '#3b82f6' : 
                      building.type === 'office' ? '#10b981' : 
                      building.type === 'retail' ? '#f59e0b' : 
                      building.type === 'residence' ? '#8b5cf6' : 
                      '#ec4899'
                  }}
                ></div>
                <span className="text-sm">{building.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Utilization comparison view */}
      {buildingsToCompare.length > 0 && comparisonType === 'dwell' && (
        <div className="flex-1 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">
            {selectedArea === 'all' ? 'Overall Space Utilization' : `${selectedArea} Utilization`}
          </h3>
          
          <div className="flex flex-col space-y-6">
            {utilizationData.map(data => {
              const building = buildingsToCompare.find(b => b.id === data.buildingId);
              if (!building) return null;
              
              return (
                <div key={building.id} className="bg-gray-750 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div 
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ 
                        backgroundColor: 
                          building.type === 'hospital' ? '#3b82f6' : 
                          building.type === 'office' ? '#10b981' : 
                          building.type === 'retail' ? '#f59e0b' : 
                          building.type === 'residence' ? '#8b5cf6' : 
                          '#ec4899'
                      }}
                    ></div>
                    <h4 className="font-bold">{building.name}</h4>
                    <div className="text-sm text-gray-400 ml-2">
                      {building.location} • {(building.squareFootage / 1000).toFixed(1)}k sqft
                    </div>
                  </div>
                  
                  <div className="flex items-center mt-2">
                    <div className="w-24 text-right mr-4">
                      <div className="text-2xl font-bold">{data.value}%</div>
                      <div className="text-xs text-gray-400">Utilization</div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="w-full bg-gray-700 rounded-full h-4">
                        <div 
                          className="bg-blue-600 h-4 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${data.value}%` }}
                        >
                          {data.value >= 25 && (
                            <span className="text-xs text-white font-medium">{data.value}%</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-1 flex justify-between text-xs text-gray-500">
                        <span>Underutilized</span>
                        <span>Optimal</span>
                        <span>Overcrowded</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Congestion comparison view */}
      {buildingsToCompare.length > 0 && comparisonType === 'congestion' && (
        <div className="flex-1 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">
            {selectedArea === 'all' ? 'Top Congestion Points' : `${selectedArea} Congestion`}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {congestionData.map(data => {
              const building = buildingsToCompare.find(b => b.id === data.buildingId);
              if (!building) return null;
              
              return (
                <div key={building.id} className="bg-gray-750 rounded-lg p-3">
                  <div className="flex items-center mb-3">
                    <div 
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ 
                        backgroundColor: 
                          building.type === 'hospital' ? '#3b82f6' : 
                          building.type === 'office' ? '#10b981' : 
                          building.type === 'retail' ? '#f59e0b' : 
                          building.type === 'residence' ? '#8b5cf6' : 
                          '#ec4899'
                      }}
                    ></div>
                    <h4 className="font-bold">{building.name}</h4>
                  </div>
                  
                  {data.congestionPoints.length === 0 ? (
                    <p className="text-sm text-gray-400">No congestion data available</p>
                  ) : (
                    <div className="space-y-2">
                      {data.congestionPoints.map((point, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-24 text-xs truncate">{point.areaName}</div>
                          <div className="flex-1 mx-2">
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-red-600 h-2 rounded-full"
                                style={{ width: `${point.severity}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="w-10 text-xs text-right">{point.severity}%</div>
                          <div className="w-14 text-xs text-right text-gray-400">{point.timeOfDay}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Area type comparison */}
      {buildingsToCompare.length > 0 && comparisonType === 'area' && (
        <div className="flex-1 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">Area Allocation Comparison</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {buildingsToCompare.map(building => {
              const areas = mockBuildingAreas[building.id] || [];
              
              // Calculate percentage for each area type
              const totalSqFt = areas.reduce((sum, area) => sum + area.squareFootage, 0);
              const areaByType = areas.reduce((acc, area) => {
                if (!acc[area.type]) {
                  acc[area.type] = {
                    sqft: 0,
                    percentage: 0,
                    count: 0
                  };
                }
                
                acc[area.type].sqft += area.squareFootage;
                acc[area.type].count += 1;
                acc[area.type].percentage = (acc[area.type].sqft / totalSqFt) * 100;
                
                return acc;
              }, {} as Record<string, {sqft: number; percentage: number; count: number}>);
              
              // Convert to array and sort by size
              const areaTypes = Object.entries(areaByType)
                .map(([type, data]) => ({
                  type,
                  ...data,
                  percentage: Math.round(data.percentage)
                }))
                .sort((a, b) => b.percentage - a.percentage);
              
              return (
                <div key={building.id} className="bg-gray-750 rounded-lg p-3">
                  <div className="flex items-center mb-3">
                    <div 
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ 
                        backgroundColor: 
                          building.type === 'hospital' ? '#3b82f6' : 
                          building.type === 'office' ? '#10b981' : 
                          building.type === 'retail' ? '#f59e0b' : 
                          building.type === 'residence' ? '#8b5cf6' : 
                          '#ec4899'
                      }}
                    ></div>
                    <h4 className="font-bold">{building.name}</h4>
                    <div className="text-sm text-gray-400 ml-2">
                      {(totalSqFt / 1000).toFixed(1)}k sqft
                    </div>
                  </div>
                  
                  {/* Area breakdown chart */}
                  <div className="w-full h-6 flex rounded-full overflow-hidden mb-2">
                    {areaTypes.map((area, i) => {
                      // Color based on index
                      const colors = [
                        'bg-blue-500', 'bg-green-500', 'bg-amber-500', 
                        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
                      ];
                      
                      return (
                        <div
                          key={area.type}
                          className={`${colors[i % colors.length]} h-full`}
                          style={{ width: `${area.percentage}%` }}
                          title={`${area.type}: ${area.percentage}%`}
                        ></div>
                      );
                    })}
                  </div>
                  
                  {/* Area breakdown list */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3">
                    {areaTypes.map((area, i) => {
                      // Color based on index
                      const colors = [
                        'bg-blue-500', 'bg-green-500', 'bg-amber-500', 
                        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
                      ];
                      
                      return (
                        <div key={area.type} className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-1 ${colors[i % colors.length]}`}></div>
                          <div className="text-xs flex-1 truncate">{area.type}</div>
                          <div className="text-xs text-gray-400">{area.percentage}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}; 