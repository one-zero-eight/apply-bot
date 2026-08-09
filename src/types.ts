import type { Context, SessionFlavor } from "grammy";
import type { Conversation, ConversationFlavor } from "grammy-conversations";
import type { I18nFlavor } from "grammy-i18n";
import type { O12tFlavor } from "@/plugins/o12t.ts";
import type {
  SessionData as CandidateApplicationSessionData,
} from "@/handlers/conversations/application.ts";

export type LocaleId = "en" | "ru";

export interface SessionData {
  candidateCnv: CandidateApplicationSessionData;
  language?: LocaleId;
}

export type Ctx =
  & Context
  & SessionFlavor<SessionData>
  & ConversationFlavor
  & I18nFlavor
  & O12tFlavor;

export type Cnv = Conversation<Ctx>;
