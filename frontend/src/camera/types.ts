export type FilterCategory =
  | 'beauty'
  | 'aesthetic'
  | 'cinematic'
  | 'retro'
  | 'face'
  | 'accessories'
  | 'fantasy'
  | 'light'
  | 'distortion'
  | 'nature';

export type EffectType =
  | 'color-grade'
  | 'face-landmark'
  | 'particle'
  | 'distortion'
  | 'lighting'
  | 'composite';

export interface FilterDefinition {
  id: string;
  name: string;
  category: FilterCategory;
  thumbnail: string;
  effectType: EffectType;
  parameters: Record<string, any>;
  assetManifest?: string[];
  performanceTier: 'light' | 'medium' | 'heavy';
  enabled: boolean;
  description?: string;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface FaceLandmarksData {
  landmarks: NormalizedLandmark[];
  boundingBox?: {
    xMin: number;
    yMin: number;
    width: number;
    height: number;
  };
  roll: number; // head tilt angle in radians
  yaw: number;
  pitch: number;
  eyeLeft: NormalizedLandmark;
  eyeRight: NormalizedLandmark;
  noseTip: NormalizedLandmark;
  mouthCenter: NormalizedLandmark;
  forehead: NormalizedLandmark;
  chin: NormalizedLandmark;
  cheekLeft: NormalizedLandmark;
  cheekRight: NormalizedLandmark;
  eyeDistance: number;
}

export type CameraFacing = 'user' | 'environment';
export type CameraMode = 'photo' | 'video';

export interface CameraStats {
  fps: number;
  frameTimeMs: number;
  resolution: { width: number; height: number };
  memoryMb?: number;
}
