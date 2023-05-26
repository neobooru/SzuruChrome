import { encodeTagName, getErrorMessage } from "~/utils";
import {
  BrowserCommand,
  PostUploadCommandData,
  PostUploadInfo,
  SetPostUploadInfoData,
  SetExactPostId,
  PostUpdateCommandData,
} from "~/models";
import { PostAlreadyUploadedError } from "~/api/models";
import SzurubooruApi from "~/api";

// Only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import("/@vite/client");
  // load latest content script
  import("./contentScriptHMR");
}

async function uploadPost(data: PostUploadCommandData) {
  const info: PostUploadInfo = {
    state: "uploading",
  };

  const pushInfo = () =>
    browser.runtime.sendMessage(
      new BrowserCommand("set_post_upload_info", new SetPostUploadInfoData(data.selectedSite.id, data.post.id, info))
    );

  try {
    const szuru = SzurubooruApi.createFromConfig(data.selectedSite);

    // Create and upload post
    pushInfo();

    const contentToken = data.post.instanceSpecificData[data.selectedSite.id]?.contentToken;
    const createdPost = await szuru.createPost(data.post, contentToken);

    info.state = "uploaded";
    info.instancePostId = createdPost.id;
    pushInfo();

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
      pushInfo();

      // unsetCategoryTags is of type MicroTag[] and we need a Tag resource to update it, so let's get those
      const query = unsetCategoryTags.map((x) => encodeTagName(x.names[0])).join();
      const tags = (await szuru.getTags(query)).results;
      const existingCategories = (await szuru.getTagCategories()).results;
      let categoriesChangedCount = 0;

      for (const i in tags) {
        info.updateTagsState.current = parseInt(i);
        pushInfo();

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
        pushInfo();
      }
    }
  } catch (ex: any) {
    if (ex.name && ex.name == "PostAlreadyUploadedError") {
      const otherPostId = (ex as PostAlreadyUploadedError).otherPostId;
      browser.runtime.sendMessage(
        new BrowserCommand("set_exact_post_id", new SetExactPostId(data.selectedSite.id, data.post.id, otherPostId))
      );
      // We don't set an error message, because we have a different message for posts that are already uploaded.
    } else {
      // Set generic error message.
      info.error = getErrorMessage(ex);
    }
    info.state = "error";
    pushInfo();
  }
}

async function updatePost(data: PostUpdateCommandData) {
  const info: PostUploadInfo = {
    state: "uploading",
    instancePostId: data.postId,
  };

  const pushInfo = () =>
    browser.runtime.sendMessage(
      new BrowserCommand(
        "set_post_update_info",
        new SetPostUploadInfoData(data.selectedSite.id, `merge-${data.postId}`, info)
      )
    );

  try {
    const szuru = SzurubooruApi.createFromConfig(data.selectedSite);
    
    pushInfo();

    await szuru.updatePost(data.postId, data.updateRequest);
    
    info.state = "uploaded";
    pushInfo();
  } catch (ex: any) {
    info.state = "error";
    info.error = getErrorMessage(ex);
    pushInfo();
  }
}

async function messageHandler(cmd: BrowserCommand): Promise<any> {
  console.log("Background received message:");
  console.dir(cmd);

  switch (cmd.name) {
    case "upload_post":
      return uploadPost(cmd.data);
    case "update_post":
      return updatePost(cmd.data);
  }
}

browser.runtime.onMessage.addListener(messageHandler);
