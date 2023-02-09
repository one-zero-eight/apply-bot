import type { Cnv, Ctx } from "@/types.ts";

export interface QuestionBaseOptions {
  msgId: string;
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
  ): Promise<T>;

  public abstract askOrSkip(
    cnv: Cnv,
    ctx: Ctx,
  ): Promise<T | null>;

  public abstract askOrKeepOld(
    cnv: Cnv,
    ctx: Ctx,
    old: T,
    oldAsText?: string,
  ): Promise<T>;

  public get msgId(): string {
    return this._msgId;
  }
}
