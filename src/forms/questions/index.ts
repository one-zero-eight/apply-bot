import { QuestionOpen } from "./open.ts";
import { QuestionSelect } from "./select.ts";
import { QuestionUrl } from "./url.ts";

export { QuestionOpen, type QuestionOpenOptions } from "./open.ts";
export { QuestionSelect, type QuestionSelectOptions } from "./select.ts";
export { QuestionUrl, type QuestionUrlOptions } from "./url.ts";

export type Question =
  | QuestionOpen
  | QuestionSelect
  | QuestionUrl;
