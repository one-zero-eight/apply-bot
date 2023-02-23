import { QuestionMultiSelect, type QuestionMultiSelectConfig } from "./multi-select.ts";
import { QuestionOpen, type QuestionOpenConfig } from "./open.ts";
import { QuestionSelect, type QuestionSelectConfig } from "./select.ts";

export type Question =
  | QuestionMultiSelect
  | QuestionOpen
  | QuestionSelect;

export {
  QuestionMultiSelect,
  type QuestionMultiSelectConfig,
  QuestionOpen,
  type QuestionOpenConfig,
  QuestionSelect,
  type QuestionSelectConfig,
};
