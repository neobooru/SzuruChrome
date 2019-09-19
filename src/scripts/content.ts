import { browser, Runtime } from "webextension-polyfill-ts";
import * as loaders from "../loaders";
import { ScrapedPost } from "../LocalTypes";
import ILoader from "../loaders/ILoader";

async function grabPost(): Promise<ScrapedPost | null> {
    for (const loaderName in loaders) {
        // HACK:
        const loader = new (loaders as any)[loaderName]() as ILoader;
        if (loader.canImport(window.location)) {
            console.log(`Using ${loaderName} importer to scrape this page`)
            return await loader.grabPost(document);
        }

        // Try using the Fallback loader if no other loader can scrape this page
        const post = new loaders.Fallback().grabPost(document);
        if (post) {
            return post;
        }
    }

    return null;
}

async function messageHandler(message: any, sender: Runtime.MessageSender): Promise<any> {
    switch (message) {
        case "grab_post": return grabPost();
    }
}

browser.runtime.onMessage.addListener(messageHandler);
