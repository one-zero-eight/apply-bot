import { Menu } from "grammy-menu";
import type { Cnv, Ctx } from "@/types.ts";
import { QuestionAskOptions, QuestionBase, type QuestionBaseOptions } from "./base.ts";

export const OPTION_NOT_SELECTED_SYMBOL = "○";
export const OPTION_SELECTED_SYMBOL = "●";

export const selectBtn = (text: string, selected: boolean) => (
  `${selected ? "●" : "○"} ${text}`
);

export type OptionId = string;
export type MultiSelectAnswer = Record<OptionId, boolean>;

export interface QuestionMultiSelectOptions extends QuestionBaseOptions {
  optionIdsKeyboard: OptionId[][];
  minAnswers?: number;
}

export class QuestionMultiSelect extends QuestionBase<
  MultiSelectAnswer,
  QuestionBaseOptions
> {
  private optionIdsKeyboard: OptionId[][];
  private optionIds: OptionId[];
  private minAnswers: number;
  private menuId: string;
  private _menu: Menu<Ctx>;

  constructor(options: QuestionMultiSelectOptions) {
    super(options);
    this.optionIdsKeyboard = options.optionIdsKeyboard;
    this.optionIds = this.optionIdsKeyboard.reduce((acc, row) => [...acc, ...row], []);
    this.minAnswers = Math.min(
      Math.max(0, options.minAnswers || 0),
      this.optionIdsKeyboard.length,
    );
    this.menuId = `${this.msgId}_menu`;
    this._menu = this.generateMenu();
  }

  public async ask(
    cnv: Cnv,
    ctx: Ctx,
    { header, footer, old }: QuestionAskOptions<MultiSelectAnswer> = {},
  ): Promise<MultiSelectAnswer> {
    if (old !== undefined && !cnv.session.questionsMenus[this.menuId]?.$oldSet) {
      cnv.session.questionsMenus[this.menuId] = old;
      cnv.session.questionsMenus[this.menuId].$oldSet = true;
    }

    await ctx.reply(
      this.buildMessage({
        header,
        message: ctx.t(this.msgId),
        footer,
      }),
      { reply_markup: this.menu },
    );

    ctx = await cnv.waitUntil((ctx) =>
      !!ctx.session.questionsMenus[this.menuId]?.$finished
    );

    const {
      $finished: _f,
      $oldSet: _o,
      ...answer
    } = cnv.session.questionsMenus[this.menuId];

    await ctx.editMessageText(
      this.buildMessage({
        header,
        message: ctx.t(this.msgId),
        footer: (footer ? footer + "\n\n" : "") + ctx.t("multi-select.selection", {
          selection: this.stringifyAnswer(answer, ctx),
        }),
      }),
    );

    return answer;
  }

  private generateMenu(): Menu<Ctx> {
    const menu = new Menu<Ctx>(this.menuId);

    for (const row of this.optionIdsKeyboard) {
      for (const optionId of row) {
        menu.text(
          (ctx) => (
            selectBtn(
              this.getOptionText(optionId, ctx),
              ctx.session.questionsMenus[this.menuId]?.[optionId],
            )
          ),
          (ctx) => {
            const menu = ctx.session.questionsMenus[this.menuId];
            if (menu === undefined) {
              ctx.session.questionsMenus[this.menuId] = {};
            }
            ctx.session.questionsMenus[this.menuId][optionId] = !menu[optionId];
            ctx.menu.update();
          },
        );
      }
      menu.row();
    }

    menu.text(
      (ctx) => {
        const selectedCount = Object
          .values(ctx.session.questionsMenus[this.menuId] || {})
          .filter(Boolean).length;
        if (selectedCount < this.minAnswers) {
          return ctx.t("multi-select.select-at-least-n-btn", { n: this.minAnswers });
        }
        return ctx.t("multi-select.select-confirm-btn");
      },
      (ctx) => {
        const selectedCount = Object
          .values(ctx.session.questionsMenus[this.menuId] || {})
          .filter(Boolean).length;
        if (selectedCount < this.minAnswers) {
          return;
        }

        if (!ctx.session.questionsMenus[this.menuId]) {
          ctx.session.questionsMenus[this.menuId] = { $finished: true };
        } else {
          ctx.session.questionsMenus[this.menuId].$finished = true;
        }

        ctx.menu.close();
      },
    );

    return menu;
  }

  public get menu() {
    return this._menu;
  }

  public stringifyAnswer(answer: MultiSelectAnswer, ctx: Ctx): string {
    return this.optionIds
      .filter((id) => answer[id])
      .map((id) => this.getOptionText(id, ctx))
      .join(", ") || ctx.t("multi-select.selected-none");
  }

  public getOptionText(id: OptionId, ctx: Ctx) {
    return ctx.t(`${this.msgId}.${id}`);
  }
}
