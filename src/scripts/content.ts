import { NeoScraper, ScrapeResults } from "neo-scraper";
import { browser, Runtime } from "webextension-polyfill-ts";

function grabPost(): ScrapeResults {
    var scraper = new NeoScraper();
    return scraper.scrapeDocument(document, undefined, true);
}

async function messageHandler(message: any, sender: Runtime.MessageSender): Promise<any> {
    switch (message) {
        case "grab_post": return grabPost();
    }
}

browser.runtime.onMessage.addListener(messageHandler);
