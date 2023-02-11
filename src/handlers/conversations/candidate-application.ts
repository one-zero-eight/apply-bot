import { Composer, Keyboard } from "grammy";
import { createConversation } from "grammy-conversations";
import { Menu } from "grammy-menu";
import { i18nMiddleware } from "@/plugins/i18n.ts";
import { o12tMiddleware } from "@/plugins/o12t.ts";
import type { Cnv, Ctx } from "@/types.ts";
import {
  MultiSelectAnswer,
  QuestionMultiSelect,
  QuestionOpen,
  QuestionSelect,
} from "@/forms/questions/index.ts";
import { selectBtn } from "@/forms/questions/multi-select.ts";
import { DepartmentId, DEPS, DEPS_IDS } from "@/departments.ts";
import { escapeHtml } from "@/utils/html.ts";
import { parseBotCommand, parseFullName } from "@/utils/parsing.ts";

export const CONVERSATION_ID = "candidate-application";

const msg = (id: string) => `${CONVERSATION_ID}-cnv.${id}`;

export interface CandidateApplicationData {
  began: boolean;
  editing: boolean;
  telegramUsername: string | null;
  telegramId: number | null;
  fullName: string | null;
  skills: string | null;
  departmentsChoice: {
    chosen: { [D in DepartmentId]?: boolean };
    finished: boolean;
  };
  departmentQuestions: {
    [D in DepartmentId]?: {
      [Q: string]: string | MultiSelectAnswer;
    };
  };
  motivation: string | null;
  whereKnew: string | null;
  confirmation: "confirm" | "edit" | null;
}

export const getInitialCandidateApplicationData = (): CandidateApplicationData => ({
  began: false,
  editing: false,
  telegramUsername: null,
  telegramId: null,
  fullName: null,
  skills: null,
  departmentsChoice: {
    chosen: {},
    finished: false,
  },
  departmentQuestions: {},
  motivation: null,
  whereKnew: null,
  confirmation: null,
});

const questions = {
  fullName: new QuestionOpen({ msgId: msg("ask-full-name"), parser: parseFullName }),
  skills: new QuestionOpen({ msgId: msg("ask-skills") }),
  motivation: new QuestionOpen({ msgId: msg("ask-motivation") }),
  whereKnew: new QuestionOpen({ msgId: msg("ask-where-knew") }),
};

const departmentsMenu = generateDepartmentsChoiceMenu();
const confirmationMenu = generateConfirmationMenu();
const departmentsQuestionsMenus = Object.values(DEPS).reduce(
  (acc, dep) => [
    ...acc,
    ...dep.questions.reduce((acc, q) => [
      ...acc,
      ...(q instanceof QuestionMultiSelect ? [q.menu] : []),
    ], [] as Menu<Ctx>[]),
  ],
  [] as Menu<Ctx>[],
);
const allMenus = [
  departmentsMenu,
  confirmationMenu,
  ...departmentsQuestionsMenus,
];

const menusComposer = new Composer<Ctx>();
allMenus.forEach((menu) => {
  menusComposer.errorBoundary(
    (err) => {
      console.error(`Error in menu: `, err.error);
    },
    menu,
  );
});

export const composer = new Composer<Ctx>();

// register cancel command before conversation,
// so it will be handled during the conversation too
composer.command(["pause", "cancel", "stop"], async (ctx, next) => {
  if (CONVERSATION_ID in await ctx.conversation.active()) {
    await ctx.reply(ctx.t(msg("canceled")), {
      reply_markup: { remove_keyboard: true },
    });
    await ctx.conversation.exit(CONVERSATION_ID);
  } else {
    await next();
  }
});

composer.on("::bot_command", async (ctx, next) => {
  const inConversation = CONVERSATION_ID in await ctx.conversation.active();
  if (!inConversation) {
    await next();
    return;
  }

  const [command] = parseBotCommand(ctx.msg.text ?? "") ?? [null];
  if (!command || isCommandValidForConversation(command)) {
    await next();
    return;
  }

  await ctx.reply(ctx.t(msg("any-command")));
});

// register conversation with error boundary
composer.errorBoundary(
  async (err) => {
    console.error(`ERROR in conversation "${CONVERSATION_ID}"

Message: ${err.message}

Name: ${err.name}

Stack: ${err.stack}

Error: ${err.error}

--------------------------------------`);
    await err.ctx.reply(
      err.ctx.t(msg("error")),
      { reply_markup: { remove_keyboard: true } },
    );
  },
  createConversation(candidateApplication, CONVERSATION_ID),
);

// register "trigger" command after registering the conversation,
// so it will trigger only if not in the conversation yet
composer.command("apply", async (ctx, next) => {
  // TODO: handle errors of Notion API, since it was written by me...
  const member = await ctx.o12t.member();

  if (member) {
    if (member.isActive) {
      await ctx.reply(ctx.t(msg("already-member")));
    } else {
      await next();
    }
    return;
  } else if (await ctx.o12t.candidate()) {
    await ctx.reply(ctx.t(msg("already-applied")));
    return;
  } else if (ctx.session.application.began) {
    await ctx.reply(ctx.t(msg("continue")));
  } else {
    await ctx.reply(ctx.t(msg("begin")));
  }
  ctx.session.application.editing = false;
  await ctx.conversation.enter(CONVERSATION_ID);
});

/**
 * Candidate application submission conversation builder function.
 */
async function candidateApplication(cnv: Cnv, ctx: Ctx) {
  await cnv.run(i18nMiddleware);
  await cnv.run(o12tMiddleware);
  await cnv.run(menusComposer);

  cnv.session.application.began = true;

  while (true) {
    if (!cnv.session.application.telegramUsername) {
      const telegramUsername = ctx.from?.username ?? null;
      cnv.session.application.telegramUsername = telegramUsername;
    }

    if (!cnv.session.application.telegramId) {
      const telegramId = ctx.from?.id ?? null;
      cnv.session.application.telegramId = telegramId;
    }

    if (!cnv.session.application.fullName) {
      const fullName = await questions.fullName.ask(cnv, ctx);
      cnv.session.application.fullName = fullName;
    } else if (cnv.session.application.editing) {
      const fullName = await questions.fullName.ask(
        cnv,
        ctx,
        { old: cnv.session.application.fullName },
      );
      cnv.session.application.fullName = fullName;
    }

    if (!cnv.session.application.skills) {
      const skills = await questions.skills.ask(cnv, ctx);
      cnv.session.application.skills = skills;
    } else if (cnv.session.application.editing) {
      const skills = await questions.skills.ask(
        cnv,
        ctx,
        { old: cnv.session.application.skills },
      );
      cnv.session.application.skills = skills;
    }

    const askedSomething = await askAboutDepartments(cnv, ctx);

    // say thanks for answering department questions and tell
    // how many questions are left (if not editing)
    if (!cnv.session.application.editing) {
      let finishingText = null;
      if (askedSomething) {
        finishingText = ctx.t(msg("thanks-for-answering-deps-questions"));
      }

      let remainingQuestions = 0;
      if (!cnv.session.application.motivation) remainingQuestions++;
      if (!cnv.session.application.whereKnew) remainingQuestions++;
      if (remainingQuestions > 0) {
        const questinosRemainText = ctx.t(msg("n-questions-remain"), {
          n: remainingQuestions,
        });
        finishingText = finishingText
          ? `${finishingText}\n\n${questinosRemainText}`
          : questinosRemainText;
      }

      if (finishingText) {
        await ctx.reply(finishingText);
      }
    }

    if (!cnv.session.application.motivation) {
      const motivation = await questions.motivation.ask(cnv, ctx);
      cnv.session.application.motivation = motivation;
    } else if (cnv.session.application.editing) {
      const motivation = await questions.motivation.ask(
        cnv,
        ctx,
        { old: cnv.session.application.motivation },
      );
      cnv.session.application.motivation = motivation;
    }

    if (!cnv.session.application.whereKnew) {
      const whereKnew = await questions.whereKnew.ask(cnv, ctx);
      cnv.session.application.whereKnew = whereKnew;
    } else if (cnv.session.application.editing) {
      const whereKnew = await questions.whereKnew.ask(
        cnv,
        ctx,
        { old: cnv.session.application.whereKnew },
      );
      cnv.session.application.whereKnew = whereKnew;
    }

    const confirmed = await confirmApplication(cnv, ctx);

    if (confirmed === "edit") {
      cnv.session.application.editing = true;
    } else {
      break;
    }
  }

  let atLeastOneSucceeded = false;
  for (const consumer of applicationConsumers) {
    try {
      await cnv.external(async () => await consumer(cnv.session.application, ctx));
      atLeastOneSucceeded = true;
    } catch (err) {
      console.error(`ERROR while consuming application: ${err}`);
    }
  }

  const message = atLeastOneSucceeded ? msg("submitted") : msg("submission-error");

  await ctx.reply(ctx.t(message), { reply_markup: { remove_keyboard: true } });
}

async function askAboutDepartments(cnv: Cnv, ctx: Ctx): Promise<boolean> {
  if (
    !cnv.session.application.departmentsChoice.finished ||
    cnv.session.application.editing
  ) {
    cnv.session.application.departmentsChoice.finished = false;

    await ctx.reply(
      ctx.t(msg("choose-departments")),
      { reply_markup: departmentsMenu },
    );

    // wait until user chooses departments and confirms his choice
    await cnv.waitUntil((ctx) => ctx.session.application.departmentsChoice.finished);

    const chosenIds = Object.entries(
      cnv.session.application.departmentsChoice.chosen,
    ).filter(([_, v]) => !!v).map(([k, _]) => k);
    const chosen = chosenIds.map((id) => DEPS[id as DepartmentId].displayName);

    if (!cnv.session.application.editing) {
      await ctx.reply(
        ctx.t(
          msg("deps-chosen"),
          { chosen: chosen.join(", "), n: chosen.length },
        ),
        {
          reply_markup: new Keyboard()
            .text(ctx.t(msg("ok-btn")))
            .oneTime()
            .resized(),
        },
      );
      // wait until user sends some text to confirm that he is ready
      // to start answering departments' questions
      await cnv.form.text();
    } else {
      await ctx.reply(ctx.t(msg("deps-chosen-short"), { chosen: chosen.join(", ") }));
    }
  }

  let askedSomething = false;
  for (const depId of DEPS_IDS) {
    if (cnv.session.application.departmentsChoice.chosen[depId]) {
      const dep = DEPS[depId];
      const questions = dep.questions;

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        if (
          !cnv.session.application.editing &&
          cnv.session.application.departmentQuestions[depId]?.[question.msgId]
        ) {
          continue;
        }

        const messageHeader = ctx.t(
          msg("dep-question"),
          {
            qNo: i + 1,
            total: questions.length,
            dep: dep.displayName,
          },
        );

        const currentAnswers = cnv.session.application.departmentQuestions[depId];

        let old, answer;
        if (question instanceof QuestionMultiSelect) {
          old = currentAnswers?.[question.msgId] as MultiSelectAnswer;
          answer = await question.ask(cnv, ctx, { header: messageHeader, old });
        } else {
          old = currentAnswers?.[question.msgId] as string;
          answer = await question.ask(cnv, ctx, { header: messageHeader, old });
        }

        cnv.session.application.departmentQuestions[depId] = {
          ...currentAnswers,
          [question.msgId]: answer,
        };

        askedSomething = true;
      }
    }
  }

  return askedSomething;
}

function generateDepartmentsChoiceMenu(): Menu<Ctx> {
  const menu = new Menu<Ctx>("apply-deps-choice");

  const depsCount = DEPS_IDS.length;
  const perRow = depsCount % 2 === 0 ? 2 : 3;

  let isLastInRow = false;
  for (let i = 0; i < depsCount; i++) {
    isLastInRow = i % perRow === perRow - 1;
    const depId = DEPS_IDS[i];
    const dep = DEPS[depId];

    menu.text(
      (ctx) => (
        selectBtn(
          dep.displayName,
          ctx.session.application.departmentsChoice.chosen[depId] ?? false,
        )
      ),
      (ctx) => {
        if (!ctx.session.application.departmentsChoice.finished) {
          // deno-fmt-ignore
          ctx.session.application.departmentsChoice.chosen[depId] =
          !ctx.session.application.departmentsChoice.chosen[depId];
          ctx.menu.update();
        }
      },
    );

    if (isLastInRow) {
      menu.row();
    }
  }

  // make sure that confirmation button it is on a separate row
  if (!isLastInRow) {
    menu.row();
  }

  menu.text(
    (ctx) => {
      const atLeastOneChoosen = Object.values(
        ctx.session.application.departmentsChoice.chosen,
      ).some((v) => !!v);
      return atLeastOneChoosen
        ? ctx.t(msg("confirm-deps-choice-btn"))
        : ctx.t(msg("choose-at-least-one-dep-btn"));
    },
    (ctx) => {
      const atLeastOneChoosen = Object.values(
        ctx.session.application.departmentsChoice.chosen,
      ).some((v) => !!v);
      if (atLeastOneChoosen) {
        ctx.session.application.departmentsChoice.finished = true;
        ctx.menu.close();
      }
    },
  );

  return menu;
}

function generateConfirmationMenu(): Menu<Ctx> {
  const menu = new Menu<Ctx>("apply-confirm");

  menu.text(
    (ctx) => ctx.t(msg("confirm-apply-btn")),
    (ctx) => {
      ctx.session.application.confirmation = "confirm";
      ctx.menu.close();
    },
  );

  menu.text(
    (ctx) => ctx.t(msg("edit-apply-btn")),
    (ctx) => {
      ctx.session.application.confirmation = "edit";
      ctx.menu.close();
    },
  );

  return menu;
}

async function confirmApplication(cnv: Cnv, ctx: Ctx): Promise<"confirm" | "edit"> {
  const application = cnv.session.application;

  await ctx.reply(
    ctx.t(msg("confirmation"), {
      fullName: escapeHtml(application.fullName ?? "—"),
      skills: escapeHtml(application.skills ?? "—"),
      motivation: escapeHtml(application.motivation ?? "—"),
      whereKnew: escapeHtml(application.whereKnew ?? "—"),
      departments: Object.entries(application.departmentsChoice.chosen)
        .filter(([_, v]) => !!v)
        .map(([id, _]) => DEPS[id as DepartmentId].displayName)
        .join(", "),
    }),
    { reply_markup: confirmationMenu },
  );

  await cnv.waitUntil((ctx) => ctx.session.application.confirmation != null);

  return cnv.session.application.confirmation ?? "confirm";
}

type ApplicationConsumer = (
  application: CandidateApplicationData,
  ctx: Ctx,
) => Promise<void>;

const applicationConsumers: ApplicationConsumer[] = [
  submitApplicationToNotionDb,
];

async function submitApplicationToNotionDb(
  application: CandidateApplicationData,
  ctx: Ctx,
): Promise<void> {
  const answersString = convertApplicationDepartmentsAnswersToString(
    application.departmentQuestions,
    ctx,
  );

  await ctx.o12t.addCandidate({
    fullName: application.fullName ?? "—",
    telegramId: application.telegramId ?? -1,
    telegramUsername: application.telegramUsername ?? "—",
    skills: application.skills ?? "—",
    departments: {
      tech: false,
      design: false,
      media: false,
      management: false,
      ...application.departmentsChoice.chosen,
    },
    answers: answersString,
    motivation: application.motivation ?? "—",
    whereKnew: application.whereKnew ?? "—",
  });
}

function convertApplicationDepartmentsAnswersToString(
  answers: CandidateApplicationData["departmentQuestions"],
  ctx: Ctx,
): string {
  let result = "";

  for (const depId of DEPS_IDS) {
    const dep = DEPS[depId];
    const questions = dep.questions;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      let answer = answers[depId]?.[question.msgId];
      if (answer) {
        if (question instanceof QuestionSelect) {
          answer = question.getOptionText(answer as string, ctx);
        } else if (question instanceof QuestionMultiSelect) {
          answer = question.stringifyAnswer(answer as MultiSelectAnswer, ctx);
        }

        result += `${dep.displayName} Q${i + 1} - ${
          ctx.t(question.msgId)
        }\n${answer}\n\n`;
      }
    }
  }

  return result;
}

function isCommandValidForConversation(command: string): boolean {
  // allow numbers for `QuestionSelect`s
  if (command.match(/^\d+$/)) {
    return true;
  }

  // allow /keep for saving previous answers
  if (command === "keep") {
    return true;
  }

  return false;
}
