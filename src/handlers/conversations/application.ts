import { Composer, NextFunction } from "grammy";
import { createConversation } from "grammy-conversations";
import type { Cnv, Ctx } from "@/types.ts";
import { o12t } from "@/plugins/o12t.ts";
import { i18nMiddleware } from "@/plugins/i18n.ts";
import { escapeHtml } from "@/utils/html.ts";
import { parseBotCommand } from "@/utils/parsing.ts";
import { Options } from "@/forms/questions/multi-select.ts";
import { type DepartmentId, departmentsIds, departmentsInfo } from "@/departments.ts";
import {
  Question,
  QuestionMultiSelect,
  QuestionOpen,
  QuestionSelect,
} from "@/forms/questions/index.ts";

const cnvId = "candidate-application";
const msg = (id: string) => `cnv_${cnvId}.${id}`;

const flowQuestions = {
  begin: new QuestionSelect({
    msgId: msg("begin"),
    optionsKeyboard: [["begin", "cancel"]],
    getOptionLabel: (opt, ctx) =>
      opt === "begin" ? ctx.t(msg("btn_begin-go")) : ctx.t(msg("btn_begin-cancel")),
    printSelectedOption: false,
  }),
  continue: new QuestionSelect({
    msgId: msg("begin-returned"),
    optionsKeyboard: [["continue", "cancel"]],
    getOptionLabel: (opt, ctx) =>
      opt === "continue" ? ctx.t(msg("btn_begin-go")) : ctx.t(msg("btn_begin-cancel")),
    printSelectedOption: false,
  }),
  name: new QuestionOpen({ msgId: msg("q-name"), maxSize: 100 }),
  selectDepartments: new QuestionMultiSelect({
    msgId: msg("q-select-departments"),
    optionsKeyboard: [
      ["tech", "design"],
      ["media", "management"],
    ] as DepartmentId[][],
    getOptionLabel: (opt) => departmentsInfo[opt].displayName,
    min: 1,
    selectAtLeastTextPosition: "message",
  }),
  readyForDepartmentQuestions: new QuestionSelect({
    msgId: msg("departments-selected"),
    optionsKeyboard: [["okay"]],
    getOptionLabel: (_, ctx) => ctx.t("ok"),
    printSelectedOption: false,
    getMessageOptions: (cnv) => ({
      deps: (cnv.session.candidateCnv.application.selectedDepartments ?? []).map((d) =>
        departmentsInfo[d].displayName
      ).join(", "),
      n: cnv.session.candidateCnv.application.selectedDepartments?.length ?? 0,
    }),
  }),
  confirmSubmission: new QuestionSelect({
    msgId: msg("summary"),
    optionsKeyboard: [["submit", "review"]],
    getOptionLabel: (opt, ctx) =>
      opt === "submit"
        ? ctx.t(msg("btn_submit-application"))
        : ctx.t(msg("btn_review-application")),
    printSelectedOption: false,
    getMessageOptions: (cnv, ctx) => {
      const application = cnv.session.candidateCnv.application;
      return {
        application: renderApplicationForReview(application, ctx),
      };
    },
  }),
};

const beforeDepartmentsQuestions: Question[] = [
  new QuestionOpen({ msgId: msg("q-skills") }),
];
const afterDepartmentsQuestions: Question[] = [
  new QuestionOpen({ msgId: msg("q-motivation") }),
  new QuestionSelect({
    msgId: msg("q-time-to-spend"),
    optionsKeyboard: [
      ["hours-per-week-1-5"],
      ["hours-per-week-5-10"],
      ["hours-per-week-10-plus"],
    ],
    getOptionLabel: (opt, ctx) => ctx.t(msg(opt)),
  }),
  new QuestionOpen({ msgId: msg("q-deadlines"), maxSize: 500 }),
  new QuestionOpen({ msgId: msg("q-portfolio"), maxSize: 500 }),
  new QuestionOpen({ msgId: msg("q-learnt-from"), maxSize: 300 }),
];

const departmentsQuestions: Record<DepartmentId, Question[]> = {
  tech: [
    new QuestionOpen({ msgId: "q-tech-1" }),
    new QuestionOpen({ msgId: "q-tech-2" }),
    new QuestionOpen({ msgId: "q-tech-3" }),
    new QuestionOpen({ msgId: "q-tech-4", maxSize: 100 }),
  ],
  design: [
    new QuestionMultiSelect({
      msgId: "q-design-1",
      optionsKeyboard: [
        ["ux-ui", "web"],
        ["art", "vector"],
        ["smm", "photo"],
      ],
    }),
    new QuestionOpen({ msgId: "q-design-2", maxSize: 300 }),
    new QuestionOpen({ msgId: "q-design-3" }),
  ],
  media: [
    new QuestionOpen({ msgId: "q-media-1", maxSize: 300 }),
    new QuestionOpen({ msgId: "q-media-2" }),
    new QuestionOpen({ msgId: "q-media-3" }),
  ],
  management: [
    new QuestionOpen({ msgId: "q-management-1" }),
    new QuestionOpen({ msgId: "q-management-2" }),
    new QuestionOpen({ msgId: "q-management-3" }),
    new QuestionOpen({ msgId: "q-management-4" }),
    new QuestionOpen({ msgId: "q-management-5" }),
  ],
};

type Answer = string | Options;

export interface SessionData {
  /**
   * Whether the user confirmed beginning of the conversation.
   */
  begun: boolean;

  /**
   * Current (last saved) step of the conversation.
   */
  currentStep: CandidateApplicationStep;

  /**
   * Timestamp in the ISO format of the moment,
   * when application was successfully submitted last time.
   */
  submittedAt: string | null;

  /**
   * Whether the user confirmed that he is ready to answer department questions.
   */
  readyForDepartmentsQuestions: boolean;

  /**
   * Whether the user finished answering department questions.
   */
  answeredDepartmentsQuestions: boolean;

  /**
   * Current state of the application in the intermediate form.
   */
  application: {
    name?: string;
    selectedDepartments?: DepartmentId[];
    beforeDepartmentsQa: (Answer | undefined)[];
    departmentsQa: {
      [D in DepartmentId]?: (Answer | undefined)[];
    };
    afterDepartmentsQa: (Answer | undefined)[];
  };

  /**
   * Flag used as "hack" to undo within the conversation.
   * TODO: avoid using this, if possible.
   */
  undoing: boolean;
}

export function getInitialSessionData(): SessionData {
  return {
    begun: false,
    currentStep: { name: "beginning" },
    submittedAt: null,
    readyForDepartmentsQuestions: false,
    answeredDepartmentsQuestions: false,
    application: {
      beforeDepartmentsQa: [],
      departmentsQa: {},
      afterDepartmentsQa: [],
    },
    undoing: false,
  };
}

export interface CandidateApplication {
  telegramId: number;
  telegramUsername: string;
  name: string;
  generalQa: [string, string][];
  selectedDepartments: DepartmentId[];
  departmentsQa: {
    [D in DepartmentId]?: [string, string][];
  };
}

export type CandidateApplicationSubmitter = (
  application: CandidateApplication,
) => Promise<void>;

interface Step {
  name: string;
}

type StepDefinition<S extends Step, C extends S> = {
  handler: (cnv: Cnv, ctx: Ctx, step: C) => Promise<S | void | null>;
  prev?: (step: C, data: SessionData) => S | null;
};

type StepsDefinition<S extends Step> = {
  [I in S["name"]]: StepDefinition<S, Extract<S, { name: I }>>;
};

const steps: StepsDefinition<CandidateApplicationStep> = {
  "beginning": {
    handler: async (cnv, ctx) => {
      const alreadyBegun = cnv.session.candidateCnv.begun;
      const answer = await (
        alreadyBegun ? flowQuestions.continue : flowQuestions.begin
      ).ask(cnv, ctx);

      switch (answer) {
        case "begin":
        case "continue":
          if (!alreadyBegun) {
            cnv.session.candidateCnv.begun = true;
          }
          return { name: "name" };
        case "cancel":
          await ctx.reply(ctx.t(msg("begin-cancelled")));
          return null;
        default:
          return switchCaseGuard(answer);
      }
    },
  },
  "name": {
    handler: async (cnv, ctx) => {
      const saved = cnv.session.candidateCnv.application.name;
      const name = await flowQuestions.name.ask(cnv, ctx, { old: saved });
      cnv.session.candidateCnv.application.name = name;
      return ({ name: "before-departments-questions", questionIndex: 0 });
    },
  },
  "before-departments-questions": {
    handler: async (cnv, ctx, { questionIndex }) => {
      if (questionIndex < 0) {
        return { name: "name" };
      } else if (questionIndex >= beforeDepartmentsQuestions.length) {
        return { name: "selecting-departments" };
      }
      const saved =
        cnv.session.candidateCnv.application.beforeDepartmentsQa[questionIndex];
      const answer = await beforeDepartmentsQuestions[questionIndex].ask(
        cnv,
        ctx,
        // deno-lint-ignore no-explicit-any
        { old: saved as (any | undefined) },
      );
      const updated = cnv.session.candidateCnv.application.beforeDepartmentsQa;
      while (updated.length <= questionIndex) {
        updated.push(undefined);
      }
      updated[questionIndex] = answer;

      cnv.session.candidateCnv.application.beforeDepartmentsQa = updated;

      return ({
        name: "before-departments-questions",
        questionIndex: questionIndex + 1,
      });
    },
    prev: ({ questionIndex }) => {
      return questionIndex <= 0
        ? { name: "name" }
        : { name: "before-departments-questions", questionIndex: questionIndex - 1 };
    },
  },
  "selecting-departments": {
    handler: async (cnv, ctx) => {
      const saved = cnv.session.candidateCnv.application.selectedDepartments;
      const selected = await flowQuestions.selectDepartments.ask(
        cnv,
        ctx,
        { old: saved },
      );
      cnv.session.candidateCnv.application.selectedDepartments = selected;
      if (cnv.session.candidateCnv.readyForDepartmentsQuestions) {
        return {
          name: "departments-questions",
          department: departmentsIds.find((d) => selected.includes(d))!,
          questionIndex: 0,
        };
      } else {
        return { name: "departments-questions-preparing" };
      }
    },
    prev: () => ({
      name: "before-departments-questions",
      questionIndex: beforeDepartmentsQuestions.length - 1,
    }),
  },
  "departments-questions-preparing": {
    handler: async (cnv, ctx) => {
      const selected = cnv.session.candidateCnv.application.selectedDepartments;
      if (!selected) {
        return { name: "selecting-departments" };
      }
      if (cnv.session.candidateCnv.readyForDepartmentsQuestions) {
        return {
          name: "departments-questions",
          department: departmentsIds.find((d) => selected.includes(d))!,
          questionIndex: 0,
        };
      } else {
        await flowQuestions.readyForDepartmentQuestions.ask(cnv, ctx);
        cnv.session.candidateCnv.readyForDepartmentsQuestions = true;
        // re-enter this state, so "if" will be executed
        return { name: "departments-questions-preparing" };
      }
    },
    prev: () => ({ name: "selecting-departments" }),
  },
  "departments-questions": {
    handler: async (cnv, ctx, { department, questionIndex }) => {
      const application = cnv.session.candidateCnv.application;

      if (!application.selectedDepartments) {
        return { name: "selecting-departments" };
      }

      let nextDepartment: DepartmentId | null = null;
      const departmentIndex = departmentsIds.findIndex((d) => d === department);
      if (departmentIndex < 0 || departmentIndex >= departmentsIds.length - 1) {
        nextDepartment = null;
      } else {
        for (let i = departmentIndex + 1; i < departmentsIds.length; i++) {
          const depI = departmentsIds[i];
          if (application.selectedDepartments.includes(depI)) {
            nextDepartment = depI;
            break;
          }
        }
        // else nextDepartment is null
      }

      if (questionIndex < 0) {
        questionIndex = 0;
      }

      const depQuestionsCount = departmentsQuestions[department].length;

      let nextStep: CandidateApplicationStep;
      if (questionIndex >= depQuestionsCount - 1) {
        if (nextDepartment !== null) {
          nextStep = {
            name: "departments-questions",
            department: nextDepartment,
            questionIndex: 0,
          };
        } else {
          nextStep = { name: "departments-questions-done" };
        }
      } else {
        nextStep = {
          name: "departments-questions",
          department: department,
          questionIndex: questionIndex + 1,
        };
      }

      if (questionIndex >= depQuestionsCount) {
        return nextStep;
      }

      const question = departmentsQuestions[department][questionIndex];

      const allSaved = application.departmentsQa[department] ?? [];

      // deno-lint-ignore no-explicit-any
      const saved: any | undefined = allSaved[questionIndex];

      const answer = await question.ask(cnv, ctx, {
        header: ctx.t(msg("department-question-header"), {
          dep: departmentsInfo[department].displayName,
          qNo: (questionIndex + 1).toString(),
          total: depQuestionsCount,
        }),
        old: saved,
      });

      while (allSaved.length < depQuestionsCount) {
        allSaved.push(undefined);
      }

      allSaved[questionIndex] = answer;

      cnv.session.candidateCnv.application.departmentsQa[department] = allSaved;
      return nextStep;
    },
    prev: ({ department, questionIndex }, { application }) => {
      if (!application.selectedDepartments) {
        return { name: "selecting-departments" };
      }
      if (questionIndex > 0) {
        return {
          name: "departments-questions",
          department: department,
          questionIndex: questionIndex - 1,
        };
      }

      // first question of the department -> go to the previous

      const departmentIndex = departmentsIds.findIndex((d) => d === department);
      for (let i = departmentIndex - 1; i >= 0; i--) {
        const iDep = departmentsIds[i];
        if (application.selectedDepartments.includes(iDep)) {
          return {
            name: "departments-questions",
            department: iDep,
            questionIndex: departmentsQuestions[iDep].length - 1,
          };
        }
      }
      return { name: "selecting-departments" };
    },
  },
  "departments-questions-done": {
    handler: async (cnv, ctx) => {
      if (!cnv.session.candidateCnv.answeredDepartmentsQuestions) {
        cnv.session.candidateCnv.answeredDepartmentsQuestions = true;
        await ctx.reply(ctx.t(msg("almost-done-after-departments-questions"), {
          questionsRemain: afterDepartmentsQuestions.length,
        }));
      }
      return { name: "after-departments-questions", questionIndex: 0 };
    },
    // /undo shouldn't be the case
  },
  "after-departments-questions": {
    handler: async (cnv, ctx, { questionIndex }) => {
      if (questionIndex < 0) {
        // Go to the last departments questions
        const selected = cnv.session.candidateCnv.application.selectedDepartments ?? [];
        const lastDep = selected[selected.length - 1];
        if (!lastDep) {
          return null;
        }
        const depQuestions = departmentsQuestions[lastDep];
        const lastQuestionI = depQuestions.length - 1;
        if (!depQuestions[lastQuestionI]) {
          return null;
        }
        return {
          name: "departments-questions",
          department: lastDep,
          questionIndex: lastQuestionI,
        };
      } else if (questionIndex >= afterDepartmentsQuestions.length) {
        return { name: "confirming-submission" };
      }
      const saved =
        cnv.session.candidateCnv.application.afterDepartmentsQa[questionIndex];
      const answer = await afterDepartmentsQuestions[questionIndex].ask(
        cnv,
        ctx,
        // deno-lint-ignore no-explicit-any
        { old: saved as (any | undefined) },
      );
      const updated = cnv.session.candidateCnv.application.afterDepartmentsQa;
      while (updated.length <= questionIndex) {
        updated.push(undefined);
      }
      updated[questionIndex] = answer;

      cnv.session.candidateCnv.application.afterDepartmentsQa = updated;

      return ({
        name: "after-departments-questions",
        questionIndex: questionIndex + 1,
      });
    },
    prev: ({ questionIndex }) => ({
      name: "after-departments-questions",
      questionIndex: questionIndex - 1,
    }),
  },
  "confirming-submission": {
    handler: async (cnv, ctx) => {
      const answer = await flowQuestions.confirmSubmission.ask(cnv, ctx);
      switch (answer) {
        case "submit": {
          const data = cnv.session.candidateCnv.application;
          const qa1 = beforeDepartmentsQuestions.map((q, i) => {
            // deno-lint-ignore no-explicit-any
            const a = data.beforeDepartmentsQa[i] as any | undefined;
            return [
              ctx.t(q.msgId),
              a == null ? "—" : q.stringifyAnswer(a, ctx),
            ] as [string, string];
          });
          const qa2 = afterDepartmentsQuestions.map((q, i) => {
            // deno-lint-ignore no-explicit-any
            const a = data.afterDepartmentsQa[i] as any | undefined;
            return [
              ctx.t(q.msgId),
              a == null ? "—" : q.stringifyAnswer(a, ctx),
            ] as [string, string];
          });
          const application: CandidateApplication = {
            telegramId: ctx.from?.id ?? -1,
            telegramUsername: ctx.from?.username ?? "",
            name: data.name ?? "—",
            generalQa: [...qa1, ...qa2],
            selectedDepartments: data.selectedDepartments ?? [],
            departmentsQa: convertDepartmentsQa(data.departmentsQa, ctx),
          };
          const submitted = await cnv.external(async () => {
            return await submitCandidateApplication(application);
          });
          let finalMsg;
          if (submitted) {
            finalMsg = msg("submitted");
            cnv.session.candidateCnv.submittedAt = new Date().toISOString();
          } else {
            finalMsg = msg("submission-error");
          }
          await ctx.reply(ctx.t(finalMsg), { reply_markup: { remove_keyboard: true } });
          return null;
        }
        case "review":
          return { name: "name" };
        default:
          return switchCaseGuard(answer);
      }
    },
    prev: () => ({
      name: "after-departments-questions",
      questionIndex: afterDepartmentsQuestions.length - 1,
    }),
  },
};

type CandidateApplicationStep =
  | { name: "beginning" }
  | { name: "name" }
  | { name: "before-departments-questions"; questionIndex: number }
  | { name: "selecting-departments" }
  | { name: "departments-questions-preparing" }
  | {
    name: "departments-questions";
    department: DepartmentId;
    questionIndex: number;
  }
  | { name: "departments-questions-done" }
  | { name: "after-departments-questions"; questionIndex: number }
  | { name: "confirming-submission" };

export const conversationComposer = new Composer<Ctx>();

const inConversationComposer = conversationComposer.filter(
  async (ctx) => (cnvId in await ctx.conversation.active()),
);

inConversationComposer.command("apply", async (ctx) => {
  await ctx.reply(ctx.t(msg("already-applying")));
});

inConversationComposer.command(["pause", "cancel", "stop", "exit"], async (ctx) => {
  await ctx.reply(ctx.t(msg("stopped-answers-saved")), {
    reply_markup: { remove_keyboard: true },
  });
  await ctx.conversation.exit(cnvId);
  ctx.session.candidateCnv.currentStep = { name: "beginning" };
});

inConversationComposer.command(["undo", "back"], async (ctx, next) => {
  const current = ctx.session.candidateCnv.currentStep;

  const previous = steps[current.name].prev?.(
    current as never, // TODO: fix typing :/
    ctx.session.candidateCnv,
  );
  if (!previous) {
    await ctx.reply(ctx.t(msg("cannot-go-back")));
  } else {
    ctx.session.candidateCnv.currentStep = previous;
    ctx.session.candidateCnv.undoing = true;
    await next();
  }
});

// handle other commands during the conversations in a special way
// to not confuse a user by saving commands as question answers
inConversationComposer.on("::bot_command", async (ctx, next) => {
  if (ctx.session.candidateCnv.undoing) {
    // skip while undoing
    return await next();
  }

  const [command] = parseBotCommand(ctx.msg.text ?? "") ?? [null];
  if (!command || command === "keep") {
    // not a command, or a /keep command — pass into the conversation
    await next();
    return;
  }

  await ctx.reply(ctx.t(msg("cannot-use-command")));
});

conversationComposer.errorBoundary(
  async (error) => {
    console.error([
      "┏━━┫ ERROR ━ candidate application conversation ┣━━┓",
      "┣━━ Message ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫",
      `┃ ${error.message}`,
      "┣━━ Error ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫",
      `┃ ${error.error}`,
      "┣━━ Stack ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫",
      `┃ ${error.stack}`,
      "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛",
    ].join("\n"));
    await error.ctx.reply(
      error.ctx.t(msg("error")),
      { reply_markup: { remove_keyboard: true } },
    );
  },
  createConversation(conversationBuilder, cnvId),
);

conversationComposer.command(["undo", "back"], async (ctx, next) => {
  if (ctx.session.candidateCnv.undoing) {
    ctx.session.candidateCnv.undoing = false;
    return await ctx.conversation.reenter(cnvId);
  }
  await next();
});

conversationComposer.command("apply", async (ctx, next) => {
  return await beginApplicationConversation(ctx, next);
});

conversationComposer.callbackQuery("apply", async (ctx, next) => {
  await ctx.answerCallbackQuery(ctx.t("wait-a-second"));
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  } catch (err) {
    console.error("failed to close keyboard", err);
  }
  return await beginApplicationConversation(ctx, next);
});

async function beginApplicationConversation(ctx: Ctx, next: NextFunction) {
  if (cnvId in await ctx.conversation.active()) {
    return await next();
  }

  const member = await ctx.o12t.member();
  if (member) {
    if (member.isActive) {
      await ctx.reply(ctx.t(msg("already-member")));
    } else {
      // ignore inactive members
      await next();
    }
    return;
  }

  const candidate = await ctx.o12t.candidate();
  if (candidate) {
    await ctx.reply(ctx.t(msg("already-applied")));
    return;
  }

  await ctx.conversation.enter(cnvId);
}

async function conversationBuilder(cnv: Cnv, ctx: Ctx) {
  await cnv.run(i18nMiddleware);
  let step: CandidateApplicationStep | null = cnv.session.candidateCnv.currentStep;
  while (step !== null) {
    if (cnv.session.candidateCnv.undoing) {
      return;
    }
    cnv.session.candidateCnv.currentStep = step;
    step = await steps[step.name].handler(cnv, ctx, step as never) ?? null;
  }
}

function switchCaseGuard(c: never): never {
  throw new Error(`unknown case: ${c}`);
}

function convertDepartmentsQa(
  qa: SessionData["application"]["departmentsQa"],
  ctx: Ctx,
): {
  [D in DepartmentId]?: [string, string][];
} {
  if (qa === undefined) {
    return {};
  }
  return Object.fromEntries(
    departmentsIds
      .filter((id) => ((qa[id]?.length) ?? 0) > 0)
      .map((id) => {
        const questions = departmentsQuestions[id];
        const answers: [string, string][] = questions.map((q, i) => {
          const title = ctx.t(q.msgId);
          const rawAnswer = qa[id]?.[i];
          const answer = rawAnswer == null ? "—" : q.stringifyAnswer(
            // rely on the fact that the order of saved answers
            // match the order of questions in each department
            // deno-lint-ignore no-explicit-any
            rawAnswer as any,
            ctx,
          );
          return [title, answer];
        });
        return [id, answers];
      }),
  );
}

function renderApplicationForReview(
  application: SessionData["application"],
  ctx: Ctx,
): string {
  // Filter Q&As only for selected departments
  const depsQa = Object.keys(application.departmentsQa)
    .filter((key) =>
      (application.selectedDepartments ?? []).includes(key as DepartmentId)
    )
    .reduce((obj, key) => {
      obj[key as DepartmentId] = application.departmentsQa[key as DepartmentId];
      return obj;
    }, {} as SessionData["application"]["departmentsQa"]);

  const strAns = (s: string | null | undefined) => {
    let out;
    if (s == null) {
      out = "—";
    } else {
      out = escapeHtml(s);
      // TODO: it may contain HTML escape sequence like "&amp;"
      //       and therefore will be cutted improperly
      if (out.length > 110) {
        out = out.slice(0, 50) + "<tg-spoiler>………</tg-spoiler>" +
          out.slice(-50);
      }
    }
    return `&gt; <i>${out}</i>`;
  };

  let parts: string[] = [];

  // Name
  parts.push(
    `<b>${ctx.t(flowQuestions.name.msgId)}</b>\n${strAns(application.name)}`,
  );

  // Before departments Q&A
  parts = parts.concat(beforeDepartmentsQuestions.map((q, i) => {
    const answer = application.beforeDepartmentsQa[i];
    const qStr = ctx.t(q.msgId);
    const a = answer == null ? null : q.stringifyAnswer(
      // deno-lint-ignore no-explicit-any
      answer as any,
      ctx,
    );

    return `<b>${qStr}</b>\n${strAns(a)}`;
  }));

  parts.push(`<b>${ctx.t("departments-qa")}</b>`);

  // Departments Q&A
  for (const [id_, answers] of Object.entries(depsQa)) {
    const id = id_ as DepartmentId;
    const depName = departmentsInfo[id].displayName;
    parts = parts.concat(departmentsQuestions[id].map((q, i) => {
      const answer = answers[i];
      const qStr = ctx.t(q.msgId);
      const a = answer == null ? null : q.stringifyAnswer(
        // deno-lint-ignore no-explicit-any
        answer as any,
        ctx,
      );

      return `<b>${depName} — ${i + 1}. ${qStr}</b>\n${strAns(a)}`;
    }));
  }

  // After departments Q&A
  parts = parts.concat(afterDepartmentsQuestions.map((q, i) => {
    const answer = application.afterDepartmentsQa[i];
    const qStr = ctx.t(q.msgId);
    const a = answer == null ? null : q.stringifyAnswer(
      // deno-lint-ignore no-explicit-any
      answer as any,
      ctx,
    );

    return `<b>${qStr}</b>\n${strAns(a)}`;
  }));

  return parts.join("\n\n");
}

const submitters: CandidateApplicationSubmitter[] = [
  o12t.addCandidate.bind(o12t),
];

/**
 * Submit candidate application by all registered submitters.
 *
 * @param application Filled candidate application to submit.
 * @returns `true` if application was submitted successfully by some submitter,
 *  `false` if all submitters failed.
 */
async function submitCandidateApplication(
  application: CandidateApplication,
): Promise<boolean> {
  console.log(
    `submitting application by ${submitters.length} submitters:`,
    application,
  );
  let someSucceeded = false;
  for (let i = 0; i < submitters.length; i++) {
    const submitter = submitters[i];
    try {
      await submitter(application);
      someSucceeded = true;
    } catch (err) {
      console.error(`ERROR submitting application by submitter #${i + 1}`, err);
    }
  }
  return someSucceeded;
}
