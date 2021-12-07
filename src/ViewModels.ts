import { BooruTypes, ContentType, ScrapedNote, ScrapedPost, ScrapedTag } from "neo-scraper";
import { MicroTag, Tag } from "./SzuruTypes";

export class TagViewModel {
  public implications: TagViewModel[] = [];

  constructor(public name: string, public category?: BooruTypes.TagCategory, public usages?: number | undefined) {}

  static fromTag(tag: Tag) {
    let x = new TagViewModel(tag.names[0], <BooruTypes.TagCategory>tag.category, tag.usages);

    if (tag.implications) {
      x.implications = tag.implications.map(y => TagViewModel.fromMicroTag(y));
    }

    return x;
  }

  static fromMicroTag(tag: MicroTag) {
    return new TagViewModel(tag.names[0], <BooruTypes.TagCategory>tag.category, tag.usages);
  }

  static fromScapedTag(tag: ScrapedTag): TagViewModel {
    return new TagViewModel(tag.name, tag.category);
  }
}

export class PostViewModel {
  name: string = "";
  tags: TagViewModel[] = [];
  notes: ScrapedNote[];
  contentUrl: string;
  pageUrl: string;
  contentType: ContentType;
  rating: BooruTypes.SafetyRating;
  source: string | undefined;
  referrer: string | undefined;
  resolution: [number, number] | undefined;

  constructor(post: ScrapedPost) {
    this.contentUrl = post.contentUrl;
    this.pageUrl = post.pageUrl;
    this.contentType = post.contentType;
    this.rating = post.rating;
    this.source = post.source;
    this.referrer = post.referrer;
    this.tags = post.tags.map(x => TagViewModel.fromScapedTag(x));
    this.notes = post.notes;
    this.resolution = post.resolution;
  }
}
