import React, { useMemo } from 'react';
import { mockBuildingData, mockComparisons } from './mockData';

interface PerformanceMetricsProps {
  buildingType: string;
  timeFilter: string;
  selectedBuildings: string[];
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  buildingType,
  timeFilter,
  selectedBuildings
}) => {
  // Filter buildings based on type and selection
  const buildings = useMemo(() => {
    let filtered = mockBuildingData;
    
    if (buildingType !== 'all') {
      filtered = filtered.filter(b => b.type === buildingType);
    }
    
    if (selectedBuildings.length > 0) {
      filtered = filtered.filter(b => selectedBuildings.includes(b.id));
    }
    
    return filtered.sort((a, b) => b.performance - a.performance);
  }, [buildingType, selectedBuildings]);
  
  // Calculate average metrics across selected buildings
  const averageMetrics = useMemo(() => {
    if (buildings.length === 0) return null;
    
    return {
      efficiency: Math.round(buildings.reduce((sum, b) => sum + b.metrics.efficiency, 0) / buildings.length),
      circulation: Math.round(buildings.reduce((sum, b) => sum + b.metrics.circulation, 0) / buildings.length),
      occupancy: Math.round(buildings.reduce((sum, b) => sum + b.metrics.occupancy, 0) / buildings.length),
      energyUsage: Math.round(buildings.reduce((sum, b) => sum + b.metrics.energyUsage, 0) / buildings.length),
      averageDwellTime: Math.round(buildings.reduce((sum, b) => sum + b.metrics.averageDwellTime, 0) / buildings.length)
    };
  }, [buildings]);
  
  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header and building count */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">Performance Metrics</h2>
        <p className="text-gray-400 text-sm">
          {buildings.length} {buildingType === 'all' ? 'buildings' : buildingType + 's'} • 
          Data from {timeFilter === 'day' ? 'last 24 hours' : 
                     timeFilter === 'week' ? 'past week' : 
                     timeFilter === 'month' ? 'past month' : 'past year'}
        </p>
      </div>
      
      {/* Average metrics summary */}
      {averageMetrics && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Space Efficiency</div>
            <div className="text-2xl font-bold">{averageMetrics.efficiency}%</div>
            <div className="text-xs text-green-400">+3% from baseline</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Circulation</div>
            <div className="text-2xl font-bold">{averageMetrics.circulation}%</div>
            <div className="text-xs text-green-400">+5% from baseline</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Occupancy</div>
            <div className="text-2xl font-bold">{averageMetrics.occupancy}%</div>
            <div className="text-xs text-green-400">+2% from baseline</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Energy Usage</div>
            <div className="text-2xl font-bold">{averageMetrics.energyUsage}</div>
            <div className="text-sm">kWh/sqft</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Avg. Dwell Time</div>
            <div className="text-2xl font-bold">{averageMetrics.averageDwellTime}</div>
            <div className="text-sm">minutes</div>
          </div>
        </div>
      )}
      
      {/* Building performance listing */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-bold mb-3">Building Performance</h3>
        <div className="overflow-hidden rounded-lg">
          <table className="min-w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-300">Building</th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-300">Location</th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-300">Size</th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-300">Score</th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-300">Efficiency</th>
                <th className="py-2 px-3 text-center text-xs font-medium text-gray-300">Circulation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {buildings.map((building, i) => (
                <tr 
                  key={building.id} 
                  className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}
                >
                  <td className="py-2 px-3 text-sm font-medium">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ 
                          backgroundColor: 
                            building.type === 'hospital' ? '#3b82f6' : 
                            building.type === 'office' ? '#10b981' : 
                            building.type === 'retail' ? '#f59e0b' : 
                            building.type === 'residence' ? '#8b5cf6' : 
                            '#ec4899'
                        }}
                      ></div>
                      {building.name}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-sm text-center">{building.location}</td>
                  <td className="py-2 px-3 text-sm text-center">{(building.squareFootage / 1000).toFixed(1)}k sqft</td>
                  <td className="py-2 px-3 text-sm text-center">
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                      {building.performance}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-sm text-center">
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${building.metrics.efficiency}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-sm text-center">
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${building.metrics.circulation}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Comparison metrics */}
      <div className="bg-gray-800 rounded-lg p-4 flex-1">
        <h3 className="text-lg font-bold mb-3">Key Metrics Comparison</h3>
        <div className="grid grid-cols-2 gap-4">
          {mockComparisons.map((comparison) => (
            <div key={comparison.name} className="bg-gray-750 rounded-lg p-3">
              <div className="mb-2">
                <h4 className="font-bold">{comparison.name}</h4>
                <p className="text-xs text-gray-400">{comparison.description}</p>
              </div>
              
              <div className="space-y-2">
                {comparison.buildings.filter(b => selectedBuildings.length === 0 || selectedBuildings.includes(b.id)).slice(0, 4).map((building) => (
                  <div key={building.id} className="flex items-center">
                    <div className="w-20 text-xs truncate">{building.name}</div>
                    <div className="flex-1 mx-2">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${building.change >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                          style={{ width: `${building.value}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-10 text-xs text-right">{building.value}%</div>
                    <div className={`w-12 text-xs text-right ${building.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {building.change > 0 ? '+' : ''}{building.change}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 