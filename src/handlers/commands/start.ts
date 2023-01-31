import type { Ctx } from "@/types.ts";

export default async function (ctx: Ctx) {
  await ctx.reply(ctx.t("start-cmd"));
}
