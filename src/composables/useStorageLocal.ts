import { storage } from "webextension-polyfill";
import type { MaybeRef, RemovableRef, StorageLikeAsync, UseStorageAsyncOptions } from "@vueuse/core";
import { useStorageAsync } from "@vueuse/core";

const storageLocal: StorageLikeAsync = {
  removeItem(key: string) {
    return storage.local.remove(key);
  },

  setItem(key: string, value: string) {
    console.log("setItem");
    console.dir(value);
    return storage.local.set({ [key]: value });
  },

  async getItem(key: string) {
    console.log("getItem");
    const item = (await storage.local.get(key))[key];
    console.dir(item);
    return item;
  },
};

export const useStorageLocal = <T>(
  key: string,
  initialValue: MaybeRef<T>,
  options?: UseStorageAsyncOptions<T>
): RemovableRef<T> => useStorageAsync(key, initialValue, storageLocal, options);
