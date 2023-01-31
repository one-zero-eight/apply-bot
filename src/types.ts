import type { Context } from "grammy";
import type { I18nFlavor } from "grammy-i18n";

export type Ctx =
  & Context
  & I18nFlavor;
