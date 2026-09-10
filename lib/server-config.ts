import { env } from 'cloudflare:workers';
import type { AIConfig } from './audit/ai';
// Secrets are read only in server routes; never import this file in a component.
export function getAIConfig(): AIConfig | null {
  const settings = env as unknown as Record<string, unknown>;
  const key = settings.OPENAI_API_KEY, model = settings.OPENAI_MODEL;
  return settings.ENABLE_AI === 'true' && typeof key === 'string' && key.length > 0 && typeof model === 'string' && model.length > 0 ? { key, model } : null;
}
