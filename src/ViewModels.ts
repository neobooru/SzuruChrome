import { BooruTypes, ContentType, ScrapedNote, ScrapedPost, ScrapedTag } from "neo-scraper";
import { MicroTag, Tag } from "./SzuruTypes";

export class TagViewModel {
  public implications: TagViewModel[] = [];

  constructor(public name: string, public category?: BooruTypes.TagCategory, public usages?: number | undefined) {}

  static fromTag(tag: Tag) {
    const x = new TagViewModel(tag.names[0], <BooruTypes.TagCategory>tag.category, tag.usages);

    if (tag.implications) {
      x.implications = tag.implications.map((y) => TagViewModel.fromMicroTag(y));
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
  name = "";
  tags: TagViewModel[] = [];
  notes: ScrapedNote[];
  contentUrl: string;
  contentToken: string | undefined;
  pageUrl: string;
  contentType: ContentType;
  rating: BooruTypes.SafetyRating;
  source = "";
  referrer: string | undefined;
  resolution: [number, number] | undefined;

  constructor(post: ScrapedPost) {
    this.contentUrl = post.contentUrl;
    this.pageUrl = post.pageUrl;
    this.contentType = post.contentType;
    this.rating = post.rating;

    if (post.sources.length > 0) {
      // Add extra newline at the end for user convenience. This allows the user to click below the last source line to add something.
      // But we only do this if there is at least one source, otherwise we get a blank line when there are zero sources.
      this.source = post.sources.join("\n") + "\n";
    }

    this.referrer = post.referrer;
    this.tags = post.tags.map((x) => TagViewModel.fromScapedTag(x));
    this.notes = post.notes;
    this.resolution = post.resolution;
  }
}
