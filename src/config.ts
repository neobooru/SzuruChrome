export class SzuruSiteConfig {
  id = window.crypto.randomUUID();
  domain = "https://example.com";
  username = "user";
  authToken = "";
}

export class TagCategoryColor {
  constructor(public name: string, public color: string) {}
}
