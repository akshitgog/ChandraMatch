export type SensorType = 'OHRC' | 'TMC-2' | 'IIRS' | 'CUSTOM';

export interface SensorSpec {
  id: SensorType;
  name: string;
  fullName: string;
  resolution: string;
  description: string;
  badge: string;
  sampleUrl: string;
  features: string[];
}

export type FitMode = 'adaptive' | 'contain' | 'scrollable';

export interface ImageSlotState {
  id: 'source' | 'reference' | 'result';
  label: string;
  sensor: SensorType;
  resolutionText: string;
  src: string | null;
  file: File | null;
  fileName: string | null;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio?: number;
  fitMode?: FitMode;
  isLoading: boolean;
  error: string | null;
}

export interface RegistrationOptionsState {
  spatialFiltering: boolean;
  contrastEnhancement: boolean;
  detectorType: 'SIFT' | 'ORB' | 'AKAZE' | 'DeepMatching';
  transformationType: 'Homography' | 'Affine' | 'Rigid';
}

export interface TiePoint {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
}

export interface RegistrationResultData {
  success: boolean;
  rmse: number;
  matchedKeypoints: number;
  totalKeypoints: number;
  inlierRatio: number;
  processingTimeMs: number;
  tiePoints: TiePoint[];
  alignedSourceUrl: string;
  referenceUrl: string;
  homographyMatrix: number[][];
}

export interface RegistrationMetrics {
  matches: number | string;
  inliers: number | string;
  inlierRatio: number | string;
  rmse: number | string;
}

export type AppTab = 'home' | 'about';
export type WorkflowStep = 1 | 2 | 3;
