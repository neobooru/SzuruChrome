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
