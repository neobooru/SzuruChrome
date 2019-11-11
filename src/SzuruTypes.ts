/**
 * Generated based on my setup, so some fields might be missing (but they also are unused so far so it doesn't really matter).
 */

export type Safety = "safe" | "sketchy" | "unsafe";

export type TagsResult = PagedSearchResult<Tag>
export type TagCategoriesResult = UnpagedSearchResult<TagCategory>

export interface SzuruError {
    name: string;
    title: string;
    description: string;
}

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
    description?: string; // Markdown
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

export interface MicroUser {
    name: string;
    avatarUrl: string;
}

export interface Post {
    id: number;
    version: number;
    creationTime: Date;
    lastEditTime?: Date;
    safety: Safety;
    source: string;
    type: string;
    mimeType: string;
    checksum: string;
    fileSize: number;
    canvasWidth: number;
    canvasHeight: number;
    contentUrl: string;
    thumbnailUrl: string;
    flags: string[];
    tags: MicroTag[];
    relations: any[]; // MicroPost resource
    user: MicroUser;
    score: number;
    ownScore: number;
    ownFavorite: boolean;
    tagCount: number;
    favoriteCount: number;
    commentCount: number;
    noteCount: number;
    relationCount: number;
    featureCount: number;
    lastFeatureTime?: Date;
    favoritedBy: MicroUser[];
    hasCustomThumbnail: boolean;
    notes: any[]; // Note resource
    comments: any[]; // Comment resource
}

export interface SimilarPost {
    distance: number;
    post: Post;
}

export interface ImageSearchResult {
    exactPost: Post | null;
    similarPosts: SimilarPost[];
}
