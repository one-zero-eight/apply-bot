import type { Context } from "grammy";
import type { SessionFlavor } from "grammy";
import type { Conversation, ConversationFlavor } from "grammy-conversations";
import type { I18nFlavor } from "grammy-i18n";
import type { O12tFlavor } from "@/plugins/o12t.ts";
import type { CandidateApplicationData } from "@/handlers/conversations/candidate-application.ts";

export interface SessionData {
  application: CandidateApplicationData;
  questionsMenus: Record<
    string,
    Record<string, boolean> & {
      $finished?: boolean;
      $oldSet?: boolean;
    }
  >;
}

export type Ctx =
  & Context
  & SessionFlavor<SessionData>
  & ConversationFlavor
  & I18nFlavor
  & O12tFlavor;

export type Cnv = Conversation<Ctx>;
