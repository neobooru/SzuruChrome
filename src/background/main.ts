import { encodeTagName, getErrorMessage } from "~/utils";
import { BrowserCommand, PostUploadCommandData, PostUploadInfo, SetPostUploadInfoData, SetExactPostId } from "~/models";
import { PostAlreadyUploadedError } from "~/api/models";
import SzurubooruApi from "~/api";
import { Config } from "~/config";

// Only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import("/@vite/client");
  // load latest content script
  import("./contentScriptHMR");
}

async function uploadPost(data: PostUploadCommandData) {
  console.dir(data.post);

  const cfg = await Config.load();
  const selectedSite = cfg.sites.find((x) => x.id == data.siteId);

  if (!selectedSite) {
    // TODO: Generic error handler which also shows the message in the popup frontend.
    // browser.runtime.sendMessage(
    //   new BrowserCommand("push_message", new Message("Selected instance not found in config!", "error"))
    // );
    return;
  }

  const info: PostUploadInfo = {
    state: "uploading",
  };

  try {
    const szuru = SzurubooruApi.createFromConfig(selectedSite);

    // Create and upload post
    browser.runtime.sendMessage(
      new BrowserCommand("set_post_upload_info", new SetPostUploadInfoData(data.siteId, data.post.id, info))
    );

    const createdPost = await szuru.createPost(data.post);

    info.state = "uploaded";
    info.instancePostId = createdPost.id;

    browser.runtime.sendMessage(
      new BrowserCommand("set_post_upload_info", new SetPostUploadInfoData(data.siteId, data.post.id, info))
    );

    // Find tags with "default" category and update it
    // TODO: Make all these categories configurable
    const tagsWithCategory = data.post.tags.filter((x) => x.category);
    const unsetCategoryTags = createdPost.tags
      .filter((x) => x.category == "default")
      .filter((x) => tagsWithCategory.some((y) => x.names.includes(y.name)));

    if (unsetCategoryTags.length != 0) {
      info.updateTagsState = {
        total: unsetCategoryTags.length,
      };
      browser.runtime.sendMessage(
        new BrowserCommand("set_post_upload_info", new SetPostUploadInfoData(data.siteId, data.post.id, info))
      );

      // unsetCategoryTags is of type MicroTag[] and we need a Tag resource to update it, so let's get those
      const query = unsetCategoryTags.map((x) => encodeTagName(x.names[0])).join();
      const tags = (await szuru.getTags(query)).results;
      const existingCategories = (await szuru.getTagCategories()).results;
      let categoriesChangedCount = 0;

      for (const i in tags) {
        info.updateTagsState.current = parseInt(i);
        browser.runtime.sendMessage(
          new BrowserCommand("set_post_upload_info", new SetPostUploadInfoData(data.siteId, data.post.id, info))
        );

        const wantedCategory = tagsWithCategory.find((x) => tags[i].names.includes(x.name))?.category;
        if (wantedCategory) {
          if (existingCategories.some((x) => x.name == wantedCategory)) {
            tags[i].category = wantedCategory;
            await szuru.updateTag(tags[i]);
            categoriesChangedCount++;
          } else {
            console.log(
              `Not adding the '${wantedCategory}' category to the tag '${tags[i].names[0]}' because the szurubooru instance does not have this category.`
            );
          }
        }
      }

      if (categoriesChangedCount > 0) {
        info.updateTagsState.totalChanged = categoriesChangedCount;
        browser.runtime.sendMessage(
          new BrowserCommand("set_post_upload_info", new SetPostUploadInfoData(data.siteId, data.post.id, info))
        );
      }
    }
  } catch (ex: any) {
    if (ex.name && ex.name == "PostAlreadyUploadedError") {
      const otherPostId = (ex as PostAlreadyUploadedError).otherPostId;
      browser.runtime.sendMessage(
        new BrowserCommand("set_exact_post_id", new SetExactPostId(data.siteId, data.post.id, otherPostId))
      );

      // No error message, because we have a different message for posts that are already uploaded.
      info.state = "error";
      browser.runtime.sendMessage(
        new BrowserCommand("set_post_upload_info", new SetPostUploadInfoData(data.siteId, data.post.id, info))
      );
    } else {
      info.state = "error";
      info.error = getErrorMessage(ex);
      browser.runtime.sendMessage(
        new BrowserCommand("set_post_upload_info", new SetPostUploadInfoData(data.siteId, data.post.id, info))
      );
    }
  }
}

async function messageHandler(cmd: BrowserCommand): Promise<any> {
  console.log("Background received message:");
  console.dir(cmd);

  switch (cmd.name) {
    case "upload_post":
      return uploadPost(cmd.data);
  }
}

browser.runtime.onMessage.addListener(messageHandler);
