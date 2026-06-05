import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FsaDotMap, { type FsaMapDot } from '../FsaDotMap';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="leaflet-map">{children}</div>
  ),
  TileLayer: ({ attribution, url }: { attribution: string; url: string }) => (
    <div data-testid="tile-layer" data-attribution={attribution} data-url={url} />
  ),
  Marker: ({ position, children }: { position: [number, number]; children: React.ReactNode }) => (
    <div data-center={`${position[0]},${position[1]}`} data-testid="circle-marker">
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  useMap: () => ({
    fitBounds: vi.fn(),
    setView: vi.fn(),
  }),
}));

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marker-cluster-group">{children}</div>
  ),
}));

const gtaDots: FsaMapDot[] = [
  {
    fsa: 'L6J',
    province: 'Ontario',
    lat: 43.47455,
    lng: -79.6596,
    count: 21,
    percentage: 18.6,
  },
  {
    fsa: 'L6K',
    province: 'Ontario',
    lat: 43.4359,
    lng: -79.68965,
    count: 13,
    percentage: 11.5,
  },
  {
    fsa: 'M5V',
    province: 'Ontario',
    lat: 43.63505,
    lng: -79.40995,
    count: 9,
    percentage: 8,
  },
];

describe('FsaDotMap', () => {
  it('renders clustered GTA FSA markers on a Leaflet map', () => {
    render(<FsaDotMap dots={gtaDots} />);

    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(3);
    expect(screen.getByText('L6J')).toBeInTheDocument();
    expect(screen.getByText(/L6J:\s*21\s*responses/)).toBeInTheDocument();
    expect(screen.getAllByText('Ontario')).toHaveLength(3);
  });

  it('renders national markers across provinces', () => {
    render(
      <FsaDotMap
        dots={[
          {
            fsa: 'V6B',
            province: 'British Columbia',
            lat: 49.2829,
            lng: -123.1163,
            count: 20,
            percentage: 40,
          },
          {
            fsa: 'M5V',
            province: 'Ontario',
            lat: 43.63505,
            lng: -79.40995,
            count: 15,
            percentage: 30,
          },
          {
            fsa: 'B3J',
            province: 'Nova Scotia',
            lat: 44.6439,
            lng: -63.56925,
            count: 15,
            percentage: 30,
          },
        ]}
      />
    );

    expect(screen.getAllByTestId('circle-marker')).toHaveLength(3);
    expect(screen.getByText('British Columbia')).toBeInTheDocument();
    expect(screen.getByText('Nova Scotia')).toBeInTheDocument();
  });

  it('renders no markers when there are no visible FSA dots', () => {
    render(<FsaDotMap dots={[]} />);

    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
    expect(screen.queryAllByTestId('circle-marker')).toHaveLength(0);
  });
});
