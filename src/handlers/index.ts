import { Composer } from "grammy";
import { type Ctx } from "@/types.ts";
import { startCmd, startMenu } from "./commands/start.ts";
import { helpCmd } from "./commands/help.ts";
import { profileCmd } from "./commands/profile.ts";
import { unknownCmd } from "./commands/unknown.ts";
import { fallbackCallbackQueriesHandler } from "./fallback-callback-queries.ts";
import {
  conversationComposer as candidateApplicationConversation,
} from "./conversations/application.ts";

export const handlers = new Composer<Ctx>();

handlers.use(startMenu);

const pm = handlers.filter((ctx) => ctx.chat?.type === "private");

pm.use(candidateApplicationConversation);

pm.command("profile", profileCmd);
pm.command("start", startCmd);
pm.command("help", helpCmd);

pm.on("::bot_command", unknownCmd);

// register fallback callback queries handler
// https://grammy.dev/plugins/keyboard.html#responding-to-clicks
handlers.on("callback_query:data", fallbackCallbackQueriesHandler);
