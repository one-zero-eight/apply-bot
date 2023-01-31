import { Bot } from "grammy";
import { I18n } from "grammy-i18n";
import type { Ctx } from "./types.ts";
import { config } from "./config.ts";
import * as handlers from "./handlers/index.ts";

/**
 * Configures everything and starts the bot.
 */
function runBot() {
  // Configure i18n plugin, load locales.
  const __dirname = new URL(".", import.meta.url).pathname;
  const i18n = new I18n<Ctx>({
    defaultLocale: "en",
    directory: `${__dirname}/../locales`,
    useSession: false,
  });

  const bot = new Bot<Ctx>(config.TELEGRAM_BOT_TOKEN);

  // Configure graceful shutdown.
  // See more: https://grammy.dev/advanced/reliability.html#graceful-shutdown
  Deno.addSignalListener("SIGINT", () => bot.stop());
  Deno.addSignalListener("SIGTERM", () => bot.stop());

  // Register middlewares.
  bot.use(i18n.middleware());

  // Register handlers.
  bot.use(handlers.commands);

  bot.catch(console.error);

  bot.start();
}

runBot();
