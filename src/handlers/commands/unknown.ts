import type { Ctx } from "@/types.ts";

export async function unknownCmd(ctx: Ctx) {
  await ctx.reply(ctx.t("unknown-cmd"));
}
