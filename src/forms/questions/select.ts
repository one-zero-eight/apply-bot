import { Keyboard } from "grammy";
import type { Cnv, Ctx } from "@/types.ts";
import { QuestionAskOptions, QuestionBase, type QuestionBaseOptions } from "./base.ts";
import { escapeHtml } from "@/utils/html.ts";

export type OptionId = string;

export interface QuestionSelectOptions extends QuestionBaseOptions {
  optionIdsKeyboard: OptionId[][];
}

export class QuestionSelect extends QuestionBase<OptionId, QuestionBaseOptions> {
  private optionIdsKeyboard: OptionId[][];
  private optionIds: OptionId[];

  constructor(options: QuestionSelectOptions) {
    super(options);
    this.optionIdsKeyboard = options.optionIdsKeyboard;
    this.optionIds = this.optionIdsKeyboard.reduce((acc, row) => [...acc, ...row], []);
  }

  public async ask(
    cnv: Cnv,
    ctx: Ctx,
    { header, footer, old }: QuestionAskOptions<OptionId> = {},
  ): Promise<OptionId> {
    let sendMsg;
    if (old !== undefined) {
      const oldText = this.getOptionText(old, ctx);
      sendMsg = async (ctx: Ctx) => {
        const footerCombined = (footer ? footer + "\n\n" : "") + ctx.t(
          "question-keep-old",
          { old: escapeHtml(oldText) },
        );
        await this.sendSelectOptionsMessage(ctx, { header, footer: footerCombined });
      };
    } else {
      sendMsg = async (ctx: Ctx) => {
        await this.sendSelectOptionsMessage(ctx, { header, footer });
      };
    }

    let selectedOptionId = null;
    do {
      await sendMsg(ctx);
      const answer = await cnv.form.text(this.sendSelectOptionsMessage.bind(this));

      if (old !== undefined && answer.trim() === "/keep") {
        return old;
      } else {
        selectedOptionId = this.getOptionIdByAnswer(answer, ctx);
      }
    } while (selectedOptionId === null);
    return selectedOptionId;
  }

  private async sendSelectOptionsMessage(
    ctx: Ctx,
    { header, footer }: { header?: string; footer?: string } = {},
  ): Promise<void> {
    const list = this.generateOptionsListTo(ctx);
    const message = this.buildMessage({
      header,
      message: `${ctx.t(this.msgId)}\n\n${list}`,
      footer,
    });
    const keyobard = this.generateOptionsKeyboard(ctx);

    await ctx.reply(message, { reply_markup: keyobard });
  }

  private generateOptionsListTo(ctx: Ctx): string {
    return this.optionIds
      .map((id, i) => `/${i + 1} ${this.getOptionText(id, ctx)}`)
      .join("\n");
  }

  private generateOptionsKeyboard(ctx: Ctx): Keyboard {
    const keyboard = new Keyboard();
    for (const row of this.optionIdsKeyboard) {
      for (const id of row) {
        keyboard.text(this.getOptionText(id, ctx));
      }
      keyboard.row();
    }
    return keyboard
      .resized()
      .oneTime();
  }

  private getOptionIdByAnswer(answer: string, ctx: Ctx): OptionId | null {
    answer = answer.trim();

    const numMatch = answer.match(/^\s*\/?(\d+)\s*$/);
    const answerNum = numMatch ? parseInt(numMatch[1]) : NaN;
    if (!isNaN(answerNum) && answerNum >= 1 && answerNum <= this.optionIds.length) {
      return this.optionIds[answerNum - 1];
    }

    for (let i = 0; i < this.optionIds.length; i++) {
      const id = this.optionIds[i];
      if (this.getOptionText(id, ctx).trim() === answer) {
        return id;
      }
    }

    return null;
  }

  public getOptionText(id: OptionId, ctx: Ctx) {
    return ctx.t(`${this.msgId}__${id}`);
  }
}
