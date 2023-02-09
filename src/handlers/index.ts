import { Composer } from "grammy";
import type { Ctx } from "@/types.ts";
import { startCmd } from "./commands/start.ts";
import { helpCmd } from "./commands/help.ts";
import { profileCmd } from "./commands/profile.ts";
import { unknownCmd } from "./commands/unknown.ts";
import {
  composer as candidateApplicationConversation,
} from "./conversations/candidate-application.ts";

export const handlers = new Composer<Ctx>();

const pm = handlers.filter((ctx) => ctx.chat?.type === "private");

pm.use(candidateApplicationConversation);

pm.command("profile", profileCmd);

pm.command("start", startCmd);
pm.command("help", helpCmd);

pm.on("::bot_command", unknownCmd);
