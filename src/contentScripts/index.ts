import { NeoScraper, ScrapeResults } from "neo-scraper";
import { BrowserCommand } from "~/models";

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  function grabPost(): ScrapeResults {
    const scraper = new NeoScraper();
    return scraper.scrapeDocument(document, true);
  }

  async function messageHandler(cmd: BrowserCommand): Promise<any> {
    switch (cmd.name) {
      case "grab_post":
        return grabPost();
    }
  }

  browser.runtime.onMessage.addListener(messageHandler);
})();
