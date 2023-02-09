import { parseUrl } from "@/utils/parsing.ts";
import { QuestionOpen, type QuestionOpenOptions } from "./open.ts";

// deno-lint-ignore no-empty-interface
export interface QuestionUrlOptions extends Omit<QuestionOpenOptions, "parser"> {}

export class QuestionUrl extends QuestionOpen<string> {
  constructor(options: QuestionOpenOptions) {
    super({ ...options, parser: parseUrl });
  }
}
