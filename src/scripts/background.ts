import { ScrapedPost } from "neo-scraper";
import { browser, Runtime } from "webextension-polyfill-ts";
import { BrowserCommand, Message } from "../Common";
import { Config } from "../Config.ts";
import SzuruWrapper from "../SzuruWrapper.ts";
import { SzuruError } from "../SzuruTypes";

async function uploadPost(post: ScrapedPost) {
  // TODO: Upload post and send status updates to popup
  console.dir(post);

  const cfg = await Config.load();
  const szuru = (await SzuruWrapper.createFromConfig(cfg.sites[0]))!;

  try {
    // Create and upload post
    browser.runtime.sendMessage(new BrowserCommand("remove_messages", 10));
    browser.runtime.sendMessage(new BrowserCommand("push_message", new Message("Uploading...")));
    const createdPost = await szuru.createPost(post);
    browser.runtime.sendMessage(new BrowserCommand("remove_messages", 1));
    browser.runtime.sendMessage(
      new BrowserCommand("push_message", new Message("Uploaded post " + createdPost.id, "success"))
    );

    // TODO: Clicking a link doesn't actually open it in a new tab,
    // see https://stackoverflow.com/questions/8915845
    // uploadMsg.content = `<a href='${this.getPostUrl(createdPost)}' target='_blank'>Uploaded post</a>`;
    // uploadMsg.type = "success";

    // Find tags with "default" category and update it
    // TODO: Make all these categories configurable
    const tagsWithCategory = post.tags.filter(x => x.category);
    const unsetCategoryTags = createdPost.tags
      .filter(x => x.category == "default")
      .filter(x => tagsWithCategory.some(y => x.names.includes(y.name)));
    if (unsetCategoryTags.length != 0) {
      browser.runtime.sendMessage(
        new BrowserCommand("push_message", new Message(`${unsetCategoryTags.length} tags need a different category`))
      );
      // unsetCategoryTags is of type MicroTag[] and we need a Tag resource to update it, so let's get those
      const query = "?query=" + unsetCategoryTags.map(x => encodeTagName(x.names[0]));
      const tags = (await szuru.getTags(query)).results;
      for (let i in tags) {
        browser.runtime.sendMessage(new BrowserCommand("remove_messages", 1));
        browser.runtime.sendMessage(
          new BrowserCommand("push_message", new Message(`Updating tag ${i}/${unsetCategoryTags.length}`))
        );
        tags[i].category = tagsWithCategory.find(x => tags[i].names.includes(x.name))!.category!;
        await szuru.updateTag(tags[i]);
      }
      browser.runtime.sendMessage(new BrowserCommand("remove_messages", 1));
      browser.runtime.sendMessage(
        new BrowserCommand("push_message", new Message(`Updated ${tags.length} tags`, "success"))
      );
    }
  } catch (ex) {
    const error = ex as SzuruError;
    if (error) {
      console.error(error);
      browser.runtime.sendMessage(new BrowserCommand("push_message", new Message(ex, "error")));
    } else {
      console.error(ex);
      browser.runtime.sendMessage(new BrowserCommand("push_message", new Message(ex, "error")));
    }
  }
}

function encodeTagName(tagName: string) {
  // Searching for posts with re:zero will show an error message about unknown named token.
  // Searching for posts with re\:zero will show posts tagged with re:zero.
  return encodeURIComponent(tagName.replace(/\:/g, "\\:"));
}

async function messageHandler(cmd: BrowserCommand, sender: Runtime.MessageSender): Promise<any> {
  switch (cmd.name) {
    case "upload_post":
      return uploadPost(cmd.data);
  }
}

browser.runtime.onMessage.addListener(messageHandler);
