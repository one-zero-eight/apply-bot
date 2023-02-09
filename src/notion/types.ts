export type PropertyType =
  | "title"
  | "rich_text"
  | "number"
  | "checkbox"
  | "url"
  | "select"
  | "multi_select"
  | "date";

// TODO: improve type such that only one property of type "title" is allowed
export type PropertiesSchema = Record<string, PropertyType>;

export type TitlePropertyValue = {
  id: "title";
  type: "title";
  title: RichText[];
};

export type RichTextPropertyValue = {
  id: string;
  type: "rich_text";
  rich_text: RichText[];
};

export type NumberPropertyValue = {
  id: string;
  type: "number";
  number: number;
};

export type CheckboxPropertyValue = {
  id: string;
  type: "checkbox";
  checkbox: boolean;
};

export type UrlPropertyValue = {
  id: string;
  type: "url";
  url: string;
};

export type SelectPropertyValue = {
  id: string;
  type: "url";
  select?: Option;
};

export type MultiSelectPropertyValue = {
  id: string;
  type: "url";
  multi_select: Option[];
};

export type DatePropertyValue = {
  id: string;
  type: "date";
  date: {
    start: string;
    end?: string;
  };
};

export type Option = {
  id: string;
  name: string;
  color: OptionColor;
};

// deno-fmt-ignore
export type PropertyValue<T extends PropertyType> =
    T extends "title" ? TitlePropertyValue
  : T extends "rich_text" ? RichTextPropertyValue
  : T extends "number" ? NumberPropertyValue
  : T extends "checkbox" ? CheckboxPropertyValue
  : T extends "url" ? UrlPropertyValue
  : T extends "select" ? SelectPropertyValue
  : T extends "multi_select" ? MultiSelectPropertyValue
  : T extends "date" ? DatePropertyValue
  : never;

type _RichText = {
  plain_text: string;
  annotations: Annotations;
  href?: string;
};

export type RichTextEquation = _RichText & {
  type: "equation";
  equation: {
    expression: string;
  };
};

// TODO: complete type
export type RichTextMention = _RichText & {
  type: "mention";
  mention: {
    type: string;
    [key: string]: unknown;
  };
};

export type RichTextText = _RichText & {
  type: "text";
  text: {
    content: string;
    link?: string;
  };
};

export type RichText = RichTextEquation | RichTextMention | RichTextText;

export type OptionColor =
  | "default"
  | "blue"
  | "brown"
  | "gray"
  | "green"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "yellow";

export type TextColor =
  | "default"
  | "blue"
  | "blue_background"
  | "brown"
  | "brown_background"
  | "gray"
  | "gray_background"
  | "green"
  | "green_background"
  | "orange"
  | "orange_background"
  | "pink"
  | "pink_background"
  | "purple"
  | "purple_background"
  | "red"
  | "red_background"
  | "yellow"
  | "yellow_background";

export type Annotations = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: TextColor;
};

export type Page<S extends PropertiesSchema> = {
  object: "page";
  id: string;
  archived: boolean;
  properties: {
    [K in keyof S]: PropertyValue<S[K]>;
  };
};

type UnionKeys<T> = T extends T ? keyof T : never;
// deno-lint-ignore no-explicit-any
type StrictUnionHelper<T, TAll> = T extends any
  ? T & Partial<Record<Exclude<UnionKeys<TAll>, keyof T>, never>>
  : never;

// TODO: explain necessarity of this (hint: union in TypeScript is not XOR)
type StrictUnion<T> = StrictUnionHelper<T, T>;

export type TextFilterCondition = StrictUnion<
  (
    | { equals: string }
    | { does_not_equal: string }
    | { contains: string }
    | { does_not_containt: string }
    | { starts_with: string }
    | { ends_with: string }
    | { is_empty: true }
    | { is_not_empty: true }
  )
>;

export type NumberFilterCondition = StrictUnion<
  (
    | { equals: number }
    | { does_not_equal: number }
    | { greater_than: number }
    | { less_than: number }
    | { greater_than_or_equal_to: number }
    | { less_than_or_equal_to: number }
    | { is_empty: true }
    | { is_not_empty: true }
  )
>;

export type CheckboxFilterCondition = StrictUnion<
  (
    | { equals: true }
    | { does_not_equal: true }
  )
>;

export type SelectFilterCondition = StrictUnion<
  (
    | { equals: string }
    | { does_not_equal: string }
    | { is_empty: true }
    | { is_not_empty: true }
  )
>;

export type MultiSelectFilterCondition = StrictUnion<
  (
    | { contains: string }
    | { does_not_containt: string }
    | { is_empty: true }
    | { is_not_empty: true }
  )
>;

export type Filter<S extends PropertiesSchema> =
  | PropertyFilter<S>
  | CompoundAndFilter<S>
  | CompoundOrFilter<S>;

export type PropertyFilter<S extends PropertiesSchema> = {
  [K in keyof S]:
    & {
      property: K;
    }
    & (
      S[K] extends "title" ? { title: TextFilterCondition }
        : S[K] extends "rich_text" ? { rich_text: TextFilterCondition }
        : S[K] extends "url" ? { url: TextFilterCondition }
        : S[K] extends "number" ? { number: NumberFilterCondition }
        : S[K] extends "checkbox" ? { checkbox: CheckboxFilterCondition }
        : S[K] extends "select" ? { select: SelectFilterCondition }
        : S[K] extends "multi_select" ? { multi_select: MultiSelectFilterCondition }
        : never
    );
}[keyof S];

export type CompoundAndFilter<S extends PropertiesSchema> = {
  and: Filter<S>[];
};

export type CompoundOrFilter<S extends PropertiesSchema> = {
  or: Filter<S>[];
};
