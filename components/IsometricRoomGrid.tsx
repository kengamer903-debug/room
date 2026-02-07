import React, { useState, Suspense, useRef } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Map, Info, Box, Layers, MousePointer2, ScanLine, Rotate3d } from 'lucide-react';

// Augment JSX namespace to fix R3F element errors
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      planeGeometry: any;
      gridHelper: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
    }
  }
}

// --- 3D Scene Component ---
const MapModel = ({ imageUrl, showBuilding }: { imageUrl: string, showBuilding: boolean }) => {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const buildingRef = useRef<THREE.Group>(null);

  return (
    <group rotation={[-Math.PI / 12, 0, 0]}>
      {/* The Map Slab (Base Model) */}
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[10, 0.2, 7.5]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* The Map Surface */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 7.5]} />
        <meshStandardMaterial map={texture} transparent opacity={1} />
      </mesh>

      {/* Extruded 3D Building for Civil 1 */}
      {showBuilding && (
        <group position={[-1.3, 0.4, 1.15]}> {/* Position calibrated for Civil 1 location */}
          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh castShadow>
              <boxGeometry args={[0.9, 0.8, 0.8]} />
              <meshStandardMaterial color="#6366f1" emissive="#4338ca" emissiveIntensity={0.5} />
            </mesh>
            {/* Building Label in 3D Space */}
            <Html position={[0, 0.7, 0]} center>
              <div className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap border border-indigo-400 font-bold pointer-events-none">
                โยธา 1
              </div>
            </Html>
          </Float>
        </group>
      )}

      {/* Decorative Grid Floor */}
      <gridHelper args={[20, 20, 0x444444, 0x222222]} position={[0, -0.2, 0]} />
    </group>
  );
};

// --- Main Component ---
type ViewMode = '2d' | '3d_model';

export const IsometricRoomGrid: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('3d_model'); // Start with 3D model to show off

  const FILE_ID = "1t9BQTIDaBGGFQNzYaIh8b5k3-_Ne9Mwf";
  const MAP_IMAGE_URL = `https://drive.google.com/thumbnail?id=${FILE_ID}&sz=w3000`;

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a] relative overflow-hidden select-none font-sans">
      
      {/* Header Info Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-700/50 shadow-2xl min-w-[240px] pointer-events-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                <Rotate3d className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">
                Interactive 3D Master Plan
            </h3>
          </div>
          <div className="flex items-center gap-2 pl-9">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
             <p className="text-[10px] text-slate-400 font-medium tracking-wider">
                RMUTL CAMPUS DIGITAL TWIN
             </p>
          </div>
      </div>

      {/* Toggle Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
         <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/50 flex flex-col gap-1">
            <button 
              onClick={() => setMode('2d')}
              className={`p-2 rounded-md transition-all ${mode === '2d' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="2D Top View"
            >
              <Map className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMode('3d_model')}
              className={`p-2 rounded-md transition-all ${mode === '3d_model' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="3D Model View"
            >
              <Box className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Main Rendering Area */}
      <div className="flex-1 w-full h-full relative">
        {mode === '2d' ? (
          <div className="w-full h-full flex items-center justify-center p-8 bg-[#18181b]">
             <img 
                src={MAP_IMAGE_URL} 
                alt="2D View" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
             />
          </div>
        ) : (
          <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas shadows dpr={[1, 2]}>
              <PerspectiveCamera makeDefault position={[8, 8, 12]} fov={40} />
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
              <spotLight position={[-10, 15, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
              <Environment preset="city" />
              
              <Suspense fallback={null}>
                <MapModel imageUrl={MAP_IMAGE_URL} showBuilding={true} />
                <ContactShadows position={[0, -0.21, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
              </Suspense>

              <OrbitControls 
                enableDamping 
                dampingFactor={0.05}
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2.1} 
                makeDefault
              />
            </Canvas>

            {/* Hint Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce flex items-center gap-2 text-[10px] text-indigo-300 bg-indigo-950/40 px-3 py-1.5 rounded-full backdrop-blur border border-indigo-500/30">
                <MousePointer2 className="w-3 h-3" />
                คลิกเมาส์ค้างเพื่อหมุนโมเดล 3 มิติ
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur rounded-full border border-white/5 text-white/40 text-[10px] pointer-events-none">
        <Info className="w-3 h-3" />
        <span>Mode: {mode === '2d' ? 'Static 2D' : 'Interactive 3D Real-time Model'}</span>
      </div>
    </div>
  );
};