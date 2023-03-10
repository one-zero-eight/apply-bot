import { Context, MiddlewareFn } from "grammy";
import { Notion, richTextToString } from "@/notion/notion.ts";
import type { Ctx } from "@/types.ts";
import { config } from "@/config.ts";
import { msFrom } from "@/utils/dates.ts";
import { DepartmentId, departmentsIds, departmentsInfo } from "@/departments.ts";
import { CandidateApplication } from "@/handlers/conversations/application.ts";
import { RichText, RichTextText } from "@/notion/types.ts";

const notionMembersDbSchema = {
  "Active": "checkbox",
  "Name": "title",
  "Languages": "multi_select",
  "Joined": "date",
  "Department": "select",
  "Level": "select",
  "Telegram": "rich_text",
  "Telegram ID": "rich_text",
} as const;

type NotionMembersDbSchema = typeof notionMembersDbSchema;

const notionCandidatesDbSchema = {
  "Name": "title",
  "Status": "status",
  "Common QA": "rich_text",
  "Departments": "multi_select",
  "Departments QA": "rich_text",
  "Telegram": "url",
  "Telegram ID": "rich_text",
} as const;

type NotionCandidatesDbSchema = typeof notionCandidatesDbSchema;

const departmentIdSelectNameMap: Record<DepartmentId, string> = {
  tech: "Tech",
  design: "Design",
  media: "Media",
  management: "Management",
};

export interface Member {
  fullName: string;
  isActive: boolean;
  telegramId?: number;
  level?: string;
  joined?: Date;
  speakingLanguages: string[];
}

export interface Candidate {
  name: string;
  telegramId: number;
  telegramUsername: string;
  commonQa: string;
  departments: { [D in DepartmentId]: boolean };
  departmentsQa: string;
}

export type O12tOptions = {
  notionApiToken: string;
  membersDatabaseId: string;
  candidatesDatabaseId: string;
};

export interface O12tFlavor {
  o12t: {
    getMemberByTelegramId: (telegramId: number) => Promise<Member | null>;
    getCandidateByTelegramId: (telegramId: number) => Promise<Candidate | null>;
    member: () => Promise<Member | null>;
    candidate: () => Promise<Candidate | null>;
    addCandidate: (candidate: CandidateApplication) => Promise<void>;
  };
}

export class CandidateAlreadyExistsError extends Error {
  public readonly type = "candidate-already-exists";
}

export class O12t<C extends Context> {
  private MEMBERS_DB_REFRESH_RATE_MS = 5000;
  private CANDIDATES_DB_REFRESH_RATE_MS = 30000;

  private notion: Notion;
  private membersDatabaseId: string;
  private candidatesDatabaseId: string;
  private membersLastRefreshedAt: Date | null;
  private cachedMembers: Record<number, Member>;
  private candidatesLastRefreshedAt: Date | null;
  private cachedCandidates: Record<number, Candidate>;
  private candidatesFetchingPromise: Promise<Record<number, Candidate>> | null;
  private membersFetchingPromise: Promise<Record<number, Member>> | null;

  constructor(
    { notionApiToken, membersDatabaseId, candidatesDatabaseId }: O12tOptions,
  ) {
    this.notion = new Notion({ integrationApiToken: notionApiToken });
    this.membersDatabaseId = membersDatabaseId;
    this.candidatesDatabaseId = candidatesDatabaseId;
    this.membersLastRefreshedAt = null;
    this.cachedMembers = {};
    this.candidatesLastRefreshedAt = null;
    this.cachedCandidates = {};
    this.candidatesFetchingPromise = null;
    this.membersFetchingPromise = null;
  }

  public async getMemberByTelegramId(telegramId: number): Promise<Member | null> {
    const actualMembers = await this.getActualMembers();
    return actualMembers[telegramId] ?? null;
  }

  public async getCandidateByTelegramId(telegramId: number): Promise<Candidate | null> {
    const actualCandidates = await this.getActualCandidates();
    return actualCandidates[telegramId] ?? null;
  }

  public async addCandidate(application: CandidateApplication): Promise<void> {
    // check if candidate already exists
    const actualCandidates = await this.getActualCandidates();
    if (actualCandidates[application.telegramId]) {
      throw new CandidateAlreadyExistsError(
        `Candidate with Telegram ID ${application.telegramId} already exists.`,
      );
    }
    const departmentsQaFormatted = formatCandidateApplicationDepartmentsQa(
      application.departmentsQa,
    );

    await this.notion.createPage({
      databaseId: this.candidatesDatabaseId,
      properties: {
        "Name": {
          title: [
            {
              text: {
                content: application.name,
              },
            },
          ],
        },
        "Status": {
          status: {
            name: "Not started",
          },
        },
        "Telegram ID": {
          rich_text: [
            {
              text: {
                content: application.telegramId.toString(),
              },
            },
          ],
        },
        "Telegram": {
          url: application.telegramUsername
            ? `t.me/${application.telegramUsername}`
            : "",
        },
        "Common QA": {
          rich_text: formatQa(application.generalQa),
        },
        "Departments": {
          multi_select: application.selectedDepartments
            .map((departmentId) => ({
              name: departmentIdSelectNameMap[departmentId as DepartmentId],
            })),
        },
        "Departments QA": {
          rich_text: departmentsQaFormatted,
        },
        // deno-lint-ignore no-explicit-any
      } as any,
    });

    const candidate: Candidate = {
      name: application.name,
      telegramId: application.telegramId,
      telegramUsername: application.telegramUsername,
      commonQa: application.generalQa.map(([q, a]) => `${q}\n${a}`).join("\n\n"),
      departments: Object.fromEntries(
        departmentsIds.map((d) => [d, application.selectedDepartments.includes(d)]),
      ) as {
        [D in DepartmentId]: boolean;
      },
      departmentsQa: stringifyCandidateApplicationDepartmentsQa(
        application.departmentsQa,
      ),
    };

    // also add in the cache
    this.cachedCandidates[candidate.telegramId] = candidate;
  }

  private getActualMembers(): Promise<Record<number, Member>> {
    if (
      this.membersLastRefreshedAt &&
      msFrom(this.membersLastRefreshedAt) < this.MEMBERS_DB_REFRESH_RATE_MS
    ) {
      return Promise.resolve(this.cachedMembers);
    }

    if (!this.membersFetchingPromise) {
      this.membersFetchingPromise = (async () => {
        try {
          const members = await this.notion.queryDb<NotionMembersDbSchema>({
            databaseId: this.membersDatabaseId,
          });

          const actualMembers: Record<number, Member> = {};

          for (const member of members) {
            let telegramId = Number.parseInt(
              richTextToString(member.properties["Telegram ID"].rich_text),
            );
            if (isNaN(telegramId)) {
              telegramId = 0;
            }
            const joinedDateStr = member.properties["Joined"]?.date?.start;

            actualMembers[telegramId] = {
              fullName: richTextToString(member.properties["Name"].title),
              telegramId: telegramId,
              isActive: member.properties["Active"].checkbox,
              level: member.properties["Level"].select?.name,
              joined: joinedDateStr ? new Date(joinedDateStr) : undefined,
              speakingLanguages: member.properties["Languages"].multi_select.map((
                opt,
              ) => opt.name),
            };
          }

          this.cachedMembers = actualMembers;
          this.membersLastRefreshedAt = new Date();
          return actualMembers;
        } catch (err) {
          console.error("error retrieving members from Notion", err);
          return {};
        } finally {
          this.membersFetchingPromise = null;
        }
      })();
    }

    return this.membersFetchingPromise;
  }

  private getActualCandidates(): Promise<Record<number, Candidate>> {
    if (
      this.candidatesLastRefreshedAt &&
      msFrom(this.candidatesLastRefreshedAt) < this.CANDIDATES_DB_REFRESH_RATE_MS
    ) {
      return Promise.resolve(this.cachedCandidates);
    }

    if (!this.candidatesFetchingPromise) {
      this.candidatesFetchingPromise = (async () => {
        try {
          const candidates = await this.notion.queryDb<
            NotionCandidatesDbSchema
          >({
            databaseId: this.candidatesDatabaseId,
          });

          const actualCandidates: Record<number, Candidate> = {};

          for (const candidate of candidates) {
            let telegramId = Number.parseInt(
              richTextToString(candidate.properties["Telegram ID"].rich_text),
            );
            if (isNaN(telegramId)) {
              telegramId = 0;
            }

            const departmentNames = candidate.properties["Departments"].multi_select
              .map((opt) => opt.name);
            const departmentIds = Object.values(departmentNames).filter((
              [_, option],
            ) => departmentNames.includes(option));
            const departments: Record<DepartmentId, boolean> = {
              tech: false,
              design: false,
              media: false,
              management: false,
            };
            for (const departmentId of departmentIds) {
              departments[departmentId as DepartmentId] = true;
            }

            actualCandidates[telegramId] = {
              telegramId: telegramId,
              telegramUsername: candidate.properties["Telegram"].url,
              name: richTextToString(candidate.properties["Name"].title),
              commonQa: richTextToString(
                candidate.properties["Common QA"].rich_text,
              ),
              departments: departments,
              departmentsQa: richTextToString(
                candidate.properties["Departments QA"].rich_text,
              ),
            };
          }

          this.cachedCandidates = actualCandidates;
          this.candidatesLastRefreshedAt = new Date();
          return actualCandidates;
        } catch (err) {
          console.error("error retrieving candidates from Notion", err);
          return {};
        } finally {
          this.candidatesFetchingPromise = null;
        }
      })();
    }

    return this.candidatesFetchingPromise;
  }

  /** Returns a middleware to .use on the `Bot` instance. */
  middleware(): MiddlewareFn<C & O12tFlavor> {
    const getMember = this.getMemberByTelegramId.bind(this);
    const getCandidate = this.getCandidateByTelegramId.bind(this);
    const addCandidate = this.addCandidate.bind(this);

    return async (ctx, next) => {
      ctx.o12t = {
        getMemberByTelegramId: getMember,
        getCandidateByTelegramId: getCandidate,
        member: async () => {
          if (ctx.from) {
            return await getMember(ctx.from.id);
          }
          return null;
        },
        candidate: async () => {
          if (ctx.from) {
            return await getCandidate(ctx.from.id);
          }
          return null;
        },
        addCandidate: addCandidate,
      };
      await next();
    };
  }
}

function formatCandidateApplicationDepartmentsQa(
  qa: CandidateApplication["departmentsQa"],
): RichText[] {
  return formatQa(
    departmentsIds
      .filter((id) => (qa[id] ?? []).length > 0)
      .reduce((acc, id) => [
        ...acc,
        ...(qa[id]!.map(([q, a], i) =>
          [`${departmentsInfo[id].displayName} Q${i + 1} — ${q}`, a] as [string, string]
        )),
      ], [] as [string, string][]),
  );
}

function formatQa(
  qa: [string, string][],
): RichText[] {
  return qa.reduce((acc, [q, a]) => [
    ...acc,
    {
      type: "text",
      text: { content: q + "\n" },
      annotations: { bold: true },
    } as RichTextText,
    {
      type: "text",
      text: { content: a + "\n\n" },
      annotations: { color: "blue" },
    } as RichTextText,
  ], [] as RichText[]);
}

function stringifyCandidateApplicationDepartmentsQa(
  qa: CandidateApplication["departmentsQa"],
): string {
  const rows: string[] = [];
  for (const dep of departmentsIds) {
    const depQa = qa[dep];
    if (depQa === undefined) {
      continue;
    }
    const depName = departmentsInfo[dep].displayName;
    for (let i = 0; i < depQa.length; i++) {
      const [question, answer] = depQa[i];
      rows.push(`${depName} Q${i + 1} — ${question}`);
      rows.push(answer + "\n");
    }
  }
  return rows.join("\n");
}

// configure plugin
export const o12t = new O12t<Ctx>({
  notionApiToken: config.NOTION_INTEGRATION_TOKEN,
  membersDatabaseId: config.NOTION_MEMBERS_DB_ID,
  candidatesDatabaseId: config.NOTION_CANDIDATES_DB_ID,
});
export const o12tMiddleware = o12t.middleware();
