import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Room definition types
export interface Room {
  id: string;
  name: string;
  type: 'patient' | 'office' | 'common' | 'service' | 'hallway' | 'entrance';
  bounds: THREE.Box3; // 3D boundaries of the room
  entrances: THREE.Vector3[]; // Positions of room entrances
  connectsTo: string[]; // IDs of connected rooms
  cameraPosition: THREE.Vector3; // Camera position for room view
  cameraTarget: THREE.Vector3; // What the camera looks at
  occupancyData?: {
    avgVisits: number;
    avgDuration: number;
    peakTimes: string[];
  };
  furniture?: Furniture[];
}

// Furniture item type
interface Furniture {
  type: 'desk' | 'chair' | 'bed' | 'table' | 'counter' | 'cabinet';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color: string;
}

// Default room types with standard materials
const roomMaterials = {
  patient: new THREE.MeshStandardMaterial({ 
    color: '#e7f5ff', 
    roughness: 0.7, 
    metalness: 0.1 
  }),
  office: new THREE.MeshStandardMaterial({ 
    color: '#d1fae5', 
    roughness: 0.7, 
    metalness: 0.1 
  }),
  common: new THREE.MeshStandardMaterial({ 
    color: '#fef3c7', 
    roughness: 0.7, 
    metalness: 0.1 
  }),
  service: new THREE.MeshStandardMaterial({ 
    color: '#e0e7ff', 
    roughness: 0.7, 
    metalness: 0.1 
  }),
  hallway: new THREE.MeshStandardMaterial({ 
    color: '#f5f5f4', 
    roughness: 0.7, 
    metalness: 0.1 
  }),
  entrance: new THREE.MeshStandardMaterial({ 
    color: '#dbeafe', 
    roughness: 0.7, 
    metalness: 0.1 
  }),
  wall: new THREE.MeshStandardMaterial({ 
    color: '#f8fafc', 
    roughness: 0.9, 
    metalness: 0.1 
  }),
  floor: new THREE.MeshStandardMaterial({ 
    color: '#f8f9fa', 
    roughness: 0.8, 
    metalness: 0.1
  })
};

// Generate a simple floor texture
function generateFloorTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Fill background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, size, size);
    
    // Draw grid pattern
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    // Draw tiles
    const tileSize = 64;
    for (let x = 0; x < size; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    
    for (let y = 0; y < size; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  
  return texture;
}

// Furniture geometries cache
const furnitureGeometries = {
  desk: new THREE.BoxGeometry(2, 0.8, 1),
  chair: new THREE.BoxGeometry(0.6, 0.6, 0.6),
  bed: new THREE.BoxGeometry(2.2, 0.5, 1),
  table: new THREE.BoxGeometry(1.5, 0.8, 1.5),
  counter: new THREE.BoxGeometry(4, 1, 0.8),
  cabinet: new THREE.BoxGeometry(1, 1.8, 0.6)
};

// Hospital layout generation function
export function generateHospitalLayout(): Room[] {
  return [
    // Main entrance and reception
    {
      id: 'main-entrance',
      name: 'Main Entrance',
      type: 'entrance',
      bounds: new THREE.Box3(
        new THREE.Vector3(-5, 0, -5),
        new THREE.Vector3(5, 3, 5)
      ),
      entrances: [new THREE.Vector3(0, 0, 5)],
      connectsTo: ['main-hallway'],
      cameraPosition: new THREE.Vector3(0, 5, 10),
      cameraTarget: new THREE.Vector3(0, 1, 0),
      occupancyData: {
        avgVisits: 120,
        avgDuration: 5,
        peakTimes: ['8:00', '17:00']
      },
      furniture: [
        {
          type: 'desk',
          position: new THREE.Vector3(0, 0.4, -2),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(3, 1, 1),
          color: '#d4a76a'
        },
        {
          type: 'chair',
          position: new THREE.Vector3(0, 0.3, -3),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#555555'
        }
      ]
    },
    // Main hallway
    {
      id: 'main-hallway',
      name: 'Main Hallway',
      type: 'hallway',
      bounds: new THREE.Box3(
        new THREE.Vector3(-2, 0, -20),
        new THREE.Vector3(2, 3, -5)
      ),
      entrances: [
        new THREE.Vector3(0, 0, -5),
        new THREE.Vector3(0, 0, -20),
        new THREE.Vector3(2, 0, -10),
        new THREE.Vector3(-2, 0, -10)
      ],
      connectsTo: ['main-entrance', 'patient-room-101', 'nurses-station', 'cafe', 'patient-room-102'],
      cameraPosition: new THREE.Vector3(0, 5, -12),
      cameraTarget: new THREE.Vector3(0, 1, -10),
      occupancyData: {
        avgVisits: 350,
        avgDuration: 1,
        peakTimes: ['8:00', '12:00', '17:00']
      }
    },
    // Patient room 101
    {
      id: 'patient-room-101',
      name: 'Patient Room 101',
      type: 'patient',
      bounds: new THREE.Box3(
        new THREE.Vector3(2, 0, -12),
        new THREE.Vector3(8, 3, -7)
      ),
      entrances: [new THREE.Vector3(2, 0, -10)],
      connectsTo: ['main-hallway'],
      cameraPosition: new THREE.Vector3(5, 3, -9),
      cameraTarget: new THREE.Vector3(5, 1, -10),
      occupancyData: {
        avgVisits: 15,
        avgDuration: 30,
        peakTimes: ['9:00', '14:00', '19:00']
      },
      furniture: [
        {
          type: 'bed',
          position: new THREE.Vector3(5, 0.25, -10),
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#ffffff'
        },
        {
          type: 'cabinet',
          position: new THREE.Vector3(7, 0.9, -10),
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#d4d4d4'
        }
      ]
    },
    // Patient room 102
    {
      id: 'patient-room-102',
      name: 'Patient Room 102',
      type: 'patient',
      bounds: new THREE.Box3(
        new THREE.Vector3(-8, 0, -12),
        new THREE.Vector3(-2, 3, -7)
      ),
      entrances: [new THREE.Vector3(-2, 0, -10)],
      connectsTo: ['main-hallway'],
      cameraPosition: new THREE.Vector3(-5, 3, -9),
      cameraTarget: new THREE.Vector3(-5, 1, -10),
      occupancyData: {
        avgVisits: 18,
        avgDuration: 25,
        peakTimes: ['10:00', '15:00', '20:00']
      },
      furniture: [
        {
          type: 'bed',
          position: new THREE.Vector3(-5, 0.25, -10),
          rotation: new THREE.Euler(0, -Math.PI / 2, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#ffffff'
        },
        {
          type: 'cabinet',
          position: new THREE.Vector3(-7, 0.9, -10),
          rotation: new THREE.Euler(0, -Math.PI / 2, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#d4d4d4'
        }
      ]
    },
    // Nurses station
    {
      id: 'nurses-station',
      name: 'Nurses Station',
      type: 'service',
      bounds: new THREE.Box3(
        new THREE.Vector3(2, 0, -20),
        new THREE.Vector3(8, 3, -15)
      ),
      entrances: [new THREE.Vector3(2, 0, -18)],
      connectsTo: ['main-hallway'],
      cameraPosition: new THREE.Vector3(5, 3, -17),
      cameraTarget: new THREE.Vector3(5, 1, -18),
      occupancyData: {
        avgVisits: 75,
        avgDuration: 15,
        peakTimes: ['7:00', '15:00', '23:00']
      },
      furniture: [
        {
          type: 'counter',
          position: new THREE.Vector3(5, 0.5, -17),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#94a3b8'
        },
        {
          type: 'chair',
          position: new THREE.Vector3(4, 0.3, -16),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#555555'
        },
        {
          type: 'chair',
          position: new THREE.Vector3(6, 0.3, -16),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#555555'
        }
      ]
    },
    // Cafeteria
    {
      id: 'cafe',
      name: 'Cafeteria',
      type: 'common',
      bounds: new THREE.Box3(
        new THREE.Vector3(-8, 0, -20),
        new THREE.Vector3(-2, 3, -15)
      ),
      entrances: [new THREE.Vector3(-2, 0, -18)],
      connectsTo: ['main-hallway'],
      cameraPosition: new THREE.Vector3(-5, 3, -17),
      cameraTarget: new THREE.Vector3(-5, 1, -18),
      occupancyData: {
        avgVisits: 200,
        avgDuration: 20,
        peakTimes: ['8:30', '12:30', '18:00']
      },
      furniture: [
        {
          type: 'table',
          position: new THREE.Vector3(-5, 0.4, -18),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#d4a76a'
        },
        {
          type: 'chair',
          position: new THREE.Vector3(-4, 0.3, -18),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#555555'
        },
        {
          type: 'chair',
          position: new THREE.Vector3(-6, 0.3, -18),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          color: '#555555'
        }
      ]
    }
  ];
}

interface BuildingModelProps {
  onLoad: (rooms: Room[]) => void;
}

export default function BuildingModel({ onLoad }: BuildingModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rooms = useMemo(() => generateHospitalLayout(), []);
  
  // Create floor texture
  const floorTexture = useMemo(() => {
    return generateFloorTexture();
  }, []);
  
  // Notify parent component when model is ready
  useEffect(() => {
    if (groupRef.current) {
      onLoad(rooms);
    }
  }, [onLoad, rooms]);
  
  // Create the building model
  const buildingModel = useMemo(() => {
    const buildingGroup = new THREE.Group();
    
    // Create floor
    const floorSize = 30;
    const floorMaterial = roomMaterials.floor.clone();
    floorMaterial.map = floorTexture;
    
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      floorMaterial
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01; // Slightly below to avoid z-fighting
    floor.receiveShadow = true;
    buildingGroup.add(floor);
    
    // Create rooms
    rooms.forEach(room => {
      const { min, max } = room.bounds;
      const size = new THREE.Vector3().subVectors(max, min);
      const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
      
      // Room floor
      const roomFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(size.x, size.z),
        roomMaterials[room.type]
      );
      roomFloor.rotation.x = -Math.PI / 2;
      roomFloor.position.set(center.x, 0, center.z);
      roomFloor.receiveShadow = true;
      buildingGroup.add(roomFloor);
      
      // Room walls
      const wallHeight = size.y;
      const wallThickness = 0.2;
      
      // North wall
      if (!rooms.some(r => 
        r.bounds.min.z === room.bounds.max.z && 
        r.bounds.min.x < room.bounds.max.x && 
        r.bounds.max.x > room.bounds.min.x
      )) {
        const northWall = new THREE.Mesh(
          new THREE.BoxGeometry(size.x, wallHeight, wallThickness),
          roomMaterials.wall
        );
        northWall.position.set(center.x, wallHeight / 2, max.z);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        buildingGroup.add(northWall);
      }
      
      // South wall
      if (!rooms.some(r => 
        r.bounds.max.z === room.bounds.min.z && 
        r.bounds.min.x < room.bounds.max.x && 
        r.bounds.max.x > room.bounds.min.x
      )) {
        const southWall = new THREE.Mesh(
          new THREE.BoxGeometry(size.x, wallHeight, wallThickness),
          roomMaterials.wall
        );
        southWall.position.set(center.x, wallHeight / 2, min.z);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        buildingGroup.add(southWall);
      }
      
      // East wall
      if (!rooms.some(r => 
        r.bounds.min.x === room.bounds.max.x && 
        r.bounds.min.z < room.bounds.max.z && 
        r.bounds.max.z > room.bounds.min.z
      )) {
        const eastWall = new THREE.Mesh(
          new THREE.BoxGeometry(wallThickness, wallHeight, size.z),
          roomMaterials.wall
        );
        eastWall.position.set(max.x, wallHeight / 2, center.z);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        buildingGroup.add(eastWall);
      }
      
      // West wall
      if (!rooms.some(r => 
        r.bounds.max.x === room.bounds.min.x && 
        r.bounds.min.z < room.bounds.max.z && 
        r.bounds.max.z > room.bounds.min.z
      )) {
        const westWall = new THREE.Mesh(
          new THREE.BoxGeometry(wallThickness, wallHeight, size.z),
          roomMaterials.wall
        );
        westWall.position.set(min.x, wallHeight / 2, center.z);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        buildingGroup.add(westWall);
      }
      
      // Add doorways at entrances
      room.entrances.forEach(entrance => {
        if (!entrance) return; // Skip if entrance is undefined
        
        const doorWidth = 1.2;
        const doorHeight = 2.2;
        const doorMaterial = new THREE.MeshBasicMaterial({ 
          color: 'black', 
          transparent: true, 
          opacity: 0 
        });
        
        // Determine which wall the entrance is on
        if (Math.abs(entrance.x - min.x) < 0.1) {
          // West wall
          const doorway = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness + 0.1, doorHeight, doorWidth),
            doorMaterial
          );
          doorway.position.set(min.x, doorHeight / 2, entrance.z);
          buildingGroup.add(doorway);
        } else if (Math.abs(entrance.x - max.x) < 0.1) {
          // East wall
          const doorway = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness + 0.1, doorHeight, doorWidth),
            doorMaterial
          );
          doorway.position.set(max.x, doorHeight / 2, entrance.z);
          buildingGroup.add(doorway);
        } else if (Math.abs(entrance.z - min.z) < 0.1) {
          // South wall
          const doorway = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth, doorHeight, wallThickness + 0.1),
            doorMaterial
          );
          doorway.position.set(entrance.x, doorHeight / 2, min.z);
          buildingGroup.add(doorway);
        } else if (Math.abs(entrance.z - max.z) < 0.1) {
          // North wall
          const doorway = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth, doorHeight, wallThickness + 0.1),
            doorMaterial
          );
          doorway.position.set(entrance.x, doorHeight / 2, max.z);
          buildingGroup.add(doorway);
        }
      });
      
      // Add furniture
      if (room.furniture) {
        room.furniture.forEach(item => {
          const geometry = furnitureGeometries[item.type];
          const material = new THREE.MeshStandardMaterial({
            color: item.color,
            roughness: 0.7,
            metalness: 0.1
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.copy(item.position);
          mesh.rotation.copy(item.rotation);
          mesh.scale.copy(item.scale);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          buildingGroup.add(mesh);
        });
      }
    });
    
    return buildingGroup;
  }, [rooms]);
  
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={buildingModel} />
    </group>
  );
} 