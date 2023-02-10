import { delay } from "async";
import { Context, MiddlewareFn } from "grammy";
import { Notion, richTextToString } from "@/notion/notion.ts";
import type { Ctx } from "@/types.ts";
import { config } from "@/config.ts";
import { DepartmentId } from "../departments.ts";

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
  "Status": "select",
  "Departments": "multi_select",
  "Answers": "rich_text",
  "Skills": "rich_text",
  "Submitted": "date",
  "Motivation": "rich_text",
  "Knew From": "rich_text",
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
  fullName: string;
  telegramId: number;
  telegramUsername: string;
  skills: string;
  departments: { [D in DepartmentId]: boolean };
  answers: string;
  motivation: string;
  whereKnew: string;
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
    addCandidate: (candidate: Candidate) => Promise<void>;
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
  private tasksQueue: TasksQueue;
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
    this.tasksQueue = new TasksQueue();
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

  public async addCandidate(candidate: Candidate): Promise<void> {
    // check if candidate already exists
    const actualCandidates = await this.getActualCandidates();
    if (actualCandidates[candidate.telegramId]) {
      throw new CandidateAlreadyExistsError(
        `Candidate with Telegram ID ${candidate.telegramId} already exists`,
      );
    }

    const now = new Date();
    const notionNow = now.toISOString().split("T")[0];

    await this.notion.createPage({
      databaseId: this.candidatesDatabaseId,
      properties: {
        "Name": {
          title: [
            {
              text: {
                content: candidate.fullName,
              },
            },
          ],
        },
        "Status": {
          select: {
            name: "New",
          },
        },
        "Telegram ID": {
          rich_text: [
            {
              text: {
                content: candidate.telegramId.toString(),
              },
            },
          ],
        },
        "Telegram": {
          url: candidate.telegramUsername ? `t.me/${candidate.telegramUsername}` : "",
        },
        "Skills": {
          rich_text: [
            {
              text: {
                content: candidate.skills,
              },
            },
          ],
        },
        "Departments": {
          multi_select: Object.entries(candidate.departments)
            .filter(([_, isInterested]) => isInterested)
            .map(([departmentId]) => ({
              name: departmentIdSelectNameMap[departmentId as DepartmentId],
            })),
        },
        "Answers": {
          rich_text: [
            {
              text: {
                content: candidate.answers,
              },
            },
          ],
        },
        "Motivation": {
          rich_text: [
            {
              text: {
                content: candidate.motivation,
              },
            },
          ],
        },
        "Knew From": {
          rich_text: [
            {
              text: {
                content: candidate.whereKnew,
              },
            },
          ],
        },
        "Submitted": {
          date: { start: notionNow },
        },
        // deno-lint-ignore no-explicit-any
      } as any,
    });

    // also add in the cache
    this.cachedCandidates[candidate.telegramId] = candidate;
  }

  private getActualMembers(): Promise<Record<number, Member>> {
    if (
      this.membersLastRefreshedAt &&
      datesDiffMs(this.membersLastRefreshedAt, new Date()) <
        this.MEMBERS_DB_REFRESH_RATE_MS
    ) {
      return Promise.resolve(this.cachedMembers);
    }

    if (!this.membersFetchingPromise) {
      this.membersFetchingPromise = new Promise((resolve, reject) => {
        this.tasksQueue.addTask(async () => {
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
            resolve(actualMembers);
            this.membersFetchingPromise = null;
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    return this.membersFetchingPromise;
  }

  private getActualCandidates(): Promise<Record<number, Candidate>> {
    if (
      this.candidatesLastRefreshedAt &&
      datesDiffMs(this.candidatesLastRefreshedAt, new Date()) <
        this.CANDIDATES_DB_REFRESH_RATE_MS
    ) {
      return Promise.resolve(this.cachedCandidates);
    }

    if (!this.candidatesFetchingPromise) {
      this.candidatesFetchingPromise = new Promise((resolve, reject) => {
        this.tasksQueue.addTask(async () => {
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
                fullName: richTextToString(candidate.properties["Name"].title),
                telegramId: telegramId,
                telegramUsername: candidate.properties["Telegram"].url,
                skills: richTextToString(
                  candidate.properties.Skills.rich_text,
                ),
                departments: departments,
                answers: richTextToString(
                  candidate.properties["Answers"].rich_text,
                ),
                motivation: richTextToString(
                  candidate.properties["Motivation"].rich_text,
                ),
                whereKnew: richTextToString(
                  candidate.properties["Knew From"].rich_text,
                ),
              };
            }

            this.cachedCandidates = actualCandidates;
            this.candidatesLastRefreshedAt = new Date();
            resolve(actualCandidates);
            this.candidatesFetchingPromise = null;
          } catch (error) {
            reject(error);
          }
        });
      });
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

class TasksQueue {
  private lastTaskFinishedAt: Date | null;
  private queue: Array<() => Promise<unknown>>;
  private timeBetweenTasksMs: number;

  constructor(maxTasksPerSecond: number = 2) {
    this.queue = [];
    this.lastTaskFinishedAt = null;
    this.timeBetweenTasksMs = 1000 / maxTasksPerSecond;
  }

  public addTask<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const waitTimeMs = this.getWaitTimeMs();
          if (waitTimeMs > 0) {
            await delay(waitTimeMs);
          }
          const result = await task();
          this.lastTaskFinishedAt = new Date();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.queue.shift();
          this.runNextTask();
        }
      });

      // Run task if it's the only one in the queue.
      // If it is not, it will be run when the previous task is finished.
      if (this.queue.length === 1) {
        this.runNextTask();
      }
    });
  }

  private runNextTask() {
    if (this.queue.length > 0) {
      this.queue[0]();
    }
  }

  private getWaitTimeMs() {
    if (!this.lastTaskFinishedAt) {
      return 0;
    }

    const waitTimeMs = this.timeBetweenTasksMs - datesDiffMs(
      this.lastTaskFinishedAt,
      new Date(),
    );

    return waitTimeMs > 0 ? waitTimeMs : 0;
  }
}

function datesDiffMs(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime());
}

// configure plugin
export const o12t = new O12t<Ctx>({
  notionApiToken: config.NOTION_INTEGRATION_TOKEN,
  membersDatabaseId: config.NOTION_MEMBERS_DB_ID,
  candidatesDatabaseId: config.NOTION_CANDIDATES_DB_ID,
});
export const o12tMiddleware = o12t.middleware();
