import { SensorSpec } from '../types';

export const LUNAR_SENSORS: SensorSpec[] = [
  {
    id: 'OHRC',
    name: 'OHRC (0.32 m)',
    fullName: 'Orbiter High Resolution Camera',
    resolution: '0.32 m',
    description: 'High Resolution',
    badge: 'High Resolution',
    sampleUrl: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=1000&q=80',
    features: ['Highest spatial resolution in lunar orbit', 'Sub-meter boulder & crater detection', 'Targeted landing site mapping'],
  },
  {
    id: 'TMC-2',
    name: 'TMC-2 (5 m)',
    fullName: 'Terrain Mapping Camera-2',
    resolution: '5 m',
    description: 'Medium Resolution',
    badge: 'Medium Resolution',
    sampleUrl: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=1000&q=80',
    features: ['Stereo imaging for 3D Digital Elevation Models (DEM)', 'Large baseline swath coverage', 'Morphological lunar mapping'],
  },
  {
    id: 'IIRS',
    name: 'IIRS (~80 m)',
    fullName: 'Imaging Infra-Red Spectrometer',
    resolution: '~80 m',
    description: 'Hyperspectral',
    badge: 'Hyperspectral',
    sampleUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=1000&q=80',
    features: ['0.8 to 5.0 µm spectral range', 'Hydration & hydroxyl signature detection', 'Mineralogical characterization'],
  },
];

export const DEFAULT_SOURCE_IMAGE = {
  sensor: 'OHRC' as const,
  resolutionText: '0.32 m',
  name: 'ch2_ohrc_dr4_20201015T083210_sub01.png',
  url: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=1000&q=80',
  width: 1024,
  height: 1024,
};

export const DEFAULT_REFERENCE_IMAGE = {
  sensor: 'TMC-2' as const,
  resolutionText: '5 m',
  name: 'ch2_tmc2_cal_20201015T083225_sub02.png',
  url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=1000&q=80',
  width: 1280,
  height: 720,
};

export const SAMPLE_STRIPS = {
  longVerticalStrip: {
    sensor: 'OHRC' as const,
    resolutionText: '0.32 m',
    name: 'ch2_ohrc_orbital_strip_long.png',
    // Tall lunar orbital crater track (~1:3.2 aspect ratio)
    url: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=400&h=1300&q=80',
    width: 400,
    height: 1300,
    label: 'Long Orbital Strip (1:3.25)',
  },
  wideSwath: {
    sensor: 'TMC-2' as const,
    resolutionText: '5 m',
    name: 'ch2_tmc2_swath_wide.png',
    // Wide panoramic lunar swath (~3.2:1 aspect ratio)
    url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=1600&h=500&q=80',
    width: 1600,
    height: 500,
    label: 'Wide Panoramic Swath (3.2:1)',
  },
};
