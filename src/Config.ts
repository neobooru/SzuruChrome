import { browser } from "webextension-polyfill-ts";

export class SzuruSiteConfig {
    domain: string = "";
    username: string = "";
    authToken: string = "";
}

export class Config {
    importExistingTags: boolean = true;
    importAllTags: boolean = false;
    importCommentary: boolean = false;
    autoSearchSimilar: boolean = false;
    sites: Array<SzuruSiteConfig> = [];

    public async save() {
        await browser.storage.local.set({
            config: JSON.stringify(this)
        });

        console.dir("Save " + JSON.stringify(this));
        console.log("Saved config");
    }

    static async load(): Promise<Config> {
        let storage = await browser.storage.local.get("config");
        let config: Config = new Config();

        if ("config" in storage) {
            config = Object.assign(config, JSON.parse(storage["config"]));
        }

        console.dir("Load " + JSON.stringify(config));
        return config;
    }
}
