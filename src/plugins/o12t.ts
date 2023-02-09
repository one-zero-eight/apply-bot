import { delay } from "async";
import { Context, MiddlewareFn } from "grammy";
import { Notion, richTextToString } from "@/notion/notion.ts";
import type { Ctx } from "@/types.ts";
import { config } from "@/config.ts";

const notionMembersDbSchema = {
  Fullname: "title",
  TelegramID: "number",
  Active: "checkbox",
  Role: "select",
  Languages: "multi_select",
} as const;

type NotionMembersDbSchema = typeof notionMembersDbSchema;

export interface Member {
  fullName: string;
  telegramId: number;
  isActive: boolean;
  role?: string;
  speakingLanguages: string[];
}

export type O12tOptions = {
  notionApiToken: string;
  membersDatabaseId: string;
};

export interface O12tFlavor {
  o12t: {
    getMemberByTelegramId: (telegramId: number) => Promise<Member | null>;
    member: () => Promise<Member | null>;
  };
}

export class CandidateAlreadyExistsError extends Error {
  public readonly type = "candidate-already-exists";
}

export class O12t<C extends Context> {
  private MEMBERS_DB_REFRESH_RATE_MS = 5000;

  private notion: Notion;
  private membersDatabaseId: string;
  private tasksQueue: TasksQueue;
  private membersLastRefreshedAt: Date | null;
  private cachedMembers: Record<number, Member>;

  constructor(
    { notionApiToken, membersDatabaseId }: O12tOptions,
  ) {
    this.notion = new Notion({ integrationApiToken: notionApiToken });
    this.membersDatabaseId = membersDatabaseId;
    this.tasksQueue = new TasksQueue();
    this.membersLastRefreshedAt = null;
    this.cachedMembers = {};
  }

  public async getMemberByTelegramId(telegramId: number): Promise<Member | null> {
    const actualMembers = await this.getActualMembers();
    return actualMembers[telegramId] ?? null;
  }

  private getActualMembers(): Promise<Record<number, Member>> {
    if (
      !this.membersLastRefreshedAt ||
      datesDiffMs(this.membersLastRefreshedAt, new Date()) >
        this.MEMBERS_DB_REFRESH_RATE_MS
    ) {
      // update cache with actual members from the Notion database
      return new Promise((resolve, reject) => {
        this.tasksQueue.addTask(async () => {
          try {
            const members = await this.notion.queryDb<NotionMembersDbSchema>({
              databaseId: this.membersDatabaseId,
            });

            const actualMembers: Record<number, Member> = {};

            for (const member of members) {
              actualMembers[member.properties.TelegramID.number] = {
                fullName: richTextToString(member.properties.Fullname.title),
                telegramId: member.properties.TelegramID.number,
                isActive: member.properties.Active.checkbox,
                role: member.properties.Role.select?.name,
                speakingLanguages: member.properties.Languages.multi_select.map((opt) =>
                  opt.name
                ),
              };
            }

            this.cachedMembers = actualMembers;
            this.membersLastRefreshedAt = new Date();
            resolve(actualMembers);
          } catch (error) {
            reject(error);
          }
        });
      });
    } else {
      return Promise.resolve(this.cachedMembers);
    }
  }

  /** Returns a middleware to .use on the `Bot` instance. */
  middleware(): MiddlewareFn<C & O12tFlavor> {
    const getMember = this.getMemberByTelegramId.bind(this);

    return async (ctx, next) => {
      ctx.o12t = {
        getMemberByTelegramId: getMember,
        member: async () => {
          if (ctx.from) {
            return await getMember(ctx.from.id);
          }
          return null;
        },
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
          console.log(`Running task. Queue length: ${this.queue.length}`);

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

      // run task if it's the only one in the queue;
      // if it is not, it will be run when the previous task is finished
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

// configure o12t plugin
export const o12t = new O12t<Ctx>({
  notionApiToken: config.NOTION_INTEGRATION_TOKEN,
  membersDatabaseId: config.NOTION_MEMBERS_DB_ID,
});
export const o12tMiddleware = o12t.middleware();
