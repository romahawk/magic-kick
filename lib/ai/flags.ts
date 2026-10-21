/**
 * ADR-017: the AI routes and the AI surfaces that call them are parked, default off. They are on
 * only when NEXT_PUBLIC_AI_FEATURES_ENABLED is exactly "true". One variable for the browser and the
 * routes: Next.js inlines NEXT_PUBLIC_* at build time, so the UI and the server always agree, and
 * changing it needs a rebuild (a Vercel redeploy).
 */
export function isAiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_FEATURES_ENABLED === "true"
}
