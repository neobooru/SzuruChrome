export type SzuruSafety = "safe" | "sketchy" | "unsafe";

export class SzuruCategory {
    name: string;
    color: string;

    private constructor(name: string, color: string = "") {
        this.name = name;
        this.color = color;
    }

    static readonly Copyright = new SzuruCategory("copyright", "#a0a");
    static readonly Character = new SzuruCategory("character", "#0a0");
    static readonly Artist = new SzuruCategory("artist", "#a00");
    static readonly Meta = new SzuruCategory("meta", "#f80");
}

export class SzuruTag {
    name: string = "";
    category?: SzuruCategory;

    constructor(name: string, category?: SzuruCategory) {
        this.name = name;
        this.category = category;
    }
}

export class SzuruPost {
    safety: SzuruSafety = "safe";
    source: string = "";
    imageUrl: string = "";
    tags: SzuruTag[] = [];
}

export interface SzuruError {
    name: string;
    title: string;
    description: string;
}
