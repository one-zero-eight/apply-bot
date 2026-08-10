import { escapeHtml } from "@/utils/html.ts";

/** Stay under Telegram's 4096 limit with a small safety margin. */
export const TELEGRAM_HTML_MESSAGE_LIMIT = 4000;

export function formatQuotedAnswer(answer: string): string {
  return `<blockquote>${escapeHtml(answer)}</blockquote>`;
}

/** `questionHtml` is trusted/pre-escaped (e.g. from Fluent). */
export function formatQaBlock(questionHtml: string, answer: string): string {
  return `${questionHtml}\n${formatQuotedAnswer(answer)}`;
}

export function formatSectionHeader(titleHtml: string): string {
  return `<b>${titleHtml}</b>`;
}

export interface ApplicationMessageParts {
  /** Included in review; omitted in announcements (name is in the header). */
  nameQa?: [string, string];
  beforeDepartmentsQa: [string, string][];
  departmentsQaSectionTitle: string;
  departmentsQa: { departmentName: string; qa: [string, string][] }[];
  afterDepartmentsQa: [string, string][];
}

/** Build formatted Q&A / section blocks (one block = one unsplittable unit). */
export function buildApplicationBlocks(parts: ApplicationMessageParts): string[] {
  const blocks: string[] = [];

  if (parts.nameQa) {
    blocks.push(formatQaBlock(parts.nameQa[0], parts.nameQa[1]));
  }

  for (const [q, a] of parts.beforeDepartmentsQa) {
    blocks.push(formatQaBlock(q, a));
  }

  const departmentBlocks: string[] = [];
  for (const { departmentName, qa } of parts.departmentsQa) {
    for (let i = 0; i < qa.length; i++) {
      const [q, a] = qa[i];
      departmentBlocks.push(
        formatQaBlock(`${departmentName} — ${i + 1}. ${q}`, a),
      );
    }
  }

  if (departmentBlocks.length > 0) {
    // Keep section title with the first department Q&A so it is not left alone.
    blocks.push(
      `${formatSectionHeader(parts.departmentsQaSectionTitle)}\n\n${
        departmentBlocks[0]
      }`,
    );
    blocks.push(...departmentBlocks.slice(1));
  }

  for (const [q, a] of parts.afterDepartmentsQa) {
    blocks.push(formatQaBlock(q, a));
  }

  return blocks;
}

/**
 * Pack `header` + blocks into messages of at most `maxLen` characters.
 * Splits between blocks when possible; hard-slices only if a single block
 * (or header alone) cannot fit.
 */
export function packMessages(
  header: string,
  blocks: string[],
  maxLen = TELEGRAM_HTML_MESSAGE_LIMIT,
): string[] {
  const messages: string[] = [];
  let headerPending = header;
  let currentParts: string[] = [];
  let currentBodyLen = 0;

  const flush = () => {
    if (currentParts.length === 0 && headerPending.length === 0) {
      return;
    }
    const prefix = headerPending;
    headerPending = "";
    const body = currentParts.join("\n\n");
    const msg = body.length > 0 ? prefix + body : prefix.replace(/\n+$/, "");
    if (msg.length > 0) {
      messages.push(msg);
    }
    currentParts = [];
    currentBodyLen = 0;
  };

  const pushHardSplit = (text: string) => {
    for (let i = 0; i < text.length; i += maxLen) {
      const slice = text.slice(i, i + maxLen);
      if (i + maxLen < text.length) {
        messages.push(slice);
      } else {
        currentParts = [slice];
        currentBodyLen = slice.length;
      }
    }
  };

  for (const block of blocks) {
    const sepLen = currentParts.length > 0 ? 2 : 0;
    const available = maxLen - headerPending.length;

    if (
      currentParts.length > 0 &&
      currentBodyLen + sepLen + block.length > available
    ) {
      flush();
    }

    const availableNow = maxLen - headerPending.length;
    if (block.length > availableNow) {
      if (headerPending.length > 0) {
        const alone = headerPending.replace(/\n+$/, "");
        headerPending = "";
        if (alone.length > 0) {
          messages.push(alone);
        }
      }
      if (currentParts.length > 0) {
        flush();
      }
      pushHardSplit(block);
      continue;
    }

    currentParts.push(block);
    currentBodyLen += sepLen + block.length;
  }

  flush();
  return messages;
}

export function formatApplicationMessages(
  header: string,
  parts: ApplicationMessageParts,
  maxLen = TELEGRAM_HTML_MESSAGE_LIMIT,
): string[] {
  return packMessages(header, buildApplicationBlocks(parts), maxLen);
}
