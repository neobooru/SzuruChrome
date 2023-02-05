export class SzuruSiteConfig {
  id = window.crypto.randomUUID();
  domain = "https://example.com";
  username = "user";
  authToken = "";
}

export class Config {
  importExistingTags = true;
  importAllTags = false;
  importCommentary = false;
  addPageUrlToSource = true;
  autoSearchSimilar = false;
  loadTagCounts = true;
  useContentTokens = true;
  sites: Array<SzuruSiteConfig> = [];
  selectedSiteId?: string;

  public async save() {
    await browser.storage.local.set({
      config: JSON.stringify(this),
    });

    console.dir("Save " + JSON.stringify(this));
    console.log("Saved config");
  }

  static async load(): Promise<Config> {
    const storage = await browser.storage.local.get("config");
    let config: Config = new Config();

    if ("config" in storage) {
      config = Object.assign(config, JSON.parse(storage["config"]));
    }

    console.dir("Load " + JSON.stringify(config));
    return config;
  }
}
