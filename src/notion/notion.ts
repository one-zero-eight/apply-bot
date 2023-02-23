import { delay } from "async";
import { Client, collectPaginatedAPI, isFullPage } from "notion";
import { msFrom } from "../utils/dates.ts";
import type {
  Filter,
  Page,
  PropertiesSchema,
  PropertyValue,
  RichText,
} from "./types.ts";

let lastRequestAt = null as Date | null;

export class Notion {
  private client: Client;
  private queue: TasksQueue;

  constructor(config: NotionConfig) {
    config = {
      timeoutMs: 10000,
      ...config,
    };

    this.client = new Client({
      auth: config.integrationApiToken,
      timeoutMs: config.timeoutMs,
    });

    this.queue = new TasksQueue();
  }

  public queryDb<S extends PropertiesSchema>({
    databaseId,
    filter,
    filterProps,
    fetchAll = true,
  }: QueryDbOptions<S>): Promise<Page<S>[]> {
    const options = {
      database_id: databaseId,
      filter_properties: filterProps,
      // deno-lint-ignore no-explicit-any
      filter: filter as any,
    };

    return new Promise((resolve, reject) => {
      this.queue.addTask(async () => {
        try {
          let pages: (Parameters<typeof isFullPage>[0])[];
          if (fetchAll) {
            pages = await collectPaginatedAPI(this.client.databases.query, options);
          } else {
            pages = (await this.client.databases.query(options)).results;
          }

          resolve(pages.filter(isFullPage) as unknown as Page<S>[]);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  public createPage<S extends PropertiesSchema>({
    databaseId,
    properties,
  }: CreatePageOptions<S>) {
    return new Promise((resolve, reject) => {
      this.queue.addTask(async () => {
        try {
          resolve(
            await this.client.pages.create({
              parent: {
                database_id: databaseId,
              },
              properties: properties,
            }),
          );
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

export interface NotionConfig {
  integrationApiToken: string;
  timeoutMs?: number;
}

export interface QueryDbOptions<S extends PropertiesSchema> {
  databaseId: string;
  filterProps?: Extract<keyof S, string>[];
  filter?: Filter<S>;
  fetchAll?: boolean;
}

export interface CreatePageOptions<S extends PropertiesSchema> {
  databaseId: string;
  // TODO: fix properties type for page creation
  properties: {
    [K in keyof S]: PropertyValue<S[K]>;
  };
}

export function richTextToString(richText: RichText[]) {
  return richText.map((richText) => richText.plain_text).join("");
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
          console.log(
            `Notion: executing task from queue +${
              lastRequestAt ? msFrom(lastRequestAt) : "?"
            }ms`,
          );
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          lastRequestAt = new Date();
          this.lastTaskFinishedAt = new Date();
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

    const waitTimeMs = this.timeBetweenTasksMs - msFrom(this.lastTaskFinishedAt);

    return waitTimeMs > 0 ? waitTimeMs : 0;
  }
}
