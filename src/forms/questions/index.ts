import {
  type MultiSelectAnswer,
  QuestionMultiSelect,
  type QuestionMultiSelectOptions,
} from "./multi-select.ts";
import { QuestionOpen, type QuestionOpenOptions } from "./open.ts";
import { QuestionSelect, type QuestionSelectOptions } from "./select.ts";
import { QuestionUrl, type QuestionUrlOptions } from "./url.ts";

export type Question =
  | QuestionMultiSelect
  | QuestionOpen
  | QuestionSelect
  | QuestionUrl;

export {
  type MultiSelectAnswer,
  QuestionMultiSelect,
  type QuestionMultiSelectOptions,
  QuestionOpen,
  type QuestionOpenOptions,
  QuestionSelect,
  type QuestionSelectOptions,
  QuestionUrl,
  type QuestionUrlOptions,
};
