import type { Ctx } from "@/types.ts";

export async function profileCmd(ctx: Ctx) {
  const member = await ctx.o12t.member();
  if (member) {
    await ctx.reply(ctx.t("profile-cmd", {
      name: member.fullName,
      role: member.role ?? "—",
      langs: member.speakingLanguages.length > 0
        ? member.speakingLanguages.join(", ")
        : "—",
    }));
    return;
  }
  console.error("/profile: not a member");
}
