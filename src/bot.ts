import { Bot, session } from "grammy";
import { parseMode } from "grammy-parse-mode";
import { conversations } from "grammy-conversations";
import { apiThrottler } from "grammy-transformer-throttler";
import { limit } from "grammy-ratelimiter";
import type { Ctx } from "./types.ts";
import { config } from "./config.ts";
import { i18nMiddleware } from "./plugins/i18n.ts";
import { o12tMiddleware } from "./plugins/o12t.ts";
import { handlers } from "./handlers/index.ts";
import { getInitialCandidateApplicationData } from "./handlers/conversations/candidate-application.ts";

export const bot = new Bot<Ctx>(config.TELEGRAM_BOT_TOKEN);

// add API throttler
// https://grammy.dev/plugins/transformer-throttler.html
const throttler = apiThrottler();
bot.api.config.use(throttler);

// use HTML parse mode as default
// https://grammy.dev/plugins/parse-mode.html
bot.api.config.use(parseMode("HTML"));

// configure graceful shutdown
// https://grammy.dev/advanced/reliability.html#graceful-shutdown
Deno.addSignalListener("SIGINT", () => bot.stop());
Deno.addSignalListener("SIGTERM", () => bot.stop());

// register middlewares
bot.use(limit({
  timeFrame: 2000,
  limit: 3,
  onLimitExceeded: async (ctx) => {
    await ctx.reply("🚨 Wow, slow down! 🚨");
  },
}));
bot.use(session({
  type: "multi",
  application: {
    // store candidate application per user
    getSessionKey: (ctx) => ctx.from?.id?.toString() ?? "",
    initial: getInitialCandidateApplicationData,
  },
  questionsMenus: {
    // store questions menu states per user
    getSessionKey: (ctx) => ctx.from?.id?.toString() ?? "",
    initial: () => ({}),
  },
  // storage for conversations plugin
  conversation: {},
}));
bot.use(conversations());
bot.use(i18nMiddleware);
bot.use(o12tMiddleware);

bot.use(handlers);

// register fallback callback queries handler
bot.on("callback_query:data", async (ctx) => {
  console.log("Unknown button event with payload", ctx.callbackQuery.data);
  await ctx.answerCallbackQuery();
});
