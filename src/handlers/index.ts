import { Composer } from "grammy";
import type { Ctx } from "@/types.ts";
import { startCmd } from "./commands/start.ts";
import { helpCmd } from "./commands/help.ts";
import { profileCmd } from "./commands/profile.ts";
import { unknownCmd } from "./commands/unknown.ts";

export const handlers = new Composer<Ctx>();

const pm = handlers.filter((ctx) => ctx.chat?.type === "private");

const membersPm = pm.filter(async (ctx: Ctx) => (await ctx.o12t.member()) != null);
membersPm.command("profile", profileCmd);

pm.command("start", startCmd);
pm.command("help", helpCmd);

pm.on("::bot_command", unknownCmd);
