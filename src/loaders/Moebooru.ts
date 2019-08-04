import ILoader from "./ILoader"
import { SzuruPost, SzuruTag, SzuruCategory } from "../SzuruTypes";

export default class Moebooru implements ILoader {
    canImport(location: Location): boolean {
        return (
            location.host == "yande.re" ||
            location.host == "konachan.com"
        );
    }

    async grabPost(dom: Document): Promise<SzuruPost | null> {
        let post = new SzuruPost();
        post.source = dom.location.href;

        // Set image url
        const originalImageElement = document.querySelector("#highres") as HTMLAnchorElement;
        if (originalImageElement) {
            post.imageUrl = originalImageElement.href;
        }

        // Set safety
        // Same method as Gelbooru but cleaner code
        const safetyExp = new RegExp("Rating: (.*)");
        const safetyElements = Array.from(document.querySelectorAll("#stats > ul > li"))
            .map(x => x as HTMLLIElement)
            .filter(x => x.innerText.startsWith("Rating:"));

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
        const tagElements = Array.from(dom.querySelectorAll("#tag-sidebar > li"))
            .map(x => x as HTMLLIElement);

        for (const el of tagElements) {
            let tagName: string;
            let tagNameElements = el.getElementsByTagName("a");

            if (tagNameElements.length > 1) {
                // First <a> is "?"
                // Second <a> is "actual_tag_name"
                tagName = tagNameElements[1].innerText;
            } else {
                // Skip if no tag name is found
                continue;
            }

            let category: SzuruCategory | undefined;

            // Loop over all classes because some sites (konachan) 
            // have mutliple classes, e.g. "tag-link tag-type-copyright"
            for (const className of Array.from(el.classList)) {
                switch (className) {
                    case "tag-type-copyright":
                        category = SzuruCategory.Copyright;
                        break;
                    case "tag-type-character":
                        category = SzuruCategory.Character;
                        break;
                    case "tag-type-artist":
                        category = SzuruCategory.Artist;
                        break;
                    case "tag-type-metadata":
                        category = SzuruCategory.Meta;
                        break;
                }
            }

            let tag = new SzuruTag(tagName, category);
            post.tags.push(tag);
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
