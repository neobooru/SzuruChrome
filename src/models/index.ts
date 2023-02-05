import { BooruTypes, ContentType, ScrapedNote, ScrapedPost, ScrapedTag } from "neo-scraper";
import { ImageSearchResult, MicroTag, Tag } from "~/api/models";

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
  reverseSearchResult: ImageSearchResult | undefined;

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

export class SimilarPostInfo {
  constructor(public readonly id: number, public readonly percentage: number) {}
}

export type MessageType = "error" | "info" | "success";
export type MessageCategory = "none" | "persistent" | "find_similar";

export class Message {
  id: string;

  constructor(public content: string, public level: MessageType = "info", public category: MessageCategory = "none") {
    this.id = window.crypto.randomUUID();
  }
}

export type BrowserCommandName = "grab_post" | "upload_post" | "push_message" | "pop_messages";

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
