import { Keyboard } from "grammy";
import type { Cnv, Ctx } from "@/types.ts";
import { QuestionBase, type QuestionBaseOptions } from "./base.ts";

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

  public ask(cnv: Cnv, ctx: Ctx): Promise<OptionId> {
    return this._ask(cnv, ctx, false);
  }

  public askOrSkip(cnv: Cnv, ctx: Ctx): Promise<OptionId | null> {
    return this._ask(cnv, ctx, true);
  }

  public askOrKeepOld(
    cnv: Cnv,
    ctx: Ctx,
    _old = "",
    _oldAsText?: string,
  ): Promise<string> {
    // For select user just chooses another option
    return this._ask(cnv, ctx, false);
  }

  private async _ask<S extends boolean>(
    cnv: Cnv,
    ctx: Ctx,
    canSkip: S,
  ): Promise<S extends true ? OptionId | null : OptionId> {
    let selectedOptionId = null;
    do {
      await this.sendSelectOptionsMessage(ctx);
      const text = await cnv.form.text(this.sendSelectOptionsMessage.bind(this));

      if (canSkip && text.trim() === "/skip") {
        return null as (S extends true ? OptionId | null : OptionId);
      } else {
        selectedOptionId = this.getOptionIdByAnswer(text, ctx);
      }
    } while (selectedOptionId == null);
    return selectedOptionId;
  }

  private async sendSelectOptionsMessage(ctx: Ctx): Promise<void> {
    const list = this.generateOptionsListTo(ctx);
    const message = `${ctx.t(this.msgId)}\n\n${list}`;
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
