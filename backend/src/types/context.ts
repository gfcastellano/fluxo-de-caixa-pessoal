import type { Context as HonoContext } from 'hono';

export interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  OPENAI_API_KEY: string;
  [key: string]: string | undefined;
}

export interface Variables {
  userId: string;
  userEmail: string;
  [key: string]: string | undefined;
}

export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
