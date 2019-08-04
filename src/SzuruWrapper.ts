import axios, { AxiosRequestConfig, AxiosPromise, Method } from 'axios';
import { SzuruPost, SzuruError } from './SzuruTypes';
import { Config } from './Config';

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
        "Accept": "application/json",
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
        return await this.apiGet("info");
    }

    async createPost(post: SzuruPost): Promise<void> {
        var obj = {
            tags: post.tags.map(x => x.name),
            safety: post.safety,
            source: post.source,
            contentUrl: post.imageUrl
        };

        console.log("Create new post object");
        console.dir(obj);

        await this.apiPost("posts", obj);
    }

    private async apiGet(url: string, additionalHeaders: any = {}): Promise<any> {
        const fullUrl = this.apiUrl + url;
        const config: AxiosRequestConfig = {
            method: "GET",
            url: fullUrl
        }

        config.headers = { ...this.baseHeaders, ...additionalHeaders };
        return await this.execute(config);
    }

    private async apiPost(url: string, data: any, additionalHeaders: any = {}): Promise<any> {
        const fullUrl = this.apiUrl + url;
        const config: AxiosRequestConfig = {
            method: "POST",
            url: fullUrl,
            data: data
        }

        config.headers = { ...this.baseHeaders, ...additionalHeaders };
        return await this.execute(config);
    }

    private async execute(config: AxiosRequestConfig): Promise<any> {
        if (this.username && this.authToken) {
            const token = "Token " + btoa(`${this.username}:${this.authToken}`);
            config.headers["Authorization"] = token;
            // console.log(token);
        }

        try {
            return await axios(config);
        } catch (ex) {
            const error = ex.response.data as SzuruError;
            throw error ? error : ex;
        }
    }

    static async createFromConfig(): Promise<SzuruWrapper | null> {
        const config = await Config.load();

        if (config.sites.length == 0) {
            return null;
        }

        return new SzuruWrapper(config.sites[0].domain, config.sites[0].username, config.sites[0].authToken);
    }
}
