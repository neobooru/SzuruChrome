import { BooruTypes, ContentType, ScrapedNote, ScrapedPost, ScrapedTag } from "neo-scraper";
import { MicroTag, Tag } from "~/api/models";

export class TagDetails {
  public implications: TagDetails[] = [];

  constructor(public name: string, public category?: string, public usages?: number) {}

  static fromTag(tag: Tag) {
    const x = new TagDetails(tag.names[0], tag.category, tag.usages);

    if (tag.implications) {
      x.implications = tag.implications.map((y) => TagDetails.fromMicroTag(y));
    }

    return x;
  }

  static fromMicroTag(tag: MicroTag) {
    return new TagDetails(tag.names[0], tag.category, tag.usages);
  }

  static fromScapedTag(tag: ScrapedTag): TagDetails {
    return new TagDetails(tag.name, tag.category);
  }
}

export class ScrapedPostDetails {
  id = window.crypto.randomUUID();
  name = "";
  tags: TagDetails[] = [];
  notes: ScrapedNote[];
  contentUrl: string;
  contentToken?: string;
  pageUrl: string;
  contentType: ContentType;
  rating: BooruTypes.SafetyRating;
  source = "";
  referrer?: string;
  resolution?: [number, number];
  reverseSearchResult?: SimpleImageSearchResult;
  uploadState?: PostUploadInfo;

  constructor(post: ScrapedPost) {
    this.contentUrl = post.contentUrl;
    this.pageUrl = post.pageUrl;
    this.contentType = post.contentType;
    this.rating = post.rating;
    this.source = post.sources.join("\n");
    this.referrer = post.referrer;
    this.tags = post.tags.map((x) => TagDetails.fromScapedTag(x));
    this.notes = post.notes;
    this.resolution = post.resolution;
  }
}

export interface SimpleImageSearchResult {
  exactPostId?: number;
  similarPosts: SimpleSimilarPost[];
}

export interface SimpleSimilarPost {
  distance: number;
  postId: number;
}

export class SimilarPostInfo {
  constructor(public readonly id: number, public readonly percentage: number) {}
}

export type PostUploadState = "uploading" | "uploaded" | "error";

export class PostUploadInfo {
  state: PostUploadState = "uploading";
  error?: string;
  instancePostId?: number;
  updateTagsState?: {
    total: number;
    current?: number;
    totalChanged?: number;
  };
}

export type BrowserCommandName = "grab_post" | "upload_post" | "set_post_upload_info" | "set_exact_post_id";

export class BrowserCommand<T = any> {
  name: BrowserCommandName;
  data?: T;

  constructor(name: BrowserCommandName, data?: T) {
    this.name = name;
    this.data = data;
  }
}

export class PostUploadCommandData {
  constructor(public readonly post: ScrapedPostDetails, public readonly siteId: string) {}
}

export class SetPostUploadInfoData {
  constructor(public readonly postId: string, public readonly info: PostUploadInfo) {}
}

export class SetExactPostId {
  constructor(public readonly postId: string, public readonly exactPostId: number) {}
}
