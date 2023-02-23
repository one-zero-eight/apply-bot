import { load } from "dotenv";

export interface BotConfig {
  TELEGRAM_BOT_TOKEN: string;
  NOTION_INTEGRATION_TOKEN: string;
  NOTION_MEMBERS_DB_ID: string;
  NOTION_CANDIDATES_DB_ID: string;
  REDIS_HOSTNAME: string;
  REDIS_PORT: string;
  WEBHOOK_SECRET_PATH?: string;
}

async function loadConfig(): Promise<BotConfig> {
  await load({ export: true });
  const cfg = {} as BotConfig;

  const required = [
    "TELEGRAM_BOT_TOKEN",
    "NOTION_INTEGRATION_TOKEN",
    "NOTION_MEMBERS_DB_ID",
    "NOTION_CANDIDATES_DB_ID",
    "REDIS_HOSTNAME",
    "REDIS_PORT",
  ] as const;

  const optional = [
    "WEBHOOK_SECRET_PATH",
  ] as const;

  for (const key of required) {
    const val = Deno.env.get(key);
    if (!val) {
      throw new Error(`${key} environment variable is not set`);
    }
    cfg[key] = val;
  }

  for (const key of optional) {
    cfg[key] = Deno.env.get(key);
  }

  return cfg;
}

export const config = await loadConfig();
