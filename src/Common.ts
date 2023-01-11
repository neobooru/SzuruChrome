import { Config, Theme } from "./Config";

export type BrowserCommandName = "grab_post" | "upload_post" | "push_message" | "remove_messages";
export type MessageType = "error" | "info" | "success";

export class BrowserCommand {
  name: BrowserCommandName;
  data: any;

  constructor(name: BrowserCommandName, data: any = null) {
    this.name = name;
    this.data = data;
  }
}

export class Message {
  content: string;
  level: MessageType;
  category: string;

  constructor(content: string, level: MessageType = "info", category: string | null = null) {
    this.content = content;
    this.level = level;
    this.category = category ?? "none";
  }
}

export function getUrl(root: string, ...parts: string[]): string {
  let url = root.replace(/\/+$/, "");
  for (const part of parts) {
    url += "/" + part.replace(/\/+$/, "");
  }
  return url;
}

export function isChrome() {
  return /Chrome/.test(navigator.userAgent);
}

export function encodeTagName(tagName: string) {
  // Searching for posts with re:zero will show an error message about unknown named token.
  // Searching for posts with re\:zero will show posts tagged with re:zero.
  return tagName.replace(/:/g, "\\:");
}

export async function applyTheme(theme?: Theme) {
  if (!theme) {
    var cfg = await Config.load();
    theme = cfg.theme;
  }
  if (theme == "system") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
}
