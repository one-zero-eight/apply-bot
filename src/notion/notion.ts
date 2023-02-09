import { Client, collectPaginatedAPI, isFullPage } from "notion";
import type {
  Filter,
  Page,
  PropertiesSchema,
  PropertyValue,
  RichText,
} from "./types.ts";

export class Notion {
  private client: Client;

  constructor(config: NotionConfig) {
    config = {
      timeoutMs: 6000,
      ...config,
    };

    this.client = new Client({
      auth: config.integrationApiToken,
      timeoutMs: config.timeoutMs,
    });
  }

  public async queryDb<S extends PropertiesSchema>({
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

    let pages: (Parameters<typeof isFullPage>[0])[];
    if (fetchAll) {
      pages = await collectPaginatedAPI(this.client.databases.query, options);
    } else {
      pages = (await this.client.databases.query(options)).results;
    }

    return pages.filter(isFullPage) as unknown as Page<S>[];
  }

  public async createPage<S extends PropertiesSchema>({
    databaseId,
    properties,
  }: CreatePageOptions<S>) {
    return await this.client.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: properties,
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
