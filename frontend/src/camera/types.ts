/**
 * Camera & Filter Types
 * Defines data structures for the 200-filter engine, WebGL shaders, and social UI.
 */

export type FilterCategory =
  | 'natural'
  | 'warm'
  | 'cool'
  | 'bw'
  | 'vintage'
  | 'aesthetic'
  | 'neon'
  | 'dreamy'
  | 'cinematic'
  | 'pastel';

export interface CategoryInfo {
  id: FilterCategory;
  name: string;
  iconName?: string;
}

export interface ShaderParams {
  brightness?: number;      // -1.0 to 1.0 (default 0.0)
  contrast?: number;        // 0.0 to 3.0 (default 1.0)
  saturation?: number;      // 0.0 to 3.0 (default 1.0)
  hue?: number;             // -3.14159 to 3.14159 (default 0.0)
  temperature?: number;     // -1.0 (cool) to 1.0 (warm)
  tint?: number;            // -1.0 (green) to 1.0 (magenta)
  fade?: number;            // 0.0 to 1.0 (lift blacks)
  vignette?: number;        // 0.0 to 1.0 (corner darkening)
  grain?: number;           // 0.0 to 1.0 (film noise)
  bloom?: number;           // 0.0 to 1.0 (glow diffusion)
  sharpness?: number;       // 0.0 to 1.0 (edge enhancement)
  shadowColor?: [number, number, number];    // RGB 0-1
  highlightColor?: [number, number, number]; // RGB 0-1
  splitToneBalance?: number;// 0.0 to 1.0
  skinSmooth?: number;      // 0.0 to 1.0
}

export interface FilterDefinition {
  id: string;
  name: string;
  category: FilterCategory;
  params: ShaderParams;
}

export type CameraFacing = 'user' | 'environment';
export type CameraMode = 'photo' | 'video';
export type AspectRatio = '9:16' | '4:5' | '1:1';
export type TimerDuration = 0 | 3 | 10;

export interface CameraStats {
  fps: number;
  frameTimeMs: number;
  resolution: { width: number; height: number };
  memoryMb?: number;
}
