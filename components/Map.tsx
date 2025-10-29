
import React from 'react';
import { Doctor } from '../types';
import { MapPinIcon } from './shared/IconComponents';

interface MapProps {
  doctors: Doctor[];
}

// Simple hash function to generate a pseudo-random but consistent position for a given ID
const positionFromId = (id: number) => {
  const x = (id * 17) % 90 + 5; // % range + offset
  const y = (id * 31) % 90 + 5;
  return { top: `${y}%`, left: `${x}%` };
};

const Map: React.FC<MapProps> = ({ doctors }) => {
  return (
    <div className="relative w-full h-full bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300">
      <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: "url('https://i.imgur.com/8O02c2G.png')" }}></div>
      <p className="absolute top-2 left-2 text-xs font-semibold bg-white/70 p-1 rounded">Map View (Placeholder)</p>
      {doctors.map(doctor => (
        <div
          key={doctor.id}
          className="absolute transform -translate-x-1/2 -translate-y-full"
          style={positionFromId(doctor.id)}
          title={`${doctor.name} - ${doctor.location}`}
        >
          <div className="relative flex flex-col items-center group cursor-pointer">
            <div className="text-red-500 hover:scale-125 transition-transform">
              <MapPinIcon />
            </div>
            <div className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 text-xs text-white bg-slate-800 rounded-md whitespace-nowrap">
              {doctor.name}
            </div>
          </div>
        </div>
      ))}
       {doctors.length === 0 && (
         <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 font-medium">No doctors to display on map.</p>
         </div>
       )}
    </div>
  );
};

export default Map;
