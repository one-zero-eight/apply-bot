export const DEPS_IDS = ["tech", "design", "media", "management"] as const;

export const DEPS: Departments = {
  tech: {
    id: "tech",
    displayName: "Tech",
    questions: [ // TODO
      { id: "tech-example", type: "select", optionIds: ["1", "2", "3"] },
      { id: "tech-example2", type: "select", optionIds: ["x", "y", "z"] },
    ],
  },

  design: {
    id: "design",
    displayName: "Design",
    questions: [ // TODO
      { id: "design-example", type: "select", optionIds: ["1", "2", "3"] },
    ],
  },

  media: {
    id: "media",
    displayName: "Media",
    questions: [ // TODO
      { id: "media-example", type: "select", optionIds: ["1", "2", "3"] },
    ],
  },

  management: {
    id: "management",
    displayName: "Management",
    questions: [ // TODO
      { id: "management-example", type: "select", optionIds: ["1", "2", "3"] },
    ],
  },
};

export type DepartmentId = (typeof DEPS_IDS)[number];

export type Departments<D extends DepartmentId = DepartmentId> = {
  [K in D]: {
    id: K;
    displayName: string;
    questions: [DepartmentQuestion, ...DepartmentQuestion[]];
  };
};

/* Questions */

export interface DepartmentQuestionBase {
  id: string;
}

export interface DepartmentQuestionSelect extends DepartmentQuestionBase {
  type: "select";
  optionIds: [string, string, ...string[]];
}

export type DepartmentQuestion = DepartmentQuestionSelect; // only one for now
