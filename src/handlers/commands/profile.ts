import type { NextFunction } from "grammy";
import type { Ctx } from "@/types.ts";

export async function profileCmd(ctx: Ctx, next: NextFunction) {
  const member = await ctx.o12t.member();
  if (member?.isActive) {
    await ctx.reply(ctx.t("cmd_profile", {
      name: member.fullName,
      role: member.level ?? "—",
      langs: member.speakingLanguages.length > 0
        ? member.speakingLanguages.join(", ")
        : "—",
      date: member.joined?.toISOString().split("T")[0] ?? "???",
    }));
    return;
  }
  await next();
}
