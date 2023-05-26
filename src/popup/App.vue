<script lang="ts" setup>
import { onMounted } from "vue";
import { isChrome } from "~/env";
import { BrowserCommand, SetPostUploadInfoData, SetExactPostId } from "~/models";
import { Runtime, WebRequest } from "webextension-polyfill";
import { useMergeStore, usePopupStore } from "~/stores";

const pop = usePopupStore();
const merge = useMergeStore();

onMounted(() => {
  browser.runtime.onMessage.addListener((cmd: BrowserCommand, _sender: Runtime.MessageSender) => {
    console.log("Popup received message:");
    console.dir(cmd);

    switch (cmd.name) {
      case "set_post_upload_info":
        {
          const { postId, instanceId, info } = <SetPostUploadInfoData>cmd.data;
          let post = pop.posts.find((x) => x.id == postId);
          if (post) {
            let instanceSpecificData = post.instanceSpecificData[instanceId];
            if (instanceSpecificData) {
              instanceSpecificData.uploadState = info;
            }
          }
        }
        break;
      case "set_exact_post_id":
        {
          const { postId, instanceId, exactPostId } = <SetExactPostId>cmd.data;
          let post = pop.posts.find((x) => x.id == postId);
          if (post && pop.selectedPostId) {
            let instanceSpecificData = post.instanceSpecificData[instanceId];
            if (instanceSpecificData) {
              if (instanceSpecificData?.reverseSearchResult) {
                instanceSpecificData.reverseSearchResult.exactPostId = exactPostId;
              } else {
                instanceSpecificData.reverseSearchResult = { exactPostId, similarPosts: [] };
              }
            }
          }
        }
        break;
      case "set_post_update_info":
        {
          const data = <SetPostUploadInfoData>cmd.data;
          let existing = merge.uploadInfo.find((x) => x.instanceId == data.instanceId && x.postId == data.postId);
          if (existing) {
            existing.info = data.info;
          } else {
            merge.uploadInfo.push(data);
          }
        }
        break;
    }
  });

  let extraInfoSpec: WebRequest.OnBeforeSendHeadersOptions[] = ["requestHeaders", "blocking"];
  if (isChrome) {
    extraInfoSpec.push("extraHeaders");
  }

  // Add "Referer" header to all requests if post.referrer is set.
  // This is needed in some rare cases where websites disallow hotlinking to images.
  // This will probably stop working in Chrome sometime in 2023 due to the Manifest V3 webRequestBlocking bullshit.
  // Firefox users should be fine.
  browser.webRequest.onBeforeSendHeaders.addListener(
    (details: WebRequest.OnBeforeSendHeadersDetailsType): WebRequest.BlockingResponse => {
      let requestHeaders = details.requestHeaders ?? [];

      // Find which ScrapedPost this belongs to, if any.
      const post = pop.getPostForContentUrl(details.url);
      if (post != undefined && post.referrer) {
        console.log(`Setting referrer to '${post.referrer}' for request to '${post.contentUrl}'.`);
        // TODO: If the headers already have a 'Referer' header this will _not_ override that.
        // As far as I am aware the 'img' tag doesn't set this header, so it shouldn't be a problem.
        requestHeaders.push({ name: "Referer", value: post.referrer });
      }

      return {
        requestHeaders,
      };
    },
    { urls: ["<all_urls>"] },
    extraInfoSpec
  );
});
</script>

<template>
  <div class="popup-container">
    <router-view />
  </div>
</template>

<style lang="scss">
@use "~/styles/main.scss";
@use "~/styles/popup.scss";
</style>
