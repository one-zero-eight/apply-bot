import { InlineKeyboard } from "grammy";
import { Menu } from "grammy-menu";
import type { Ctx, LocaleId } from "@/types.ts";

export const languageMenu = new Menu<Ctx>("language-menu")
  .text(
    (ctx) => ctx.t("language-ru"),
    (ctx) => selectLanguage(ctx, "ru"),
  )
  .text(
    (ctx) => ctx.t("language-en"),
    (ctx) => selectLanguage(ctx, "en"),
  );

export const startMenu = new Menu<Ctx>("start-menu")
  .text(
    (ctx) => ctx.t("yes"),
    async (ctx) => {
      await ctx.menu.close({ immediate: true });
      await ctx.reply(
        ctx.t("want-to-108-yes"),
        {
          reply_markup: new InlineKeyboard().text(ctx.t("i-want-to-108"), "apply"),
          link_preview_options: { is_disabled: true },
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
  await ctx.reply(ctx.t("choose-language"), { reply_markup: languageMenu });
}

async function selectLanguage(ctx: Ctx, locale: LocaleId) {
  ctx.session.language = locale;
  ctx.i18n.useLocale(locale);
  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await showStartContent(ctx);
}

async function showStartContent(ctx: Ctx) {
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
      { link_preview_options: { is_disabled: true } },
    );
    return;
  }
  await ctx.reply(ctx.t("cmd_start-unknown"), { reply_markup: startMenu });
}
