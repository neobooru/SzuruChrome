import ILoader from "./ILoader"
import { ScrapedPost, ScrapedTag, BooruCategory } from "../LocalTypes";

export default class Danbooru implements ILoader {
    canImport(location: Location): boolean {
        return (
            location.host == "danbooru.donmai.us" ||
            location.host == "safebooru.donmai.us"
        );
    }

    async grabPost(dom: Document): Promise<ScrapedPost | null> {
        let post = new ScrapedPost();
        post.source = document.location.href;

        // Set image url
        const originalImageElements = Array.from(document.querySelectorAll("#post-information > ul > li > a"))
            .map(x => x as HTMLAnchorElement)
            .filter(x => x.parentElement && x.parentElement.innerText.startsWith("Size"));

        if (originalImageElements.length > 0) {
            post.imageUrl = originalImageElements[0].href;
        }

        // Set safety
        const safetyExp = new RegExp("Rating: (.*)");
        const safetyElements = Array.from(document.querySelectorAll("#post-information > ul > li"))
            .map(x => x as HTMLLIElement)
            .filter(x => x.innerText.startsWith("Rating"));

        if (safetyElements.length > 0) {
            const matches = safetyElements[0].innerText.match(safetyExp);
            if (matches && matches.length > 0) {
                switch (matches[1].toLowerCase()) {
                    case "safe":
                        post.safety = "safe";
                        break;
                    case "questionable":
                        post.safety = "sketchy";
                        break;
                    case "explicit":
                        post.safety = "unsafe";
                        break;
                }
            }
        }

        // Set tags
        const tagElements = Array.from(document.querySelectorAll("#tag-list > ul > li")).map(x => x as HTMLLIElement);
        for (const tagElement of tagElements) {
            let tagName: string | undefined;
            const tagNameElement = tagElement.querySelector(".search-tag") as HTMLAnchorElement;
            if (tagNameElement) {
                tagName = tagNameElement.innerText;
            }

            let category: BooruCategory | undefined;
            switch (tagElement.className) {
                case "category-3":
                    category = "copyright";
                    break;
                case "category-4":
                    category = "character";
                    break;
                case "category-1":
                    category = "artist";
                    break;
                case "category-5":
                    category = "meta";
                    break;
            }

            if (tagName) {
                let tag = new ScrapedTag(tagName, category);
                post.tags.push(tag);
            }
        }

        // console.dir(post);

        // If post has enough filled fields to be considered a valid post
        if (post.imageUrl) {
            return post;
        } else {
            return null;
        }
    }
}
