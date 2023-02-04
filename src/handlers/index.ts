import { Composer } from "grammy";
import type { Ctx } from "@/types.ts";
import { startCmd } from "./commands/start.ts";
import { helpCmd } from "./commands/help.ts";

export const handlers = new Composer<Ctx>();

const pm = handlers.filter((ctx) => ctx.chat?.type === "private");

pm.command("start", startCmd);
pm.command("help", helpCmd);
