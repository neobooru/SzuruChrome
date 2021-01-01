import { NeoScraper, ScrapeResults } from "neo-scraper";
import { browser, Runtime } from "webextension-polyfill-ts";
import { BrowserCommand } from "../Common";

function grabPost(): ScrapeResults {
  var scraper = new NeoScraper();
  return scraper.scrapeDocument(document, undefined, true);
}

async function messageHandler(cmd: BrowserCommand, sender: Runtime.MessageSender): Promise<any> {
  switch (cmd.name) {
    case "grab_post":
      return grabPost();
  }
}

browser.runtime.onMessage.addListener(messageHandler);
