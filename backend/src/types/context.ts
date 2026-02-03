import type { Context as HonoContext } from 'hono';

export interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  OPENAI_API_KEY: string;
}

export interface Variables {
  userId: string;
  userEmail: string;
}

export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
