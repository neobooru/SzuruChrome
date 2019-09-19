/**
 * These types are NOT compatible with szurubooru, they are only used in the WebExtension.
 */

import { Safety } from "./SzuruTypes";

export type BooruCategory = "copyright" | "character" | "artist" | "meta";

export class ScrapedTag {
    name: string = "";
    category?: string;

    constructor(name: string, category?: string) {
        this.name = name.replace(/\s/g, "_"); // Replace all spaces with underscores
        this.category = category;
    }
}

// FIXME: LocalPost -> valid szurubooru type
export class ScrapedPost {
    safety: Safety = "safe";
    source: string = "";
    imageUrl: string = "";
    tags: ScrapedTag[] = [];
}
