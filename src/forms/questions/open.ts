import { Cnv, Ctx } from "@/types.ts";
import { escapeHtml } from "@/utils/html.ts";
import type { StringParser } from "@/utils/parsing.ts";
import { type AskParams, QuestionBase, type QuestionBaseConfig } from "./base.ts";

export type QuestionOpenConfig<T extends string = string> =
  & (T extends string ? {
      parser?: StringParser<T> | undefined;
    }
    : {
      parser: StringParser<T>;
    })
  & QuestionBaseConfig
  & {
    maxSize?: number;
  };

export class QuestionOpen<
  T extends string = string,
> extends QuestionBase<T, QuestionBaseConfig> {
  private parser?: QuestionOpenConfig<T>["parser"];
  private maxSize: number;

  constructor(config: QuestionOpenConfig<T>) {
    super(config);
    this.parser = config.parser;
    this.maxSize = config.maxSize ?? 1000;
  }

  public async ask(
    cnv: Cnv,
    ctx: Ctx,
    {
      header,
      footer,
      old,
    }: AskParams<T> = {},
  ): Promise<T> {
    let sendMsg;
    if (old != undefined) {
      sendMsg = async (ctx: Ctx) => {
        const footerCombined = (footer ? footer + "\n\n" : "") + ctx.t(
          "question-keep-saved",
          { saved: escapeHtml(old) },
        );
        await this.sendAskingMessage(cnv, ctx, { header, footer: footerCombined });
      };
    } else {
      sendMsg = async (ctx: Ctx) => {
        await this.sendAskingMessage(cnv, ctx, { header, footer });
      };
    }

    await sendMsg(ctx);
    ctx = await cnv.wait();
    if (ctx.message === undefined) {
      return await cnv.skip();
    }
    let answer: string | null | undefined = ctx.message.text ?? ctx.message.caption;
    if (answer === undefined) {
      return await cnv.skip();
    }
    const trimmed = answer.trim();

    if (trimmed === "/keep") {
      if (old != null) {
        return old;
      }
      return await cnv.skip();
    } else if (trimmed === "/undo" || trimmed === "/back") {
      return await cnv.skip();
    } else if (this.parser) {
      answer = this.parser(answer);
    }

    if ((answer?.length ?? 0) > this.maxSize) {
      await ctx.reply(ctx.t("question-answer-too-long", {
        limit: this.maxSize,
        current: answer?.length ?? 0,
      }));
      return await cnv.skip();
    }

    if (!answer || trimmed === "") {
      await sendMsg(ctx);
      return await cnv.skip();
    }

    return answer as T;
  }

  public stringifyAnswer(answer: T): string {
    return `${answer}`;
  }

  private async sendAskingMessage(
    cnv: Cnv,
    ctx: Ctx,
    { header, footer }: { header?: string; footer?: string } = {},
  ) {
    return await ctx.reply(
      this.buildMessage({
        header,
        message: ctx.t(this.msgId, this.getMessageOptions?.(cnv, ctx)),
        footer,
      }),
      { reply_markup: { remove_keyboard: true }, disable_web_page_preview: true },
    );
  }
}
