import {
  Question,
  QuestionMultiSelect,
  QuestionOpen,
  QuestionSelect,
  QuestionUrl,
} from "@/forms/questions/index.ts";

export const DEPS_IDS = ["tech", "design", "media", "management"] as const;

export const DEPS: Departments = {
  tech: {
    id: "tech",
    displayName: "Tech",
    questions: [
      new QuestionOpen({ msgId: "q-tech-1" }),
      new QuestionOpen({ msgId: "q-tech-2" }),
      new QuestionOpen({ msgId: "q-tech-3" }),
    ],
  },

  design: {
    id: "design",
    displayName: "Design",
    questions: [
      new QuestionMultiSelect({
        msgId: "q-design-1",
        optionIdsKeyboard: [
          ["ui-ux", "web"],
          ["art", "vector"],
          ["smm"],
        ],
        minAnswers: 1,
      }),
      new QuestionOpen({ msgId: "q-design-2" }),
      new QuestionOpen({ msgId: "q-design-3" }),
    ],
  },

  media: {
    id: "media",
    displayName: "Media",
    questions: [
      new QuestionOpen({ msgId: "q-media-1" }),
      new QuestionSelect({
        msgId: "q-media-2",
        optionIdsKeyboard: [
          ["hours-per-week-1-5"],
          ["hours-per-week-5-10"],
          ["hours-per-week-10-plus"],
        ],
      }),
      new QuestionUrl({ msgId: "q-media-3" }),
    ],
  },

  management: {
    id: "management",
    displayName: "Management",
    questions: [
      new QuestionOpen({ msgId: "q-management-1" }),
      new QuestionOpen({ msgId: "q-management-2" }),
      new QuestionOpen({ msgId: "q-management-3" }),
      new QuestionOpen({ msgId: "q-management-4" }),
      new QuestionOpen({ msgId: "q-management-5" }),
    ],
  },
};

export type DepartmentId = (typeof DEPS_IDS)[number];

export type Departments<D extends DepartmentId = DepartmentId> = {
  [K in D]: {
    id: K;
    displayName: string;
    questions: [Question, ...Question[]];
  };
};
