import React, { useMemo, useState } from 'react';
import { mockBuildingData } from './mockData';

interface DesignPatternsProps {
  buildingType: string;
}

// Collect all design patterns across buildings
export const DesignPatterns: React.FC<DesignPatternsProps> = ({
  buildingType
}) => {
  const [sortBy, setSortBy] = useState<'effectiveness' | 'popularity'>('effectiveness');
  const [patternFilter, setPatternFilter] = useState<string>('all');
  
  // Get filtered buildings and gather all unique design patterns with their buildings
  const { allPatterns, patternNames } = useMemo(() => {
    // Filter buildings by type if needed
    const filteredBuildings = buildingType === 'all' 
      ? mockBuildingData 
      : mockBuildingData.filter(b => b.type === buildingType);
    
    // Collect all patterns and the buildings that use them
    const patternMap = new Map<string, {
      id: string;
      name: string;
      description: string;
      effectiveness: number;
      buildingIds: string[];
      buildingNames: string[];
      buildingTypes: string[];
      count: number;
    }>();
    
    filteredBuildings.forEach(building => {
      building.designPatterns.forEach(pattern => {
        if (!patternMap.has(pattern.name)) {
          patternMap.set(pattern.name, {
            id: pattern.id,
            name: pattern.name,
            description: pattern.description,
            effectiveness: pattern.effectiveness,
            buildingIds: [building.id],
            buildingNames: [building.name],
            buildingTypes: [building.type],
            count: 1
          });
        } else {
          const existing = patternMap.get(pattern.name)!;
          existing.effectiveness = (existing.effectiveness * existing.count + pattern.effectiveness) / (existing.count + 1);
          existing.buildingIds.push(building.id);
          existing.buildingNames.push(building.name);
          existing.buildingTypes.push(building.type);
          existing.count += 1;
        }
      });
    });
    
    // Convert map to array and sort
    const allPatterns = Array.from(patternMap.values());
    
    // Get unique pattern names for filter
    const patternNames = Array.from(new Set(allPatterns.map(p => p.name)));
    
    return { allPatterns, patternNames };
  }, [buildingType]);
  
  // Apply additional filtering and sorting
  const patternsToDisplay = useMemo(() => {
    let filtered = allPatterns;
    
    // Apply pattern name filter if not 'all'
    if (patternFilter !== 'all') {
      filtered = filtered.filter(p => p.name === patternFilter);
    }
    
    // Sort by selected criteria
    if (sortBy === 'effectiveness') {
      return filtered.sort((a, b) => b.effectiveness - a.effectiveness);
    } else {
      return filtered.sort((a, b) => b.count - a.count);
    }
  }, [allPatterns, patternFilter, sortBy]);
  
  // For the radar chart - metrics for each pattern
  const getPatternMetrics = (patternName: string) => {
    // Mock metrics for now
    return [
      { name: 'Efficiency', value: Math.floor(Math.random() * 30) + 70 },
      { name: 'User Satisfaction', value: Math.floor(Math.random() * 30) + 70 },
      { name: 'Flexibility', value: Math.floor(Math.random() * 30) + 70 },
      { name: 'Implementation Cost', value: Math.floor(Math.random() * 70) + 30 },
      { name: 'Maintenance', value: Math.floor(Math.random() * 30) + 70 }
    ];
  };
  
  // Simulated comparison data for before/after implementation
  const getBeforeAfterData = (patternName: string) => {
    // Random improvement percentages
    return {
      efficiency: Math.floor(Math.random() * 20) + 10,
      traffic: Math.floor(Math.random() * 25) + 5,
      congestion: -(Math.floor(Math.random() * 30) + 20), // Negative is good for congestion
      satisfaction: Math.floor(Math.random() * 15) + 10
    };
  };
  
  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header and controls */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold mb-1">Design Pattern Library</h2>
          <p className="text-gray-400 text-sm">
            {patternsToDisplay.length} design patterns identified across {
              buildingType === 'all' ? 'all building types' : buildingType + 's'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Sort control */}
          <div className="flex items-center">
            <label className="text-sm text-gray-400 mr-2">Sort by:</label>
            <select 
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'effectiveness' | 'popularity')}
            >
              <option value="effectiveness">Effectiveness</option>
              <option value="popularity">Popularity</option>
            </select>
          </div>
          
          {/* Pattern filter */}
          <div className="flex items-center">
            <label className="text-sm text-gray-400 mr-2">Pattern:</label>
            <select 
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              value={patternFilter}
              onChange={(e) => setPatternFilter(e.target.value)}
            >
              <option value="all">All Patterns</option>
              {patternNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Pattern cards */}
      <div className="grid grid-cols-2 gap-4 overflow-y-auto">
        {patternsToDisplay.map(pattern => {
          const metrics = getPatternMetrics(pattern.name);
          const beforeAfter = getBeforeAfterData(pattern.name);
          
          return (
            <div key={pattern.name} className="bg-gray-800 rounded-lg p-4">
              {/* Pattern header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold">{pattern.name}</h3>
                  <p className="text-sm text-gray-400">Used in {pattern.count} buildings</p>
                </div>
                <div className="flex items-center bg-blue-900 px-2 py-1 rounded-lg">
                  <span className="text-sm font-medium mr-1">Effectiveness</span>
                  <span className="text-xl font-bold">{Math.round(pattern.effectiveness)}%</span>
                </div>
              </div>
              
              {/* Pattern description */}
              <p className="text-sm mb-4">{pattern.description}</p>
              
              {/* Pattern metrics */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Performance Metrics</h4>
                <div className="space-y-2">
                  {metrics.map(metric => (
                    <div key={metric.name} className="flex items-center">
                      <div className="w-36 text-xs">{metric.name}</div>
                      <div className="flex-1 mx-2">
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${metric.value}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-10 text-xs text-right">{metric.value}%</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Before/After comparison */}
              <div className="bg-gray-750 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-semibold mb-2">Impact Assessment</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs text-gray-300">Efficiency</span>
                    <span className="ml-auto text-xs text-green-400">+{beforeAfter.efficiency}%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-xs text-gray-300">Traffic Flow</span>
                    <span className="ml-auto text-xs text-green-400">+{beforeAfter.traffic}%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span className="text-xs text-gray-300">Congestion</span>
                    <span className="ml-auto text-xs text-green-400">{beforeAfter.congestion}%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span className="text-xs text-gray-300">Satisfaction</span>
                    <span className="ml-auto text-xs text-green-400">+{beforeAfter.satisfaction}%</span>
                  </div>
                </div>
              </div>
              
              {/* Buildings using this pattern */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Buildings Using This Pattern</h4>
                <div className="flex flex-wrap gap-1">
                  {pattern.buildingNames.map((name, i) => {
                    const type = pattern.buildingTypes[i];
                    const color = 
                      type === 'hospital' ? 'bg-blue-900 text-blue-200' : 
                      type === 'office' ? 'bg-green-900 text-green-200' : 
                      type === 'retail' ? 'bg-amber-900 text-amber-200' : 
                      type === 'residence' ? 'bg-purple-900 text-purple-200' : 
                      'bg-pink-900 text-pink-200';
                      
                    return (
                      <span 
                        key={i}
                        className={`text-xs rounded-full px-2 py-0.5 ${color}`}
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 