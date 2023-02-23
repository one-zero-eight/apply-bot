import type { Ctx } from "@/types.ts";

export async function helpCmd(ctx: Ctx) {
  const member = await ctx.o12t.member();
  if (member != null) {
    await ctx.reply(
      ctx.t(member.isActive ? "cmd_help-member-active" : "cmd_help-member-inactive"),
    );
    return;
  }
  const candidate = await ctx.o12t.candidate();
  if (candidate != null) {
    await ctx.reply(ctx.t("cmd_help-candidate"));
    return;
  }
  await ctx.reply(ctx.t("cmd_help-unknown"));
}
