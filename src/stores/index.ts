import { defineStore } from "pinia";
import deepMerge from "deepmerge";
import {
  type TagDetails,
  getDefaultTagCategories,
  type ScrapedPostDetails,
  type SetPostUploadInfoData,
  type SzuruSiteConfig,
  type TagCategoryColor,
} from "~/models";
import { useStorageLocal } from "~/composables/useStorageLocal";

export const cfg = useStorageLocal(
  "config",
  {
    version: 0,
    addPageUrlToSource: true,
    alwaysUploadAsContent: false,
    autoSearchSimilar: false,
    loadTagCounts: true,
    fetchPostInfo: true,
    useContentTokens: true,
    sites: [] as Array<SzuruSiteConfig>,
    selectedSiteId: undefined as string | undefined,
    addTagImplications: true,
    addAllParsedTags: true,
    merge: {
      expandOptions: true,
      expandExistingTags: false,
      expandAddTags: true,
      addMissingTags: true,
      appendSource: true,
      mergeSafety: true,
    },
    popup: {
      expandTags: true,
      expandPools: false,
      showSource: true,
      showPools: true,
      showInstancePicker: true,
    },
    tagCategories: [] as Array<TagCategoryColor>,
    tagIgnores: [] as Array<TagDetails>,
  },
  {
    mergeDefaults(storageValue, defaults) {
      const cfg = deepMerge(defaults, storageValue);
      const oldVersion = cfg.version;

      // Crappy config migration.
      switch (cfg.version) {
        case 0:
          cfg.version++;

          // Don't clear the existing tagCategories and don't add duplicates.
          for (const cat of getDefaultTagCategories()) {
            if (!cfg.tagCategories.find((x) => x.name == cat.name)) {
              cfg.tagCategories.push(cat);
            }
          }
      }

      if (oldVersion != cfg.version) {
        console.log(`Migrated config from version ${oldVersion} to ${cfg.version}`);
      }

      return cfg;
    },
  },
);

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
