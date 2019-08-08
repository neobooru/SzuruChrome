/**
 * Generated based on my setup, so some fields might be missing (but they also are unused so far so it doesn't really matter).
 */

export type Safety = "safe" | "sketchy" | "unsafe";

export interface PagedSearchResult<T> {
    query: string;
    offset: number;
    limit: number;
    total: number;
    results: T[];
}

export interface UnpagedSearchResult<T> {
    results: T[];
}

export interface MicroTag {
    names: string[];
    category: string;
    usages: number;
}

export interface Tag {
    names: string[];
    category: string;
    version: number;
    description?: any;
    creationTime: Date;
    lastEditTime?: Date;
    usages: number;
    suggestions: MicroTag[];
    implications: MicroTag[];
}

export interface TagCategory {
    name: string;
    version: number;
    color: string;
    usages: number;
    default: boolean;
}

export type TagsResult = PagedSearchResult<Tag>
export type TagCategoriesResult = UnpagedSearchResult<TagCategory>
