import { loadSync } from "dotenv";

export interface BotConfig {
  TELEGRAM_BOT_TOKEN: string;
  NOTION_INTEGRATION_TOKEN: string;
  NOTION_MEMBERS_DB_ID: string;
  NOTION_CANDIDATES_DB_ID: string;
}

function loadConfig(): BotConfig {
  const raw = loadSync();
  const cfg = {} as BotConfig;

  const keys = [
    "TELEGRAM_BOT_TOKEN",
    "NOTION_INTEGRATION_TOKEN",
    "NOTION_MEMBERS_DB_ID",
    "NOTION_CANDIDATES_DB_ID",
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
