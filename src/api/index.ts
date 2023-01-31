import axios, { AxiosRequestConfig, CancelToken } from "axios";
import {
  TagsResult,
  TagCategoriesResult,
  Post,
  Tag,
  SzuruError,
  ImageSearchResult,
  TagFields,
  TemporaryFileUploadResult,
} from "./models";
import { PostDetails } from "~/models";
import { SzuruSiteConfig } from "~/config";

/**
 * A 1:1 wrapper around the szurubooru API.
 *
 * @class SzuruWrapper
 */
export default class SzurubooruApi {
  baseUrl: string;
  apiUrl: string;
  username: string;
  authToken: string;

  private readonly baseHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  /**
   * Creates an instance of SzuruWrapper.
   * @param {string} baseUrl
   * @memberof SzuruWrapper
   */
  constructor(baseUrl: string, username: string, authToken: string) {
    const x = baseUrl.replace(/\/+$/, ""); // Trim trailing slashes, to make sure we only have one
    this.baseUrl = x + "/";
    this.apiUrl = x + "/api/";
    this.username = username;
    this.authToken = authToken;
  }

  async getInfo(): Promise<any> {
    return (await this.apiGet("info")).data;
  }

  async updateTag(tag: Tag): Promise<any> {
    return (await this.apiPut("tag/" + encodeURIComponent(tag.names[0]), tag)).data;
  }

  async getTags(
    query: string,
    offset = 0,
    limit = 100,
    fields?: TagFields[],
    cancelToken?: CancelToken
  ): Promise<TagsResult> {
    const params = new URLSearchParams();
    params.append("offset", offset.toString());
    params.append("limit", limit.toString());

    if (fields && fields.length > 0) params.append("fields", fields.join());
    if (query) params.append("query", query);

    return (await this.apiGet("tags?" + params.toString(), {}, cancelToken)).data;
  }

  async getTagCategories(): Promise<TagCategoriesResult> {
    return (await this.apiGet("tag-categories")).data;
  }

  async createPost(post: PostDetails): Promise<Post> {
    const obj = <any>{
      tags: post.tags.map((x) => x.name),
      safety: post.rating,
      source: post.source,
      notes: post.notes,
    };

    if (post.contentToken) {
      obj.contentToken = post.contentToken;
    } else {
      obj.contentUrl = post.contentUrl;
    }

    console.log("Create new post object");
    console.dir(obj);

    return (await this.apiPost("posts", obj)).data;
  }

  async reverseSearch(contentUrl: string): Promise<ImageSearchResult> {
    const obj = { contentUrl };
    return (await this.apiPost("posts/reverse-search", obj)).data;
  }

  async reverseSearchToken(contentToken: string): Promise<ImageSearchResult> {
    const obj = { contentToken };
    return (await this.apiPost("posts/reverse-search", obj)).data;
  }

  async uploadTempFile(contentUrl: string): Promise<TemporaryFileUploadResult> {
    const obj = { contentUrl };
    return (await this.apiPost("uploads", obj)).data;
  }

  static createFromConfig(siteConfig: SzuruSiteConfig): SzurubooruApi {
    return new SzurubooruApi(siteConfig.domain, siteConfig.username, siteConfig.authToken);
  }

  private async apiGet(url: string, additionalHeaders: any = {}, cancelToken?: CancelToken): Promise<any> {
    const fullUrl = this.apiUrl + url;
    const config: AxiosRequestConfig = {
      method: "GET",
      url: fullUrl,
      cancelToken,
    };

    config.headers = { ...this.baseHeaders, ...additionalHeaders };
    return this.execute(config);
  }

  private async apiPost(url: string, data: any, additionalHeaders: any = {}): Promise<any> {
    const fullUrl = this.apiUrl + url;
    const config: AxiosRequestConfig = {
      method: "POST",
      url: fullUrl,
      data: data,
    };

    config.headers = { ...this.baseHeaders, ...additionalHeaders };
    return this.execute(config);
  }

  private async apiPut(url: string, data: any, additionalHeaders: any = {}): Promise<any> {
    const fullUrl = this.apiUrl + url;
    const config: AxiosRequestConfig = {
      method: "PUT",
      url: fullUrl,
      data: data,
    };

    config.headers = { ...this.baseHeaders, ...additionalHeaders };
    return this.execute(config);
  }

  private async execute(config: AxiosRequestConfig): Promise<any> {
    if (this.username && this.authToken) {
      const token = "Token " + btoa(`${this.username}:${this.authToken}`);
      if (!config.headers) config.headers = {};
      // @ts-expect-error xxx
      config.headers["Authorization"] = token;
    }

    try {
      return await axios(config);
    } catch (ex: any) {
      const error = ex.response?.data as SzuruError | undefined;
      throw error ? error : ex;
    }
  }
}
