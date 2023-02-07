import { Bot, session } from "grammy";
import { parseMode } from "grammy-parse-mode";
import { conversations } from "grammy-conversations";
import type { Ctx } from "./types.ts";
import { config } from "./config.ts";
import { i18nMiddleware } from "./plugins/i18n.ts";
import { o12tMiddleware } from "./plugins/o12t.ts";
import { handlers } from "./handlers/index.ts";

/**
 * Configures everything and starts the bot.
 */
function runBot() {
  const bot = new Bot<Ctx>(config.TELEGRAM_BOT_TOKEN);

  // use HTML parse mode as default
  bot.api.config.use(parseMode("HTML"));

  // configure graceful shutdown (for more info read the docs)
  // https://grammy.dev/advanced/reliability.html#graceful-shutdown
  Deno.addSignalListener("SIGINT", () => bot.stop());
  Deno.addSignalListener("SIGTERM", () => bot.stop());

  // register middlewares
  bot.use(session({
    type: "multi",
    application: {
      // store candidate application per user
      getSessionKey: (ctx) => ctx.from?.id?.toString() ?? "",
      initial: () => ({
        fullName: null,
        skills: null,
        departmentsChoice: {
          selected: {},
          finished: false,
        },
        departmentQuestions: {},
      }),
    },
    // storage for conversations plugin
    conversation: {},
  }));
  bot.use(conversations());
  bot.use(i18nMiddleware);
  bot.use(o12tMiddleware);

  bot.use(handlers);

  bot.catch(console.error);

  bot.start();
}

runBot();
