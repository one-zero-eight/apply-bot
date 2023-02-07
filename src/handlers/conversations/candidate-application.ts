/**
 * Questions:
 * 1) Full name
 * 2) Skills, bio
 * 3) Select interested deps
 * 4) For each dep ask about skills
 * 5) Why do u want to us?
 * 6) Where did u learn about 108? (optional)
 *
 * Steps:
 * 1) /apply
 * 2) Ask
 * 3) Confirm / edit
 * 4) Save to Notion
 */
import { Composer, Keyboard } from "grammy";
import { createConversation } from "grammy-conversations";
import { Menu } from "grammy-menu";
import { i18nMiddleware } from "@/plugins/i18n.ts";
import type { Cnv, Ctx } from "@/types.ts";
import {
  DepartmentId,
  DepartmentQuestion,
  DepartmentQuestionSelect,
  DEPS,
  DEPS_IDS,
} from "@/departments.ts";

export interface CandidateApplicationData {
  fullName: string | null;
  skills: string | null;
  departmentsChoice: {
    selected: { [D in DepartmentId]?: boolean };
    finished: boolean;
  };
  departmentQuestions: {
    [D in DepartmentId]?: { [Q: string]: string };
  };
}

export const CONVERSATION_ID = "candidate-application";

const departmentsMenu = generateDepartmentsChoiceMenu();

export const composer = new Composer<Ctx>();

composer.command(["cancel", "stop"], async (ctx) => {
  if (CONVERSATION_ID in await ctx.conversation.active()) {
    await ctx.reply(ctx.t("conversation-canceled"));
    await ctx.conversation.exit(CONVERSATION_ID);
  }
});

composer.errorBoundary(
  (err) => {
    console.error("Error in candidate conversation: ", err.error);
  },
  createConversation(candidateApplication, CONVERSATION_ID),
);

composer.command("apply", async (ctx) => {
  await ctx.reply(ctx.t("application-cnv.start"));
  await ctx.conversation.enter(CONVERSATION_ID);
});

async function candidateApplication(cnv: Cnv, ctx: Ctx) {
  await cnv.run(i18nMiddleware);
  await cnv.run(departmentsMenu);

  if (!cnv.session.application.fullName) {
    const fullName = await askForFullName(cnv, ctx);
    cnv.session.application.fullName = fullName;
  }

  await askAboutDepartments(cnv, ctx);

  console.log(cnv.session.application);
}

async function askForFullName(cnv: Cnv, ctx: Ctx): Promise<string> {
  await ctx.reply(ctx.t("application-cnv.ask-full-name"));
  const fullName = parseFullName(await cnv.form.text());
  if (!fullName) {
    await ctx.reply(ctx.t("application-cnv.ask-full-name-invalid"));
    await cnv.skip();
  }
  // unreachable
  return fullName ?? "<blank>";
}
// async function askForBio(cnv: Cnv, ctx: Ctx): Promise<string> {}
async function askAboutDepartments(cnv: Cnv, ctx: Ctx): Promise<void> {
  if (!cnv.session.application.departmentsChoice.finished) {
    await ctx.reply(ctx.t("select_departments"), {
      reply_markup: departmentsMenu,
    });
  }
  await cnv.waitUntil((ctx) => ctx.session.application.departmentsChoice.finished);

  for (const depId of DEPS_IDS) {
    if (cnv.session.application.departmentsChoice.selected[depId]) {
      cnv.log(`Asking questions for ${depId}`);

      const dep = DEPS[depId];
      const questions = dep.questions;

      for (const question of questions) {
        if (cnv.session.application.departmentQuestions[depId]?.[question.id]) {
          continue;
        }

        const answer = await askDepartmentQuestion(cnv, ctx, question);
        const currentAnswers = cnv.session.application.departmentQuestions[depId];
        cnv.session.application.departmentQuestions[depId] = {
          ...currentAnswers,
          [question.id]: answer,
        };
      }
    }
  }
}
// async function askForMotivation(cnv: Cnv, ctx: Ctx): Promise<string> {}
// async function askWhereKnew(cnv: Cnv, ctx: Ctx): Promise<string> {}
async function askDepartmentQuestion(
  cnv: Cnv,
  ctx: Ctx,
  question: DepartmentQuestion,
): Promise<string> {
  switch (question.type) {
    case "select":
      return await askDepartmentQuestionSelect(cnv, ctx, question);
    default:
      throw new Error("Unknown question type");
  }
}

async function askDepartmentQuestionSelect(
  cnv: Cnv,
  ctx: Ctx,
  question: DepartmentQuestionSelect,
): Promise<string> {
  await sendSelectOptionsMessage(ctx, question.optionIds);
  const option = await cnv.form.select([
    ...question.optionIds.map((id) => ctx.t(`option-${id}`)),
    ...question.optionIds.map((_, i) => `/${i + 1}`),
  ], async (ctx) => {
    console.log("OTHERWISE");
    await sendSelectOptionsMessage(ctx, question.optionIds);
  });

  if (option.startsWith("/")) {
    const num = parseInt(option.slice(1));
    if (!isNaN(num) && num >= 1 && num <= question.optionIds.length) {
      return question.optionIds[num - 1];
    }
  }

  return option;
}
async function sendSelectOptionsMessage(
  ctx: Ctx,
  optionIds: string[],
): Promise<void> {
  await ctx.reply(
    ctx.t(
      "select_option",
      { options: generateOptionsList(ctx, optionIds) },
    ),
    { reply_markup: generateOptionsKeyboard(ctx, optionIds) },
  );
}
function generateOptionsList(ctx: Ctx, optionIds: string[]): string {
  return optionIds.map((id, i) => `/${i + 1} ${ctx.t(`option-${id}`)}`).join("\n");
}
function generateOptionsKeyboard(ctx: Ctx, optionIds: string[]): Keyboard {
  const keyboard = new Keyboard();
  for (const id of optionIds) {
    keyboard.text(ctx.t(`option-${id}`));
  }
  return keyboard
    .resized()
    .oneTime();
}

function generateDepartmentsChoiceMenu(): Menu<Ctx> {
  let menu = new Menu<Ctx>("application-deps-choice");

  const depsCount = DEPS_IDS.length;
  const perRow = depsCount % 2 === 0 ? 2 : 3;

  let isLastInRow = false;
  for (let i = 0; i < depsCount; i++) {
    isLastInRow = i % perRow === perRow - 1;
    const depId = DEPS_IDS[i];
    const dep = DEPS[depId];

    menu = menu.text(
      (ctx) => (
        (ctx.session.application.departmentsChoice.selected[depId] ? "✔" : "✘") +
        " " + dep.displayName
      ),
      (ctx) => {
        // deno-fmt-ignore
        ctx.session.application.departmentsChoice.selected[depId] =
        !ctx.session.application.departmentsChoice.selected[depId];
        ctx.menu.update();
      },
    );

    if (isLastInRow) {
      menu = menu.row();
    }
  }

  // add confirmation button

  // make sure it is the only one in the last row
  if (!isLastInRow) {
    menu = menu.row();
  }

  menu = menu.text(
    (ctx) => {
      const atLeastOneSelected = Object.values(
        ctx.session.application.departmentsChoice.selected,
      ).some((v) => !!v);
      // TODO: add translations
      return atLeastOneSelected ? ctx.t("confirm") : ctx.t("select_at_least_one");
    },
    async (ctx) => {
      const atLeastOneSelected = Object.values(
        ctx.session.application.departmentsChoice.selected,
      ).some((v) => !!v);
      if (atLeastOneSelected) {
        ctx.session.application.departmentsChoice.finished = true;
        ctx.menu.close();
        await ctx.reply(ctx.t("departments_selected"));
      }
    },
  );

  return menu;
}

export function parseFullName(maybeFullName: string): string | null {
  // minimize whitespace
  maybeFullName = maybeFullName.trim();
  maybeFullName = maybeFullName.replace(/\s\s+/g, " ");

  if (maybeFullName.match(/^(?:[\p{L}\.\-'",]{2,}\s*)+$/ui)) {
    return maybeFullName;
  }

  return null;
}
