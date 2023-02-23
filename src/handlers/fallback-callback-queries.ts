import type { MiddlewareFn } from "grammy";
import type { Ctx } from "@/types.ts";
import { choose } from "@/utils/random.ts";

const messages = [
  "fallback-callback-query-msg-1",
  "fallback-callback-query-msg-2",
  "fallback-callback-query-msg-3",
];

export const fallbackCallbackQueriesHandler: MiddlewareFn<Ctx> = async (ctx, next) => {
  if (ctx.callbackQuery?.data === undefined) {
    return await next();
  }
  await ctx.answerCallbackQuery(ctx.t(choose(messages)));
  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
};
