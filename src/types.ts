import type { Context } from "grammy";
import type { I18nFlavor } from "grammy-i18n";
import type { O12tFlavor } from "@/plugins/o12t.ts";

export type Ctx =
  & Context
  & I18nFlavor
  & O12tFlavor;
