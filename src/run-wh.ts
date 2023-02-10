import { serve } from "server";
import { webhookCallback } from "grammy";
import { config } from "./config.ts";
import { bot } from "./bot.ts";

if (!config.WEBHOOK_SECRET_PATH) {
  throw new Error("WEBHOOK_SECRET_PATH environment variable is not set");
}

const handleUpdate = webhookCallback(bot, "std/http");

serve(async (req) => {
  if (req.method === "POST") {
    const url = new URL(req.url);
    if (url.pathname.slice(1) === config.WEBHOOK_SECRET_PATH) {
      try {
        return await handleUpdate(req);
      } catch (err) {
        console.error(err);
      }
    }
  }
  return new Response();
});
