import { I18n } from "grammy-i18n";
import type { Ctx } from "@/types.ts";

// configure i18n plugin with locales
const __dirname = new URL(".", import.meta.url).pathname;
export const i18n = new I18n<Ctx>({
  defaultLocale: "en",
  directory: `${__dirname}/../../locales`,
  useSession: false,
});
export const i18nMiddleware = i18n.middleware();
