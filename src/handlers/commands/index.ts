import { Composer } from "grammy";
import type { Ctx } from "@/types.ts";
import startCmd from "./start.ts";
import helpCmd from "./help.ts";

export const composer = new Composer<Ctx>();

composer.command("start", startCmd);
composer.command("help", helpCmd);
