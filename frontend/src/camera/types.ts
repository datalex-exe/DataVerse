/**
 * Camera Types
 * Defines data structures for the camera system, destinations, and controls.
 */

export type CameraFacing = 'user' | 'environment';
export type CameraMode = 'photo' | 'video';
export type AspectRatio = '9:16' | '4:5' | '1:1';
export type TimerDuration = 0 | 3 | 10;
export type CameraDestination = 'chat' | 'post';

export interface CameraDestinationOptions {
  destination: CameraDestination;
  conversationId?: string;
  replyTo?: any;
}

export interface CameraError {
  type: 'permission' | 'notfound' | 'inuse' | 'insecure' | 'unsupported' | 'unknown';
  message: string;
}

export interface SocialCameraModalProps {
  destination?: CameraDestination;
  conversationId?: string;
  replyTo?: any;
  initialMode?: CameraMode;
  onCapture: (blob: Blob, mode: CameraMode, destination?: CameraDestination) => void | Promise<void>;
  onClose: () => void;
  onGallerySelect?: (file: File) => void;
}
