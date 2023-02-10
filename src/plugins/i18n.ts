import { I18n } from "grammy-i18n";
import type { Ctx } from "@/types.ts";

// configure i18n plugin with locales
const __dirname = new URL(".", import.meta.url).pathname;
export const i18n = new I18n<Ctx>({
  defaultLocale: "en",
  useSession: false,
});
await i18n.loadLocalesDir(`${__dirname}/../../locales`);
export const i18nMiddleware = i18n.middleware();
