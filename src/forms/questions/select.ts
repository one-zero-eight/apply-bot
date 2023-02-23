import { InlineKeyboard } from "grammy";
import type { CallbackQuery } from "grammy/types";
import type { Cnv, Ctx } from "@/types.ts";
import { type AskParams, QuestionBase, type QuestionBaseConfig } from "./base.ts";
import { escapeHtml } from "@/utils/html.ts";
import { makeId } from "@/utils/random.ts";

type Click<O extends string = string> =
  | ClickFalsy
  | ClickSelect<O>;
type ClickFalsy = { type: "falsy" };
type ClickSelect<O extends string = string> = { type: "select"; option: O };

export interface QuestionSelectConfig<
  O extends string = string,
> extends QuestionBaseConfig {
  optionsKeyboard: O[][];
  getOptionLabel?: (option: O, ctx: Ctx) => string;
  printSelectedOption?: boolean;
}

export class QuestionSelect<
  O extends string = string,
> extends QuestionBase<O, QuestionBaseConfig> {
  private globalKeyboardId: string;
  private optionsKeyboard: O[][];
  private options: O[];
  private getOptionLabel: (option: O, ctx: Ctx) => string;
  private printSelectedOption: boolean;

  constructor(config: QuestionSelectConfig<O>) {
    super(config);
    this.globalKeyboardId = "qslct";
    this.optionsKeyboard = config.optionsKeyboard;
    this.options = this.optionsKeyboard.reduce((acc, row) => [...acc, ...row], []);
    this.getOptionLabel = config.getOptionLabel ?? ((option, ctx) => {
      return ctx.t(`${this.msgId}.${option}`);
    });
    this.printSelectedOption = config.printSelectedOption ?? true;
  }

  // TODO docs
  public async ask(
    cnv: Cnv,
    ctx: Ctx,
    {
      header,
      footer,
      old,
    }: AskParams<O> = {},
  ): Promise<O> {
    const localKeyboardId = await cnv.external(() => makeId(16));

    const footerWithSaved = old != undefined
      ? (footer ? footer + "\n\n" : "") + ctx.t(
        "question-keep-saved",
        { saved: escapeHtml(this.getOptionLabel(old, ctx)) },
      )
      : footer;

    const sentMessage = await ctx.reply(
      this.buildMessage({
        header,
        message: ctx.t(this.msgId, this.getMessageOptions?.(cnv, ctx)),
        footer: footerWithSaved,
      }),
      {
        reply_markup: this.buildKeyboard(localKeyboardId, ctx),
        disable_web_page_preview: true,
      },
    );

    ctx = await cnv.wait();
    const message = (ctx.message?.text ?? "").trim();

    if (message === "/undo" || message === "/back") {
      return await cnv.skip();
    }

    let selected = null;
    // user wants to /keep old answer
    if (old != null && message === "/keep") {
      selected = old;
    } else {
      const click = this.detectClick(localKeyboardId, ctx.callbackQuery);
      selected = click.type === "select" ? click.option : null;
      if (selected == null) {
        return await cnv.skip();
      }
      await ctx.answerCallbackQuery();
    }

    try {
      if (this.printSelectedOption) {
        ctx.api.editMessageText(
          sentMessage.chat.id,
          sentMessage.message_id,
          this.buildMessage({
            header,
            message: ctx.t(this.msgId, this.getMessageOptions?.(cnv, ctx)),
            footer: (footer ? footer + "\n\n" : "") + ctx.t("question-selected", {
              selected: this.getOptionLabel(selected, ctx),
            }),
          }),
        );
        // remove keyboard and print selected option
      } else {
        await ctx.api.editMessageReplyMarkup(
          sentMessage.chat.id,
          sentMessage.message_id,
          { reply_markup: undefined },
        );
      }
    } catch (err) {
      cnv.error("error editing multi-select question message", err);
    }

    return selected;
  }

  public stringifyAnswer(answer: O, ctx: Ctx): string {
    return this.getOptionLabel(answer, ctx);
  }

  // TODO docs
  private detectClick(id: string, callbackQuery?: CallbackQuery): Click<O> {
    const falsy: ClickFalsy = { type: "falsy" };

    if (callbackQuery === undefined || callbackQuery.data === undefined) {
      return falsy;
    }

    const data = callbackQuery.data;
    const parts = data.split(":");
    if (parts.length !== 3) {
      return falsy;
    }
    if (parts[0] !== this.globalKeyboardId || parts[1] !== id) {
      return falsy;
    }

    const i = parts[2];
    if (!i.match(/^\d+$/)) {
      return falsy;
    }
    const num = Number.parseInt(i);
    if (0 <= num && num < this.options.length) {
      return { type: "select", option: this.options[num] };
    }
    return falsy;
  }

  // TODO docs
  private buildKeyboard(localKeyboardId: string, ctx: Ctx): InlineKeyboard {
    const kb = new InlineKeyboard();
    const kbId = `${this.globalKeyboardId}:${localKeyboardId}`;
    let i = 0;
    for (const row of this.optionsKeyboard) {
      for (const optionId of row) {
        const label = this.getOptionLabel(optionId, ctx);
        const cbqData = `${kbId}:${i}`; // e.g. "randglblid:randloclid:0"
        kb.text(label, cbqData);
        i++;
      }
      kb.row();
    }

    return kb;
  }

  public stringifySelected(selected: O, ctx: Ctx): string {
    return this.getOptionLabel(selected, ctx);
  }
}
