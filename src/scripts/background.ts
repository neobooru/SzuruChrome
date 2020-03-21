import { ScrapedPost } from "neo-scraper";
import { browser, Runtime } from "webextension-polyfill-ts";
import { BrowserCommand } from "../Common";

function uploadPost(post: ScrapedPost) {
    // TODO: Upload post and send status updates to popup
}

async function messageHandler(cmd: BrowserCommand, sender: Runtime.MessageSender): Promise<any> {
    switch (cmd.name) {
        case "upload_post": return uploadPost(cmd.data);
    }
}

browser.runtime.onMessage.addListener(messageHandler);
