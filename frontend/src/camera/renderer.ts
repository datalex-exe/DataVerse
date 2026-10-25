/**
 * Camera Filter Engine
 * Orchestrates WebGL Shaders, MediaPipe Face Tracking, Canvas 2D Overlays, and Particle Systems.
 * Provides real-time 60 FPS rendering, photo capture with effects baked in, and video recording.
 */

import { FilterDefinition, CameraFacing, CameraStats } from './types';
import { ShaderProgramPipeline } from './shaderPrograms';
import { faceTracker } from './faceTracker';
import { FaceOverlayRenderer } from './overlays';
import { ParticleEngine } from './particles';

export class CameraFilterEngine {
  private outputCanvas: HTMLCanvasElement;
  private outputCtx: CanvasRenderingContext2D | null = null;
  private glCanvas: HTMLCanvasElement;
  private shaderPipeline: ShaderProgramPipeline;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private overlayRenderer: FaceOverlayRenderer;
  private particleEngine: ParticleEngine;

  private videoElement: HTMLVideoElement | null = null;
  private activeFilter: FilterDefinition | null = null;
  private isFrontCamera: boolean = true;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  // Video recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingPromiseResolve: ((blob: Blob) => void) | null = null;
  private recordingPromiseReject: ((err: Error) => void) | null = null;

  // Performance telemetry
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private currentFps: number = 60;
  private statsCallback: ((stats: CameraStats) => void) | null = null;

  constructor(targetCanvas: HTMLCanvasElement) {
    this.outputCanvas = targetCanvas;
    this.outputCtx = targetCanvas.getContext('2d', { alpha: false });

    // Internal offscreen WebGL canvas for shader post-processing
    this.glCanvas = document.createElement('canvas');
    this.shaderPipeline = new ShaderProgramPipeline(this.glCanvas);

    // Internal offscreen 2D canvas for face overlays & particles
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this.overlayRenderer = new FaceOverlayRenderer();
    this.particleEngine = new ParticleEngine();
  }

  /**
   * Set callback for real-time FPS and latency reporting
   */
  public onStats(callback: (stats: CameraStats) => void) {
    this.statsCallback = callback;
  }

  /**
   * Set the active camera source video element
   */
  public setVideoSource(video: HTMLVideoElement, facing: CameraFacing = 'user') {
    this.videoElement = video;
    this.isFrontCamera = facing === 'user';
  }

  /**
   * Switch active filter without restarting the camera or interrupting the stream
   */
  public setFilter(filter: FilterDefinition) {
    this.activeFilter = filter;
    this.particleEngine.setPreset(filter.id);
  }

  /**
   * Start the continuous render loop
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.renderLoop();
  }

  /**
   * Stop rendering
   */
  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Continuous animation and rendering loop
   */
  private renderLoop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Track FPS
    this.frameCount++;
    if (this.frameCount % 30 === 0) {
      this.currentFps = Math.round(1 / Math.max(delta, 0.001));
      if (this.statsCallback) {
        this.statsCallback({
          fps: Math.min(60, this.currentFps),
          frameTimeMs: Math.round(delta * 1000),
          resolution: {
            width: this.outputCanvas.width,
            height: this.outputCanvas.height,
          },
          memoryMb: (performance as any).memory?.usedJSHeapSize
            ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
            : undefined,
        });
      }
    }

    this.renderFrame(now);
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  /**
   * Render a single frame with video source, WebGL shaders, face landmarks, and particles
   */
  private renderFrame(timestamp: number) {
    if (!this.videoElement || this.videoElement.readyState < 2) return;
    if (!this.outputCtx || !this.overlayCtx) return;

    const video = this.videoElement;
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;
    const timeSec = timestamp / 1000;

    // Synchronize internal canvas dimensions to video aspect
    if (this.outputCanvas.width !== vWidth || this.outputCanvas.height !== vHeight) {
      this.outputCanvas.width = vWidth;
      this.outputCanvas.height = vHeight;
      this.glCanvas.width = vWidth;
      this.glCanvas.height = vHeight;
      this.overlayCanvas.width = vWidth;
      this.overlayCanvas.height = vHeight;
    }

    // 1. Detect face landmarks if filter needs face anchoring or face-aware distortion
    const needsTracking = this.activeFilter && (
      this.activeFilter.category === 'accessories' ||
      this.activeFilter.category === 'face' ||
      this.activeFilter.category === 'beauty' ||
      this.activeFilter.category === 'fantasy' ||
      this.activeFilter.effectType === 'face-landmark' ||
      this.activeFilter.effectType === 'distortion'
    );

    let landmarks = null;
    if (needsTracking) {
      landmarks = faceTracker.detect(video, timestamp);
    }

    // 2. Run WebGL Shader pass (Color grading, vignette, light leak, GPU distortions)
    const filterParams = this.activeFilter ? this.activeFilter.parameters : {};
    this.shaderPipeline.render(video, vWidth, vHeight, filterParams, timeSec, landmarks);

    // 3. Draw WebGL output to master canvas (mirror horizontally if front camera)
    this.outputCtx.save();
    if (this.isFrontCamera) {
      this.outputCtx.translate(vWidth, 0);
      this.outputCtx.scale(-1, 1);
    }
    this.outputCtx.drawImage(this.glCanvas, 0, 0, vWidth, vHeight);
    this.outputCtx.restore();

    // 4. Clear 2D overlay canvas
    this.overlayCtx.clearRect(0, 0, vWidth, vHeight);

    // 5. Draw landmark-anchored accessories, makeup, and fantasy auras
    if (landmarks && this.activeFilter) {
      this.overlayRenderer.draw(
        this.overlayCtx,
        vWidth,
        vHeight,
        this.activeFilter.id,
        this.activeFilter.parameters,
        landmarks,
        timeSec
      );
    }

    // 6. Draw particle engine effects (snow, blossom, leaves, stardust, fireflies, etc.)
    this.particleEngine.updateAndDraw(this.overlayCtx, vWidth, vHeight, timeSec);

    // 7. Composite overlay canvas onto main output canvas
    this.outputCtx.save();
    if (this.isFrontCamera) {
      this.outputCtx.translate(vWidth, 0);
      this.outputCtx.scale(-1, 1);
    }
    this.outputCtx.drawImage(this.overlayCanvas, 0, 0);
    this.outputCtx.restore();
  }

  /**
   * Capture current live frame as high-resolution photo Blob with all filters baked in
   */
  public async capturePhoto(format: string = 'image/jpeg', quality: number = 0.95): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.outputCanvas) {
        reject(new Error('Canvas not initialized'));
        return;
      }
      this.outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create photo blob'));
          }
        },
        format,
        quality
      );
    });
  }

  /**
   * Start video recording with active filters baked into the output video stream
   */
  public startRecording(audioTrack?: MediaStreamTrack | null): boolean {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return false;
    }

    try {
      this.recordedChunks = [];
      const canvasStream = this.outputCanvas.captureStream(30);

      // Add audio track if available from microphone
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }

      // Check supported MIME types
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ''; // Let browser choose default
      }

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(canvasStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const finalType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: finalType });
        if (this.recordingPromiseResolve) {
          this.recordingPromiseResolve(blob);
        }
      };

      this.mediaRecorder.onerror = (e: any) => {
        if (this.recordingPromiseReject) {
          this.recordingPromiseReject(new Error(e?.error?.message || 'Recording error'));
        }
      };

      this.mediaRecorder.start(100); // 100ms slice for smooth chunking
      return true;
    } catch (err) {
      console.error('Failed to start recording with filter engine:', err);
      return false;
    }
  }

  /**
   * Stop video recording and return the recorded video Blob
   */
  public stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        reject(new Error('No active recording'));
        return;
      }
      this.recordingPromiseResolve = resolve;
      this.recordingPromiseReject = reject;
      this.mediaRecorder.stop();
    });
  }

  /**
   * Check if currently recording
   */
  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Free all GPU and CPU resources
   */
  public dispose() {
    this.stop();
    this.shaderPipeline.dispose();
    faceTracker.dispose();
    this.videoElement = null;
    this.activeFilter = null;
    this.outputCtx = null;
    this.overlayCtx = null;
  }
}
