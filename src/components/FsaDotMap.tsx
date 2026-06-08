'use client';

import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { useEffect } from 'react';

export interface FsaMapDot {
  fsa: string;
  province: string;
  city?: string;
  lat: number;
  lng: number;
  count: number;
  percentage: number;
}

interface FsaDotMapProps {
  dots: FsaMapDot[];
}

const FSA_MARKER_SIZE = 34;
const FSA_CLUSTER_SIZE = 46;
const FSA_BLUE_HUE = 211;
const FSA_BLUE_SATURATION = 88;

function lightnessForCount(count: number, minCount: number, maxCount: number) {
  const range = maxCount - minCount;
  const ratio = range > 0 ? (count - minCount) / range : 1;
  return Math.round(74 - ratio * 44);
}

const createCircleIcon = (count: number, minCount: number, maxCount: number) => {
  const lightness = lightnessForCount(count, minCount, maxCount);

  return L.divIcon({
    className: 'custom-circle-icon',
    html: `<div style="background-color: hsl(${FSA_BLUE_HUE} ${FSA_BLUE_SATURATION}% ${lightness}%); border: 2px solid hsl(${FSA_BLUE_HUE} ${FSA_BLUE_SATURATION}% 24%); border-radius: 50%; width: ${FSA_MARKER_SIZE}px; height: ${FSA_MARKER_SIZE}px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 13px; line-height: 1; box-shadow: 0 2px 8px rgba(4, 55, 126, 0.28);">${count}</div>`,
    iconSize: [FSA_MARKER_SIZE, FSA_MARKER_SIZE],
    iconAnchor: [FSA_MARKER_SIZE / 2, FSA_MARKER_SIZE / 2],
  });
};

const createClusterIcon = (cluster: L.MarkerCluster) => {
  const markers = cluster.getAllChildMarkers();
  let totalCount = 0;
  markers.forEach((marker: L.Marker) => {
    totalCount += parseInt(marker.options.title || '0', 10);
  });

  return L.divIcon({
    html: `<div style="background-color: hsl(${FSA_BLUE_HUE} ${FSA_BLUE_SATURATION}% 30%); color: #ffffff; font-weight: 800; border: 2px solid hsl(${FSA_BLUE_HUE} ${FSA_BLUE_SATURATION}% 24%); border-radius: 50%; width: ${FSA_CLUSTER_SIZE}px; height: ${FSA_CLUSTER_SIZE}px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(4, 55, 126, 0.28); font-size: 14px; line-height: 1;"><span>${totalCount}</span></div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(FSA_CLUSTER_SIZE, FSA_CLUSTER_SIZE),
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

function RefreshMapSize() {
  const map = useMap();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [map]);

  return null;
}

export default function FsaDotMap({ dots }: FsaDotMapProps) {
  const maxCount = Math.max(1, ...dots.map((dot) => dot.count));
  const minCount = Math.min(maxCount, ...dots.map((dot) => dot.count));

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
      <RefreshMapSize />
      <FitFsaBounds dots={dots} />
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterIcon}
        showCoverageOnHover={false}
        maxClusterRadius={60}
      >
        {dots.map((dot) => {
          return (
            <Marker
              position={[dot.lat, dot.lng]}
              key={dot.fsa}
              icon={createCircleIcon(dot.count, minCount, maxCount)}
              title={dot.count.toString()}
            >
              <Tooltip direction="top" offset={[0, -FSA_MARKER_SIZE / 2]} opacity={0.95}>
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
