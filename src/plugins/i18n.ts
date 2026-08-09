import { I18n } from "grammy-i18n";
import type { Ctx, LocaleId } from "@/types.ts";

export const localeIds = ["en", "ru"] as const satisfies LocaleId[];

// configure i18n plugin with locales
const __dirname = new URL(".", import.meta.url).pathname;
export const i18n = new I18n<Ctx>({
  defaultLocale: "en",
  useSession: false,
  localeNegotiator: async (ctx): Promise<LocaleId> => {
    const savedLocale = ctx.session.language;
    if (savedLocale && localeIds.includes(savedLocale)) {
      return await Promise.resolve(savedLocale);
    }

    return await Promise.resolve("en");
  },
});
await i18n.loadLocalesDir(`${__dirname}/../../locales`);
export const i18nMiddleware = i18n.middleware();
