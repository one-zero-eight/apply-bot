import { Bot } from "grammy";
import type { Ctx } from "./types.ts";
import { config } from "./config.ts";
import { i18nMiddleware } from "./plugins/i18n.ts";
import { handlers } from "./handlers/index.ts";

/**
 * Configures everything and starts the bot.
 */
function runBot() {
  const bot = new Bot<Ctx>(config.TELEGRAM_BOT_TOKEN);

  // configure graceful shutdown (for more info read the docs)
  // https://grammy.dev/advanced/reliability.html#graceful-shutdown
  Deno.addSignalListener("SIGINT", () => bot.stop());
  Deno.addSignalListener("SIGTERM", () => bot.stop());

  // register middlewares
  bot.use(i18nMiddleware);

  bot.use(handlers);

  bot.catch(console.error);

  bot.start();
}

runBot();
