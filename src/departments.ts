export const departmentsIds = ["tech", "design", "media", "management"] as const;
export const departmentsInfo: { [I in DepartmentId]: DepartmentInfo<I> } = {
  tech: {
    id: "tech",
    displayName: "Tech",
  },

  design: {
    id: "design",
    displayName: "Design",
  },

  media: {
    id: "media",
    displayName: "Media",
  },

  management: {
    id: "management",
    displayName: "Management",
  },
};
export type DepartmentId = (typeof departmentsIds)[number];
export type DepartmentInfo<I extends DepartmentId> = {
  id: I;
  displayName: string;
};
