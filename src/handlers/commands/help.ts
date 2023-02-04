import type { Ctx } from "@/types.ts";

export async function helpCmd(ctx: Ctx) {
  await ctx.reply(ctx.t("help-cmd"));
}
