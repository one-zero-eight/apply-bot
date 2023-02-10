export type StringParser<T = string> = (maybeT: string) => T | null;

export const parseFullName: StringParser = (maybeFullName) => {
  // minimize whitespace
  maybeFullName = maybeFullName.trim();
  maybeFullName = maybeFullName.replace(/\s\s+/g, " ");

  if (maybeFullName.match(/^(?:[\p{L}\.\-'",]{2,}\s*)+$/ui)) {
    return maybeFullName;
  }

  return null;
};

export const parseUrl: StringParser = (maybeUrl) => {
  // credits to answer: https://stackoverflow.com/a/5717133
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$", // fragment locator
    "i",
  );
  maybeUrl = maybeUrl.trim();
  if (pattern.test(maybeUrl)) {
    return maybeUrl;
  }
  return null;
};

export const parseBotCommand: StringParser<[string, string]> = (maybeCommand) => {
  const m = maybeCommand.match(/^\/([a-z\d_]{1,32})(?:\s|$)/i);
  if (m) {
    return [m[1], maybeCommand.slice(m[0].length)];
  }
  return null;
};
