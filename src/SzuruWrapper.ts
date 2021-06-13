import axios, { AxiosRequestConfig } from "axios";
import { ScrapedPost } from "neo-scraper";
import { SzuruSiteConfig } from "./Config";
import { TagsResult, TagCategoriesResult, Post, Tag, SzuruError, ImageSearchResult } from "./SzuruTypes";

/**
 * A 1:1 wrapper around the szurubooru API.
 *
 * @class SzuruWrapper
 */
export default class SzuruWrapper {
  baseUrl: string;
  apiUrl: string;
  username: string;
  authToken: string;

  private readonly baseHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json"
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
    return (await this.apiPut("tag/" + tag.names[0], tag)).data;
  }

  async getTags(query: string, offset: number = 0): Promise<TagsResult> {
    const params = new URLSearchParams();
    params.append("offset", offset.toString());
    if (query) {
      params.append("query", query);
    }
    return (await this.apiGet("tags?" + params.toString())).data;
  }

  async getTagCategories(): Promise<TagCategoriesResult> {
    return (await this.apiGet("tag-categories")).data;
  }

  async createPost(post: ScrapedPost): Promise<Post> {
    var obj = {
      tags: post.tags.map(x => x.name),
      safety: post.rating,
      source: post.source,
      contentUrl: post.contentUrl
    };

    console.log("Create new post object");
    console.dir(obj);

    return (await this.apiPost("posts", obj)).data;
  }

  async reverseSearch(contentUrl: string): Promise<ImageSearchResult> {
    var obj = {
      contentUrl: contentUrl
    };

    return (await this.apiPost("posts/reverse-search", obj)).data;
  }

  private async apiGet(url: string, additionalHeaders: any = {}): Promise<any> {
    const fullUrl = this.apiUrl + url;
    const config: AxiosRequestConfig = {
      method: "GET",
      url: fullUrl
    };

    config.headers = { ...this.baseHeaders, ...additionalHeaders };
    return this.execute(config);
  }

  private async apiPost(url: string, data: any, additionalHeaders: any = {}): Promise<any> {
    const fullUrl = this.apiUrl + url;
    const config: AxiosRequestConfig = {
      method: "POST",
      url: fullUrl,
      data: data
    };

    config.headers = { ...this.baseHeaders, ...additionalHeaders };
    return this.execute(config);
  }

  private async apiPut(url: string, data: any, additionalHeaders: any = {}): Promise<any> {
    const fullUrl = this.apiUrl + url;
    const config: AxiosRequestConfig = {
      method: "PUT",
      url: fullUrl,
      data: data
    };

    config.headers = { ...this.baseHeaders, ...additionalHeaders };
    return this.execute(config);
  }

  private async execute(config: AxiosRequestConfig): Promise<any> {
    if (this.username && this.authToken) {
      const token = "Token " + btoa(`${this.username}:${this.authToken}`);
      config.headers["Authorization"] = token;
    }

    try {
      return await axios(config);
    } catch (ex) {
      const error = ex.response.data as SzuruError;
      throw error ? error : ex;
    }
  }

  static async createFromConfig(siteConfig: SzuruSiteConfig): Promise<SzuruWrapper | null> {
    return new SzuruWrapper(siteConfig.domain, siteConfig.username, siteConfig.authToken);
  }
}
