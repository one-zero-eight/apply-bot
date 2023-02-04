import type { Ctx } from "@/types.ts";

export async function startCmd(ctx: Ctx) {
  await ctx.reply(ctx.t("start-cmd"));
}
