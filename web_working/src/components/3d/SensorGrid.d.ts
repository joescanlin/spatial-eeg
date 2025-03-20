declare module './SensorGrid' {
  interface SensorGridProps {
    data: number[][];
  }
  
  const SensorGrid: React.FC<SensorGridProps>;
  
  export default SensorGrid;
} 