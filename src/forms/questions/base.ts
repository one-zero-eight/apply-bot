import type { Cnv, Ctx } from "@/types.ts";

export interface QuestionBaseConfig {
  msgId: string;
  getMessageOptions?: (cnv: Cnv, ctx: Ctx) => Record<string, string | number | Date>;
}

export interface AskParams<T> {
  header?: string;
  footer?: string;
  old?: T;
}

export abstract class QuestionBase<
  T,
  O extends QuestionBaseConfig = QuestionBaseConfig,
> {
  protected _msgId: string;
  protected getMessageOptions: QuestionBaseConfig["getMessageOptions"];

  constructor({ msgId, getMessageOptions }: O) {
    this._msgId = msgId;
    this.getMessageOptions = getMessageOptions;
  }

  public abstract ask(
    cnv: Cnv,
    ctx: Ctx,
    params?: AskParams<T>,
  ): Promise<T>;

  public abstract stringifyAnswer(answer: T, ctx: Ctx): string;

  public get msgId(): string {
    return this._msgId;
  }

  protected buildMessage({
    message: msg,
    footer: f,
    header: h,
  }: { message: string; footer?: string; header?: string }): string {
    return `${h ? h + "\n\n" : ""}${msg}${f ? "\n\n" + f : ""}`;
  }
}
