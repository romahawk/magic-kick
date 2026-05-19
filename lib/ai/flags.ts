export function isAiEnabled(): boolean {
  return process.env.AI_FEATURES_ENABLED !== "false"
}
