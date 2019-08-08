/**
 * These types are NOT compatible with szurubooru, they are only used in the WebExtension.
 */

import { Safety } from "./SzuruTypes";

export type LocalCategory = "copyright" | "character" | "artist" | "meta";

export class LocalTag {
    name: string = "";
    category?: string;

    constructor(name: string, category?: string) {
        this.name = name.replace(/\s/g, "_"); // Replace all spaces with underscores
        this.category = category;
    }
}

// FIXME: LocalPost -> valid szurubooru type
export class LocalPost {
    safety: Safety = "safe";
    source: string = "";
    imageUrl: string = "";
    tags: LocalTag[] = [];
}

export interface LocalError {
    name: string;
    title: string;
    description: string;
}
