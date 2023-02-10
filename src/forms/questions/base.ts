import type { Cnv, Ctx } from "@/types.ts";

export interface QuestionBaseOptions {
  msgId: string;
}

export interface QuestionAskOptions<T> {
  old?: T;
  header?: string;
  footer?: string;
}

export abstract class QuestionBase<
  T,
  O extends QuestionBaseOptions = QuestionBaseOptions,
> {
  protected _msgId: string;

  constructor({ msgId }: O) {
    this._msgId = msgId;
  }

  public abstract ask(
    cnv: Cnv,
    ctx: Ctx,
    options?: QuestionAskOptions<T>,
  ): Promise<T>;

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
