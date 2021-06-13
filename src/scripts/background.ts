import { ScrapedPost } from "neo-scraper";
import { browser, Runtime } from "webextension-polyfill-ts";
import { BrowserCommand, Message, encodeTagName, getUrl } from "../Common";
import { Config } from "../Config";
import SzuruWrapper from "../SzuruWrapper";
import { PostAlreadyUploadedError, SzuruError } from "../SzuruTypes";

async function uploadPost(post: ScrapedPost) {
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
      const query = unsetCategoryTags.map(x => encodeTagName(x.names[0])).join();
      const tags = (await szuru.getTags(query)).results;
      const existingCategories = (await szuru.getTagCategories()).results;
      let categoriesChangedCount = 0;

      for (let i in tags) {
        browser.runtime.sendMessage(new BrowserCommand("remove_messages", 1));
        browser.runtime.sendMessage(
          new BrowserCommand("push_message", new Message(`Updating tag ${i}/${unsetCategoryTags.length}`))
        );

        const wantedCategory = tagsWithCategory.find(x => tags[i].names.includes(x.name))!.category!;
        if (existingCategories.some(x => x.name == wantedCategory)) {
          tags[i].category = wantedCategory;
          await szuru.updateTag(tags[i]);
          categoriesChangedCount++;
        } else {
          console.log(
            `Not adding the '${wantedCategory}' category to the tag '${tags[i].names[0]}' because the szurubooru instance does not have this category.`
          );
        }
      }

      browser.runtime.sendMessage(new BrowserCommand("remove_messages", 1));

      if (categoriesChangedCount > 0) {
        browser.runtime.sendMessage(
          new BrowserCommand("push_message", new Message(`Updated ${categoriesChangedCount} tags`, "success"))
        );
      }
    }
  } catch (ex) {
    browser.runtime.sendMessage(new BrowserCommand("remove_messages", 1));
    let error = ex as SzuruError;
    if (error) {
      console.error(error);
      switch (error.name) {
        case "PostAlreadyUploadedError":
          const otherPostId = (error as PostAlreadyUploadedError).otherPostId;
          const url = getUrl(szuru.apiUrl.replace("api", ""), "post", otherPostId.toString());
          const msg = `<a href='${url}' target='_blank'>Post already uploaded (${otherPostId})</a>`;
          browser.runtime.sendMessage(new BrowserCommand("push_message", new Message(msg, "error")));
          break;
        default:
          browser.runtime.sendMessage(new BrowserCommand("push_message", new Message(ex, "error")));
          break;
      }
    } else {
      console.error(ex);
      browser.runtime.sendMessage(new BrowserCommand("push_message", new Message(ex, "error")));
    }
  }
}

async function messageHandler(cmd: BrowserCommand, sender: Runtime.MessageSender): Promise<any> {
  switch (cmd.name) {
    case "upload_post":
      return uploadPost(cmd.data);
  }
}

browser.runtime.onMessage.addListener(messageHandler);
