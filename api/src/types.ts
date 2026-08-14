import { D1Database, KVNamespace, R2Bucket, DurableObjectNamespace } from '@cloudflare/workers-types';

export interface Bindings {
  DB: D1Database;
  SESSION_KV: KVNamespace;
  MEDIA_BUCKET: R2Bucket;
  JWT_SECRET?: string; // Optional JWT secret override from variables
  CHAT_ROOM: DurableObjectNamespace;
}

export interface Variables {
  userId: string;
  token: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  is_admin?: boolean;
  is_top_admin?: boolean;
  is_blocked?: boolean;
  is_private?: boolean;
  is_verification_paid?: boolean;
  verification_paid_at?: number;
  verification_category?: string | null;
  verification_document_url?: string | null;
  verification_reason?: string | null;
  verification_status?: string;
  created_at: number;
}
