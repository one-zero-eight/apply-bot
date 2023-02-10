import { Cnv, Ctx } from "@/types.ts";
import type { StringParser } from "@/utils/parsing.ts";
import { escapeHtml } from "@/utils/html.ts";
import {
  type QuestionAskOptions,
  QuestionBase,
  type QuestionBaseOptions,
} from "./base.ts";

export type QuestionOpenOptions<T extends string = string> =
  & (T extends string ? {
      parser?: StringParser<T> | undefined;
    }
    : {
      parser: StringParser<T>;
    })
  & QuestionBaseOptions;

export class QuestionOpen<
  T extends string = string,
> extends QuestionBase<T, QuestionBaseOptions> {
  private parser?: QuestionOpenOptions<T>["parser"];

  constructor(options: QuestionOpenOptions<T>) {
    super(options);
    this.parser = options.parser;
  }

  public async ask(
    cnv: Cnv,
    ctx: Ctx,
    { header, footer, old }: QuestionAskOptions<T> = {},
  ): Promise<T> {
    let sendMsg;
    if (old !== undefined) {
      sendMsg = async (ctx: Ctx) => {
        const footerCombined = (footer ? footer + "\n\n" : "") + ctx.t(
          "question-keep-old",
          { old: escapeHtml(old) },
        );
        await this.sendAskingMessage(ctx, { header, footer: footerCombined });
      };
    } else {
      sendMsg = async (ctx: Ctx) => {
        await this.sendAskingMessage(ctx, { header, footer });
      };
    }

    let answer = null;
    do {
      await sendMsg(ctx);
      answer = await cnv.form.text(sendMsg);

      if (old !== undefined && answer.trim() === "/keep") {
        return old;
      } else if (this.parser) {
        answer = this.parser(answer);
      }
    } while (answer === null);

    return answer as T;
  }

  private async sendAskingMessage(
    ctx: Ctx,
    { header, footer }: { header?: string; footer?: string } = {},
  ) {
    await ctx.reply(
      this.buildMessage({
        header,
        message: ctx.t(this.msgId),
        footer,
      }),
      { reply_markup: { remove_keyboard: true } },
    );
  }
}
