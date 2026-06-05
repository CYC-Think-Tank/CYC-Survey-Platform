'use client';

import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { useEffect } from 'react';

export interface FsaMapDot {
  fsa: string;
  province: string;
  lat: number;
  lng: number;
  count: number;
  percentage: number;
}

interface FsaDotMapProps {
  dots: FsaMapDot[];
}

function radiusForCount(count: number, maxCount: number) {
  if (maxCount <= 0) return 8;
  return 8 + (count / maxCount) * 18;
}

function FitFsaBounds({ dots }: FsaDotMapProps) {
  const map = useMap();

  useEffect(() => {
    if (dots.length === 0) {
      map.setView([57, -96], 3);
      return;
    }

    if (dots.length === 1) {
      map.setView([dots[0].lat, dots[0].lng], 10);
      return;
    }

    const bounds: LatLngBoundsExpression = dots.map((dot) => [dot.lat, dot.lng]);
    map.fitBounds(bounds, { maxZoom: 11, padding: [40, 40] });
  }, [dots, map]);

  return null;
}

export default function FsaDotMap({ dots }: FsaDotMapProps) {
  const maxCount = Math.max(1, ...dots.map((dot) => dot.count));

  return (
    <MapContainer
      center={[57, -96]}
      className="h-full min-h-[280px] w-full"
      scrollWheelZoom={false}
      zoom={3}
      zoomControl={true}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitFsaBounds dots={dots} />
      {dots.map((dot) => (
        <CircleMarker
          center={[dot.lat, dot.lng]}
          color="#04377e"
          fillColor="#0cb7c4"
          fillOpacity={0.58}
          key={dot.fsa}
          radius={radiusForCount(dot.count, maxCount)}
          weight={2}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
            {dot.fsa}: {dot.count} responses
          </Tooltip>
          <Popup>
            <div className="text-sm">
              <div className="font-bold text-[var(--color-cyc-secondary)]">{dot.fsa}</div>
              <div>{dot.province}</div>
              <div>
                {dot.count} responses ({dot.percentage}%)
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
