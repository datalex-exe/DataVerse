import { FaceLandmarksData, NormalizedLandmark } from './types';

// Smoothed state to eliminate tracking jitter
interface SmoothedFace {
  eyeLeft: NormalizedLandmark;
  eyeRight: NormalizedLandmark;
  noseTip: NormalizedLandmark;
  mouthCenter: NormalizedLandmark;
  forehead: NormalizedLandmark;
  chin: NormalizedLandmark;
  cheekLeft: NormalizedLandmark;
  cheekRight: NormalizedLandmark;
  roll: number;
  eyeDistance: number;
}

class FaceTracker {
  private landmarker: any = null;
  private isInitializing: boolean = false;
  private isAvailable: boolean = false;
  private lastSmoothed: SmoothedFace | null = null;
  private framesSinceLastDetection: number = 0;
  private alpha: number = 0.35; // Exponential smoothing factor

  constructor() {
    this.initMediaPipe();
  }

  private async initMediaPipe() {
    if (this.isInitializing || this.landmarker) return;
    this.isInitializing = true;

    try {
      // Dynamically load @mediapipe/tasks-vision
      const vision = await import('@mediapipe/tasks-vision');
      const { FilesetResolver, FaceLandmarker } = vision;

      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      this.isAvailable = true;
      console.log('MediaPipe FaceLandmarker initialized successfully with GPU acceleration');
    } catch (err) {
      console.warn('MediaPipe FaceLandmarker GPU init failed, trying CPU fallback:', err);
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const { FilesetResolver, FaceLandmarker } = vision;
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        this.isAvailable = true;
        console.log('MediaPipe FaceLandmarker CPU fallback ready');
      } catch (cpuErr) {
        console.warn('FaceLandmarker offline/unavailable, using synthetic face anchor fallback:', cpuErr);
        this.isAvailable = false;
      }
    } finally {
      this.isInitializing = false;
    }
  }

  public detect(videoElement: HTMLVideoElement, timestampMs: number): FaceLandmarksData | null {
    if (!videoElement || videoElement.readyState < 2) {
      return this.getFallbackFace();
    }

    if (this.isAvailable && this.landmarker) {
      try {
        const result = this.landmarker.detectForVideo(videoElement, timestampMs);
        if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
          const rawLandmarks: NormalizedLandmark[] = result.faceLandmarks[0];
          this.framesSinceLastDetection = 0;
          return this.processLandmarks(rawLandmarks);
        }
      } catch {
        // Fallback gracefully on detection glitch
      }
    }

    this.framesSinceLastDetection++;
    // Keep smoothing recent detection for up to 15 frames during brief occlusion
    if (this.lastSmoothed && this.framesSinceLastDetection < 15) {
      return this.buildFaceDataFromSmoothed(this.lastSmoothed);
    }

    // Default synthetic portrait face anchor so accessories and makeup always show preview
    return this.getFallbackFace();
  }

  private processLandmarks(landmarks: NormalizedLandmark[]): FaceLandmarksData {
    // Key landmark indices in MediaPipe 468-point mesh
    // Left eye center: 33 (outer corner) / 133 (inner) / 159 (top) / 145 (bottom)
    // Right eye center: 263 (outer) / 362 (inner) / 386 (top) / 374 (bottom)
    // Nose tip: 1
    // Mouth center: 13 / 14
    // Forehead: 10
    // Chin: 152
    // Left cheek: 234
    // Right cheek: 454

    const eyeL = landmarks[133] || landmarks[33] || { x: 0.38, y: 0.42, z: 0 };
    const eyeR = landmarks[362] || landmarks[263] || { x: 0.62, y: 0.42, z: 0 };
    const nose = landmarks[1] || { x: 0.5, y: 0.52, z: 0 };
    const mouth = landmarks[13] || { x: 0.5, y: 0.68, z: 0 };
    const forehead = landmarks[10] || { x: 0.5, y: 0.25, z: 0 };
    const chin = landmarks[152] || { x: 0.5, y: 0.85, z: 0 };
    const cheekL = landmarks[234] || { x: 0.28, y: 0.52, z: 0 };
    const cheekR = landmarks[454] || { x: 0.72, y: 0.52, z: 0 };

    // Calculate 2D roll tilt angle in radians
    const dx = eyeR.x - eyeL.x;
    const dy = eyeR.y - eyeL.y;
    const rawRoll = Math.atan2(dy, dx);
    const rawEyeDist = Math.hypot(dx, dy);

    // Apply EMA smoothing
    if (!this.lastSmoothed) {
      this.lastSmoothed = {
        eyeLeft: eyeL,
        eyeRight: eyeR,
        noseTip: nose,
        mouthCenter: mouth,
        forehead,
        chin,
        cheekLeft: cheekL,
        cheekRight: cheekR,
        roll: rawRoll,
        eyeDistance: rawEyeDist,
      };
    } else {
      const a = this.alpha;
      const prev = this.lastSmoothed;
      this.lastSmoothed = {
        eyeLeft: { x: prev.eyeLeft.x * (1 - a) + eyeL.x * a, y: prev.eyeLeft.y * (1 - a) + eyeL.y * a },
        eyeRight: { x: prev.eyeRight.x * (1 - a) + eyeR.x * a, y: prev.eyeRight.y * (1 - a) + eyeR.y * a },
        noseTip: { x: prev.noseTip.x * (1 - a) + nose.x * a, y: prev.noseTip.y * (1 - a) + nose.y * a },
        mouthCenter: { x: prev.mouthCenter.x * (1 - a) + mouth.x * a, y: prev.mouthCenter.y * (1 - a) + mouth.y * a },
        forehead: { x: prev.forehead.x * (1 - a) + forehead.x * a, y: prev.forehead.y * (1 - a) + forehead.y * a },
        chin: { x: prev.chin.x * (1 - a) + chin.x * a, y: prev.chin.y * (1 - a) + chin.y * a },
        cheekLeft: { x: prev.cheekLeft.x * (1 - a) + cheekL.x * a, y: prev.cheekLeft.y * (1 - a) + cheekL.y * a },
        cheekRight: { x: prev.cheekRight.x * (1 - a) + cheekR.x * a, y: prev.cheekRight.y * (1 - a) + cheekR.y * a },
        roll: prev.roll * (1 - a) + rawRoll * a,
        eyeDistance: prev.eyeDistance * (1 - a) + rawEyeDist * a,
      };
    }

    return this.buildFaceDataFromSmoothed(this.lastSmoothed, landmarks);
  }

  private buildFaceDataFromSmoothed(s: SmoothedFace, fullLandmarks?: NormalizedLandmark[]): FaceLandmarksData {
    return {
      landmarks: fullLandmarks || [
        s.forehead,
        s.noseTip,
        s.mouthCenter,
        s.chin,
        s.eyeLeft,
        s.eyeRight,
        s.cheekLeft,
        s.cheekRight,
      ],
      roll: s.roll,
      yaw: (s.noseTip.x - (s.eyeLeft.x + s.eyeRight.x) / 2) * 2.5,
      pitch: (s.noseTip.y - (s.eyeLeft.y + s.eyeRight.y) / 2) * 2.0,
      eyeLeft: s.eyeLeft,
      eyeRight: s.eyeRight,
      noseTip: s.noseTip,
      mouthCenter: s.mouthCenter,
      forehead: s.forehead,
      chin: s.chin,
      cheekLeft: s.cheekLeft,
      cheekRight: s.cheekRight,
      eyeDistance: s.eyeDistance,
      boundingBox: {
        xMin: s.cheekLeft.x,
        yMin: s.forehead.y,
        width: Math.abs(s.cheekRight.x - s.cheekLeft.x),
        height: Math.abs(s.chin.y - s.forehead.y),
      },
    };
  }

  private getFallbackFace(): FaceLandmarksData {
    const s: SmoothedFace = {
      eyeLeft: { x: 0.38, y: 0.42 },
      eyeRight: { x: 0.62, y: 0.42 },
      noseTip: { x: 0.5, y: 0.52 },
      mouthCenter: { x: 0.5, y: 0.68 },
      forehead: { x: 0.5, y: 0.24 },
      chin: { x: 0.5, y: 0.84 },
      cheekLeft: { x: 0.28, y: 0.52 },
      cheekRight: { x: 0.72, y: 0.52 },
      roll: 0,
      eyeDistance: 0.24,
    };
    return this.buildFaceDataFromSmoothed(s);
  }

  public dispose() {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {
        // ignore
      }
      this.landmarker = null;
    }
    this.lastSmoothed = null;
    this.isAvailable = false;
  }
}

export const faceTracker = new FaceTracker();
