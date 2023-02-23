import { connect } from "redis";
import { Bot, session, StorageAdapter } from "grammy";
import { limit } from "grammy-ratelimiter";
import { sequentialize } from "grammy-runner";
import { parseMode } from "grammy-parse-mode";
import { conversations } from "grammy-conversations";
import { RedisAdapter } from "grammy-storage-adapter-redis";
import { apiThrottler } from "grammy-transformer-throttler";
import { type Ctx, SessionData } from "./types.ts";
import { config } from "./config.ts";
import { i18nMiddleware } from "./plugins/i18n.ts";
import { o12tMiddleware } from "./plugins/o12t.ts";
import { handlers } from "./handlers/index.ts";
import {
  getInitialSessionData as getInitialCandidateCnvData,
} from "./handlers/conversations/application.ts";

const redisInstance = await connect({
  hostname: config.REDIS_HOSTNAME,
  port: config.REDIS_PORT,
  db: 0,
});

const redisStorage = new RedisAdapter({ instance: redisInstance });

export const bot = new Bot<Ctx>(config.TELEGRAM_BOT_TOKEN);

// add API throttler
// https://grammy.dev/plugins/transformer-throttler.html
const throttler = apiThrottler();
bot.api.config.use(throttler);

// use HTML parse mode as default
// https://grammy.dev/plugins/parse-mode.html
bot.api.config.use(parseMode("HTML"));

// use rate limiter (in RAM)
// https://grammy.dev/plugins/ratelimiter.html
bot.use(limit({
  timeFrame: 1000,
  limit: 2,
  onLimitExceeded: async (ctx) => {
    await ctx.reply("🚨 Wow, slow down! 🚨");
  },
}));

// handle updates in the same chat/for the same user sequentially
// https://grammy.dev/plugins/runner.html#sequential-processing-where-necessary
bot.use(sequentialize((ctx) => {
  const chat = ctx.chat?.id.toString();
  const user = ctx.from?.id.toString();
  return [chat, user].filter((con) => con !== undefined) as string[];
}));

bot.use(session({
  type: "multi",
  candidateCnv: {
    storage: redisStorage as StorageAdapter<SessionData["candidateCnv"]>,
    // store candidate application per user
    getSessionKey: (ctx) => `candappl:${ctx.from?.id?.toString() ?? ""}`,
    initial: getInitialCandidateCnvData,
  },
  // storage for conversations plugin
  conversation: {
    // deno-lint-ignore no-explicit-any
    storage: redisStorage as StorageAdapter<any>,
    getSessionKey: (ctx) => `cnv:${ctx.from?.id?.toString() ?? ""}`,
  },
}));
bot.use(conversations());
bot.use(i18nMiddleware);
bot.use(o12tMiddleware);

// register all handlers
bot.use(handlers);
