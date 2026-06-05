'use client';

import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
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

const createCircleIcon = (radius: number, count: number, maxCount: number) => {
  const size = Math.max(radius * 2, 24); // Ensure minimum size to fit text
  const ratio = maxCount > 0 ? count / maxCount : 1;
  const alpha = 0.2 + ratio * 0.7; // Scales opacity from 0.2 to 0.9

  return L.divIcon({
    className: 'custom-circle-icon',
    html: `<div style="background-color: rgba(4, 55, 126, ${alpha}); border: 2px solid rgba(4, 55, 126, 0.6); border-radius: 50%; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; color: ${ratio > 0.4 ? '#ffffff' : '#04377e'}; font-weight: bold; font-size: ${Math.max(10, size / 2.5)}px;">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createClusterIcon = (cluster: L.MarkerCluster) => {
  const markers = cluster.getAllChildMarkers();
  let totalCount = 0;
  markers.forEach((marker: L.Marker) => {
    totalCount += parseInt(marker.options.title || '0', 10);
  });

  return L.divIcon({
    html: `<div style="background-color: rgba(4, 55, 126, 0.85); color: #ffffff; font-weight: bold; border: 2px solid rgba(12, 183, 196, 0.8); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(0,0,0,0.2); font-size: 14px;"><span>${totalCount}</span></div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(44, 44),
  });
};

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
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterIcon}
        showCoverageOnHover={false}
        maxClusterRadius={60}
      >
        {dots.map((dot) => {
          const r = radiusForCount(dot.count, maxCount);
          return (
            <Marker
              position={[dot.lat, dot.lng]}
              key={dot.fsa}
              icon={createCircleIcon(r, dot.count, maxCount)}
              title={dot.count.toString()}
            >
              <Tooltip direction="top" offset={[0, -r]} opacity={0.95}>
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
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
