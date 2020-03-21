export type BrowserCommandName = "grab_post" | "upload_post";
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
