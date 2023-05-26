import { defineStore } from "pinia";
import { SzuruSiteConfig } from "~/config";
import SzurubooruApi from "~/api";
import type { ScrapedPostDetails, SetPostUploadInfoData } from "~/models";

export const useConfigStore = defineStore("config", {
  state: () => ({
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
  }),
  getters: {
    selectedSite: (state) => {
      return state.sites.find((x) => x.id == state.selectedSiteId);
    },
    szuru(): SzurubooruApi | undefined {
      if (this.selectedSite) {
        return SzurubooruApi.createFromConfig(this.selectedSite);
      }
    },
  },
  actions: {
    createSzuruApiFromConfig(siteId: string) {
      const cfg = this.sites.find((x) => x.id == siteId);
      if (cfg) {
        return SzurubooruApi.createFromConfig(cfg);
      }
    },
  },
  persist: true,
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
