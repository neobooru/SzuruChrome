import { defineStore } from "pinia";
import { SzuruSiteConfig } from "~/config";
import type { ScrapedPostDetails, SetPostUploadInfoData } from "~/models";
import { useStorageLocal } from "~/composables/useStorageLocal";

export const cfg = useStorageLocal("config", {
  addPageUrlToSource: true,
  autoSearchSimilar: false,
  loadTagCounts: true,
  useContentTokens: true,
  sites: [] as Array<SzuruSiteConfig>,
  selectedSiteId: undefined as string | undefined,
  addTagImplications: true,
  merge: {
    expandOptions: true,
    expandExistingTags: false,
    expandAddTags: true,
    addMissingTags: true,
    appendSource: true,
    mergeSafety: true,
  },
});

export const usePopupStore = defineStore("popup", {
  state: () => ({
    posts: [] as ScrapedPostDetails[],
    selectedPostId: undefined as string | undefined,
    isSearchingForSimilarPosts: 0,
  }),
  getters: {
    selectedPost: (state) => {
      return state.posts.find((x) => x.id == state.selectedPostId);
    },
  },
  actions: {
    getPostForContentUrl(contentUrl: string): ScrapedPostDetails | undefined {
      return this.posts.find((x) => x.contentUrl == contentUrl);
    },
  },
});

export const useMergeStore = defineStore("merge", {
  state: () => ({
    uploadInfo: [] as SetPostUploadInfoData[],
    genericError: undefined as string | undefined,
  }),
});
