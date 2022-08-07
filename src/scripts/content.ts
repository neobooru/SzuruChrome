import { NeoScraper, ScrapeResults } from "neo-scraper";
import { browser } from "webextension-polyfill-ts";
import { BrowserCommand } from "../Common";

function grabPost(): ScrapeResults {
  const scraper = new NeoScraper();
  return scraper.scrapeDocument(document, undefined, true);
}

async function messageHandler(cmd: BrowserCommand): Promise<any> {
  switch (cmd.name) {
    case "grab_post":
      return grabPost();
  }
}

browser.runtime.onMessage.addListener(messageHandler);
