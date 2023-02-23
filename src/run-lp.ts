import { run } from "grammy-runner";
import { bot } from "./bot.ts";

bot.catch(console.error);

const runner = run(bot);

// graceful shutdown
// https://grammy.dev/advanced/reliability.html#graceful-shutdown
const stopRunner = () => {
  runner.isRunning() && runner.stop().then(() => {
    // TODO: remove explicit exit, when bug in grammy_transformer_throttler
    // will be fixed, which prevents process from exiting
    !runner.isRunning() && Deno.exit(0);
  });
};
Deno.addSignalListener("SIGINT", stopRunner);
Deno.addSignalListener("SIGTERM", stopRunner);
