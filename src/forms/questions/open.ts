import { Cnv, Ctx } from "@/types.ts";
import type { StringParser } from "@/utils/parsing.ts";
import { escapeHtml } from "@/utils/html.ts";
import { QuestionBase, type QuestionBaseOptions } from "./base.ts";

export type QuestionOpenOptions<T = string> =
  & (T extends string ? {
      parser?: StringParser<T> | undefined;
    }
    : {
      parser: StringParser<T>;
    })
  & QuestionBaseOptions;

export class QuestionOpen<T = string> extends QuestionBase<T, QuestionBaseOptions> {
  private parser?: QuestionOpenOptions<T>["parser"];

  constructor(options: QuestionOpenOptions<T>) {
    super(options);
    this.parser = options.parser;
  }

  public ask(cnv: Cnv, ctx: Ctx): Promise<T> {
    return this._ask(cnv, ctx, false);
  }

  public askOrSkip(cnv: Cnv, ctx: Ctx): Promise<T | null> {
    return this._ask(cnv, ctx, true);
  }

  public askOrKeepOld(cnv: Cnv, ctx: Ctx, old: T, oldAsText?: string): Promise<T> {
    return this._ask(cnv, ctx, false, old, oldAsText);
  }

  private async _ask<S extends boolean>(
    cnv: Cnv,
    ctx: Ctx,
    canSkip: S,
    old?: T,
    oldAsText?: string,
  ): Promise<S extends true ? T | null : T> {
    const sendMsg = old !== undefined
      ? async (ctx: Ctx) => {
        await this.sendAskingMessage(ctx, {
          footer: ctx.t(
            "question-keep-old",
            { old: escapeHtml(oldAsText ?? `${old}`) },
          ),
        });
      }
      : this.sendAskingMessage.bind(this);

    let answer = null;
    do {
      await sendMsg(ctx);
      answer = await cnv.form.text(sendMsg);

      if (canSkip && answer.trim() === "/skip") {
        return null as (S extends true ? T | null : T);
      } else if (old !== undefined && answer.trim() === "/keep") {
        return old;
      } else if (this.parser) {
        answer = this.parser(answer);
      }
    } while (answer === null);

    return answer as T;
  }

  private async sendAskingMessage(
    ctx: Ctx,
    options?: { header?: string; footer?: string },
  ) {
    const { header, footer } = options ?? {};

    let msg = "";

    if (header) {
      msg += header + "\n\n";
    }

    msg += ctx.t(this.msgId);

    if (footer) {
      msg += "\n\n" + footer;
    }

    await ctx.reply(msg);
  }
}
