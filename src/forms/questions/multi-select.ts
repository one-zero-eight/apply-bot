import { GrammyError, InlineKeyboard } from "grammy";
import type { CallbackQuery } from "grammy/types";
import type { Cnv, Ctx } from "@/types.ts";
import { makeId } from "@/utils/random.ts";
import { clamp } from "@/utils/numbers.ts";
import { AskParams, QuestionBase, type QuestionBaseConfig } from "./base.ts";

export const btnText = (text: string, selected: boolean) => (
  `${selected ? "●" : "○"} ${text}`
);

export type Options<O extends string = string> = Array<O>;

export interface QuestionMultiSelectConfig<
  O extends string,
> extends QuestionBaseConfig {
  optionsKeyboard: O[][];
  getOptionLabel?: (option: O, ctx: Ctx) => string;
  min?: number;
  printSelectedOptions?: boolean;
  selectAtLeastTextPosition?: "button" | "message";
}

type Click<O extends string = string> =
  | ClickFalsy
  | ClickSelect<O>
  | ClickUnselect<O>
  | ClickConfirm;
type ClickFalsy = { type: "falsy" };
type ClickSelect<O extends string = string> = { type: "select"; option: O };
type ClickUnselect<O extends string = string> = { type: "unselect"; option: O };
type ClickConfirm = { type: "confirm" };

// TODO docs
export class QuestionMultiSelect<O extends string = string> extends QuestionBase<
  Options<O>,
  QuestionBaseConfig
> {
  public readonly getOptionLabel: (option: O, ctx: Ctx) => string;
  private globalKeyboardId: string;
  private optionsKeyboard: O[][];
  private options: O[];
  private min: number;
  private printSelectedOptions: boolean;
  private selectAtLeastTextPosition: "button" | "message";

  constructor(config: QuestionMultiSelectConfig<O>) {
    super(config);
    this.globalKeyboardId = "qmltslct";
    this.optionsKeyboard = config.optionsKeyboard;
    this.options = this.optionsKeyboard.reduce((acc, row) => [...acc, ...row], []);
    this.getOptionLabel = config.getOptionLabel ?? ((option, ctx) => {
      return ctx.t(`${this.msgId}.${option}`);
    });
    this.min = clamp(0, config.min ?? 0, this.optionsKeyboard.length);
    this.printSelectedOptions = config.printSelectedOptions ?? true;
    this.selectAtLeastTextPosition = config.selectAtLeastTextPosition || "button";
  }

  // TODO docs
  public async ask(
    cnv: Cnv,
    ctx: Ctx,
    {
      header,
      footer,
      old,
    }: AskParams<Options<O>> = {},
  ): Promise<Options<O>> {
    const localKeyboardId = await cnv.external(() => makeId(16));
    const selected = old ?? [];

    const sentMessage = await ctx.reply(
      this.buildMessage({
        header,
        message: ctx.t(this.msgId, this.getMessageOptions?.(cnv, ctx)),
        footer,
      }),
      {
        reply_markup: this.buildKeyboard(localKeyboardId, ctx, selected),
        disable_web_page_preview: true,
      },
    );

    let confirmed = false;
    while (!confirmed) {
      ctx = await cnv.wait();
      const message = (ctx.message?.text ?? "").trim();

      if (message === "/undo" || message === "/back") {
        return await cnv.skip();
      }

      // user wants to /keep old answer
      if (old != null && old.length > this.min && message === "/keep") {
        break;
      }

      const click = this.detectClick(localKeyboardId, ctx.callbackQuery);
      let kbOutdated = false;
      let callbackQueryAnswered = false;
      switch (click.type) {
        case "select":
          if (!selected.includes(click.option)) {
            selected.push(click.option);
          }
          kbOutdated = true;
          break;
        case "unselect": {
          const index = selected.indexOf(click.option);
          if (index > -1) {
            selected.splice(index, 1);
          }
          kbOutdated = true;
          break;
        }
        case "confirm":
          if (selected.length >= this.min) {
            confirmed = true;
          } else if (this.selectAtLeastTextPosition) {
            await ctx.answerCallbackQuery(
              ctx.t("question-multi-select.btn_select-at-least-n", { n: this.min }),
            );
            callbackQueryAnswered = true;
          }
          break;
        default:
          return await cnv.skip();
      }
      if (!callbackQueryAnswered) {
        await ctx.answerCallbackQuery();
      }
      if (kbOutdated) {
        // update keyboard
        try {
          await ctx.editMessageReplyMarkup({
            reply_markup: this.buildKeyboard(localKeyboardId, ctx, selected),
          });
        } catch (err) {
          if (err instanceof GrammyError) {
            cnv.error("failed to select option", err);
          } else {
            throw err;
          }
        }
      }
    }

    const selectedNormalized = this.normalizeSelected(selected);

    try {
      if (this.printSelectedOptions) {
        await ctx.api.editMessageText(
          sentMessage.chat.id,
          sentMessage.message_id,
          this.buildMessage({
            header,
            message: ctx.t(this.msgId, this.getMessageOptions?.(cnv, ctx)),
            footer: (footer ? footer + "\n\n" : "") + ctx.t("question-selected", {
              selected: this.stringifySelected(selectedNormalized, ctx),
            }),
          }),
        );
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

    return selectedNormalized;
  }

  public stringifyAnswer(answer: Options<O>, ctx: Ctx): string {
    return this.stringifySelected(answer, ctx);
  }

  /**
   * Determines click type by parsing callback query data.
   *
   * @param localKeyboardId Local ID of the keyboard, button click on which should be parsed.
   * @param callbackQuery Callback query to parse from.
   * @returns Parsed click from callback query.
   */
  private detectClick(
    localKeyboardId: string,
    callbackQuery?: CallbackQuery,
  ): Click<O> {
    const falsy: ClickFalsy = { type: "falsy" };

    if (callbackQuery?.data === undefined) {
      return falsy;
    }

    const parts = callbackQuery.data.split(":");
    if (parts[0] !== this.globalKeyboardId || parts[1] !== localKeyboardId) {
      return falsy;
    }
    switch (parts.length) {
      case 3:
        if (parts[2] === "$") {
          return { type: "confirm" };
        }
        return falsy;
      case 4: {
        const i = parts[2];
        const t = parts[3];
        if (t !== "+" && t !== "-") {
          return falsy;
        }
        if (!i.match(/^\d+$/)) {
          return falsy;
        }
        const num = Number.parseInt(i);
        if (0 <= num && num < this.options.length) {
          return {
            type: t === "+" ? "select" : "unselect",
            option: this.options[num],
          };
        }
        return falsy;
      }
      default:
        return falsy;
    }
  }

  /**
   * Builds an `InlineKeyboard` with buttons containing encoded callback data.
   * Labels and callback data of a button also depends on whether the button is selected.
   *
   * @param localKeyboardId Local ID of the keyboard to encode in the buttons data.
   * @param ctx Context object (used to generate labels options).
   * @param selected Array of options that are selected.
   * @returns Built `InlineKeyboard`.
   */
  private buildKeyboard(
    localKeyboardId: string,
    ctx: Ctx,
    selected: Options<O>,
  ): InlineKeyboard {
    const kb = new InlineKeyboard();
    const kbId = `${this.globalKeyboardId}:${localKeyboardId}`;
    let i = 0;
    for (const row of this.optionsKeyboard) {
      for (const optionId of row) {
        const label = this.getOptionLabel(optionId, ctx);
        const isSelected = selected.includes(optionId);
        const text = btnText(label, isSelected);
        // e.g. "randglblid:randloclid:0:+"
        const cbqData = [kbId, i, isSelected ? "-" : "+"].join(":");
        kb.text(text, cbqData);
        i++;
      }
      kb.row();
    }

    const confirmText =
      (selected.length < this.min && this.selectAtLeastTextPosition === "button")
        ? ctx.t("question-multi-select.btn_select-at-least-n", { n: this.min })
        : ctx.t("question-multi-select.btn_confirm");
    // e.g. "randglblid:randloclid:$"
    const cbqData = `${kbId}:$`;
    kb.text(confirmText, cbqData);

    return kb;
  }

  public stringifySelected(selected: Options<O>, ctx: Ctx): string {
    return selected
      .map((opt) => this.getOptionLabel(opt, ctx))
      .join(", ") || ctx.t("question-selected-none");
  }

  /**
   * Returns a new array of options, in which there are no duplicates and
   * options are ordered in the same way as they were defined on the keyboard.
   *
   * @param selected Array of selected options.
   * @returns Normalized array of selected options.
   */
  private normalizeSelected(selected: Options<O>): Options<O> {
    return this.options.filter((opt) => selected.includes(opt));
  }
}
