import { assertEquals } from "testing";
import {
  buildApplicationBlocks,
  formatQaBlock,
  packMessages,
} from "@/utils/application-message.ts";

Deno.test("formatQaBlock wraps answer as blockquote", () => {
  assertEquals(
    formatQaBlock("Age?", "18"),
    "Age?\n<blockquote>18</blockquote>",
  );
});

Deno.test("packMessages keeps Q&A blocks intact under the limit", () => {
  const blocks = [
    formatQaBlock("Q1", "A1"),
    formatQaBlock("Q2", "A2"),
    formatQaBlock("Q3", "A3"),
  ];
  const messages = packMessages("Header:\n\n", blocks, 4000);
  assertEquals(messages.length, 1);
  assertEquals(
    messages[0],
    ["Header:\n\n" + blocks[0], blocks[1], blocks[2]].join("\n\n"),
  );
});

Deno.test("packMessages splits between blocks when over the limit", () => {
  const b1 = formatQaBlock("Q1", "x".repeat(50));
  const b2 = formatQaBlock("Q2", "y".repeat(50));
  const b3 = formatQaBlock("Q3", "z".repeat(50));
  const maxLen = ("Title:\n\n" + b1 + "\n\n" + b2).length + 10;
  const messages = packMessages("Title:\n\n", [b1, b2, b3], maxLen);

  assertEquals(messages.length, 2);
  assertEquals(messages[0], `Title:\n\n${b1}\n\n${b2}`);
  assertEquals(messages[1], b3);
});

Deno.test("buildApplicationBlocks keeps section title with first dept QA", () => {
  const blocks = buildApplicationBlocks({
    nameQa: ["Name", "Ada"],
    beforeDepartmentsQa: [["Age?", "20"]],
    departmentsQaSectionTitle: "Departments Q&amp;A",
    departmentsQa: [{
      departmentName: "Tech",
      qa: [["Skills?", "TS"], ["Proud of?", "bots"]],
    }],
    afterDepartmentsQa: [["Links?", "github.com/a"]],
  });

  assertEquals(blocks[0], formatQaBlock("Name", "Ada"));
  assertEquals(blocks[1], formatQaBlock("Age?", "20"));
  assertEquals(
    blocks[2],
    `<b>Departments Q&amp;A</b>\n\n${formatQaBlock("Tech — 1. Skills?", "TS")}`,
  );
  assertEquals(blocks[3], formatQaBlock("Tech — 2. Proud of?", "bots"));
  assertEquals(blocks[4], formatQaBlock("Links?", "github.com/a"));
});
