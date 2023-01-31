import { loadSync } from "dotenv";

export interface BotConfig {
  TELEGRAM_BOT_TOKEN: string;
}

function loadConfig(): BotConfig {
  const raw = loadSync();
  const cfg = {} as BotConfig;

  const keys = [
    "TELEGRAM_BOT_TOKEN",
  ] as const;

  for (const key of keys) {
    cfg[key] = raw[key];
    if (!cfg[key]) {
      throw new Error(`${key} environment variable is not set`);
    }
  }

  return cfg;
}

export const config = loadConfig();
