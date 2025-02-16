import byteSize from "byte-size";
import { MicroUser, Post } from "./api/models";
import { ScrapedPostDetails, TagDetails } from "./models";
import SzurubooruApi from "./api";

export function getUrl(root: string, ...parts: string[]): string {
  let url = root.replace(/\/+$/, "");
  for (const part of parts) {
    url += "/" + part.replace(/\/+$/, "");
  }
  return url;
}

export function encodeTagName(tagName: string) {
  // Searching for posts with re:zero will show an error message about unknown named token.
  // Searching for posts with re\:zero will show posts tagged with re:zero.
  return tagName.replace(/:/g, "\\:");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getErrorMessage(ex: any) {
  return ex.description ?? ex.message ?? ex;
}

export function emptyMicroUser(): MicroUser {
  return {
    name: "",
    avatarUrl: "",
  };
}

export function emptyPost(): Post {
  return {
    id: 0,
    version: 0,
    creationTime: new Date(),
    lastEditTime: new Date(),
    safety: "safe",
    source: "",
    type: "",
    mimeType: "",
    checksum: "",
    fileSize: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    contentUrl: "",
    thumbnailUrl: "",
    flags: [],
    tags: [],
    relations: [],
    user: emptyMicroUser(),
    score: 0,
    ownScore: 0,
    ownFavorite: false,
    tagCount: 0,
    favoriteCount: 0,
    commentCount: 0,
    noteCount: 0,
    relationCount: 0,
    featureCount: 0,
    lastFeatureTime: new Date(),
    favoritedBy: [],
    hasCustomThumbnail: false,
    notes: [],
    comments: [],
  };
}

export function getTagClasses(tag: TagDetails): string[] {
  const classes: string[] = [];

  if (tag.category && tag.category != "default") {
    classes.push("tag-" + tag.category);
  } else {
    classes.push("tag-general");
  }

  return classes;
}

export function breakTagName(tagName: string) {
  // Based on https://stackoverflow.com/a/6316913
  return tagName.replace(/_/g, "_<wbr>");
}

export function resolutionToString(resolution: [number, number]) {
  if (resolution && resolution.length == 2) {
    return resolution[0] + "x" + resolution[1];
  }
  return "";
}

export function getPostInfoSummary(post: ScrapedPostDetails) {
  const parts = [];
  if (post.contentSize) {
    parts.push(byteSize(post.contentSize));
  }
  if (post.contentSubType) {
    parts.push(post.contentSubType);
  }
  if (post.resolution) {
    parts.push(resolutionToString(post.resolution));
  }
  return parts.join(" / ");
}

export async function ensurePostHasContentToken(selectedInstance: SzurubooruApi, post: ScrapedPostDetails, cfg: any) {
  if (!selectedInstance || !cfg.value.selectedSiteId) return;

  const instanceSpecificData = post.instanceSpecificData[cfg.value.selectedSiteId];

  if (!instanceSpecificData) {
    console.error("instanceSpecificData is undefined. This should never happen!");
    return;
  }

  if (instanceSpecificData.contentToken) {
    console.log("[ensurePostHasContentToken] contentToken is already set.");
    return;
  }

  try {
    const tmpRes = await selectedInstance.uploadTempFile(post.contentUrl, post.uploadMode);
    // Save contentToken in PostViewModel so that we can reuse it when creating/uploading the post.
    instanceSpecificData.contentToken = tmpRes.token;
  } catch (ex) {
    instanceSpecificData.genericError = "Couldn't upload content. " + getErrorMessage(ex);
    throw ex;
  }
}
