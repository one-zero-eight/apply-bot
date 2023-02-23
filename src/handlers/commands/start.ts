import { InlineKeyboard } from "grammy";
import { Menu } from "grammy-menu";
import type { Ctx } from "@/types.ts";

export const startMenu = new Menu<Ctx>("start-menu")
  .text(
    (ctx) => ctx.t("yes"),
    async (ctx) => {
      await ctx.menu.close({ immediate: true });
      await ctx.reply(
        ctx.t("want-to-108-yes"),
        {
          reply_markup: new InlineKeyboard().text(ctx.t("i-want-to-108"), "apply"),
          disable_web_page_preview: true,
        },
      );
    },
  )
  .text(
    (ctx) => ctx.t("no"),
    async (ctx) => {
      await ctx.menu.close({ immediate: true });
      await ctx.reply(ctx.t("want-to-108-no"));
    },
  );

export async function startCmd(ctx: Ctx) {
  const member = await ctx.o12t.member();
  if (member != null) {
    await ctx.reply(ctx.t(
      member.isActive ? "cmd_start-member-active" : "cmd_start-member-inactive",
      { name: member.fullName },
    ));
    return;
  }
  const candidate = await ctx.o12t.candidate();
  if (candidate != null) {
    await ctx.reply(
      ctx.t("cmd_start-candidate", { name: candidate.name }),
      { disable_web_page_preview: true },
    );
    return;
  }
  await ctx.reply(ctx.t("cmd_start-unknown"), { reply_markup: startMenu });
}
