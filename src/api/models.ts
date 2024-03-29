/**
 * Generated based on my setup, so some fields might be missing (but they also are unused so far so it doesn't really matter).
 */

export type Safety = "safe" | "sketchy" | "unsafe";
export type TagFields = "version" | "names" | "category" | "usages" | "implications";
export type PoolFields = "version" | "id" | "names" | "category" | "description" | "postCount" | "posts";

export type TagsResult = PagedSearchResult<Tag>;
export type PoolsResult = PagedSearchResult<Pool>;
export type TagCategoriesResult = UnpagedSearchResult<TagCategory>;

export interface SzuruError {
  name: string;
  title: string;
  description: string;
}

export interface PostAlreadyUploadedError extends SzuruError {
  otherPostId: number;
  otherPostUrl: string;
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

export interface Tag extends MicroTag {
  version: number;
  description?: string; // Markdown
  creationTime: Date;
  lastEditTime?: Date;
  suggestions: MicroTag[];
  implications: MicroTag[];
}

/**
 * All fields can be optional.
 */
export interface Pool {
  id: number;
  names: string[];
  category: string;
  version: number;
  description: null;
  postCount: number;
  posts: MicroPost[];
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

export interface MicroPost {
  id: number;
  thumbnailUrl: string;
}

export interface Post extends MicroPost {
  version: number;
  creationTime: Date;
  lastEditTime?: Date;
  safety: Safety;
  source: string | null;
  type: string;
  mimeType: string;
  checksum: string;
  fileSize: number;
  canvasWidth: number;
  canvasHeight: number;
  contentUrl: string;
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

export interface SzuruNote {
  polygon: number[][];
  text: string;
}

export interface SimilarPost {
  distance: number;
  post: Post;
}

export interface ImageSearchResult {
  exactPost: Post | undefined;
  similarPosts: SimilarPost[];
}

export interface TemporaryFileUploadResult {
  token: string;
}

export interface UpdatePostRequest {
  version: number;
  tags: string[] | undefined;
  safety: Safety | undefined;
  source: string | undefined | null;
  // relations: string[];
  // notes: string[],
  // flags: string[];
  contentUrl: string | undefined;
  contentToken: string | undefined;
}

export interface UpdatePoolRequest {
  version: number;
  // names?: string[];
  posts: number[];
}
