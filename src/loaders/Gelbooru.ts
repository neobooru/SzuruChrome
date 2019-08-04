import ILoader from "./ILoader"
import { SzuruPost, SzuruTag, SzuruCategory } from "../SzuruTypes";

export default class Gelbooru implements ILoader {
    canImport(location: Location): boolean {
        return (
            location.host == "safebooru.org" ||
            location.host == "gelbooru.com"
        );
    }

    async grabPost(dom: Document): Promise<SzuruPost | null> {
        /**
         * Make sure to use the `dom` variable and NOT `document`!
         */

        // TODO: Replace this with version checking, instead of just one 'special case' domain
        let isSafebooru: boolean;
        const safebooruSiteTitle = dom.querySelector("#site-title > a") as HTMLAnchorElement;

        if (safebooruSiteTitle && safebooruSiteTitle.innerText == "Safebooru") {
            // If safebooru (and maybe other sites?)
            isSafebooru = true;
        } else {
            // If gelbooru (version 0.2.5)
            isSafebooru = false;
        }

        console.log("isSafebooru: " + isSafebooru);

        let post = new SzuruPost();

        // Set source to the current page (NOT a direct link to the image)
        post.source = dom.location.href;

        // Get image url (direct url to image)
        const originalImageElements = dom.querySelectorAll("li > a");
        for (const idx in originalImageElements) {
            const el = originalImageElements[idx] as HTMLAnchorElement;

            if (el && el.innerText == "Original image") {
                post.imageUrl = el.href;
                break;
            }
        }

        // Set safety
        const safetyExp = new RegExp("Rating: (.*)");
        let safetyElements: NodeListOf<Element>;

        if (isSafebooru) {
            safetyElements = dom.querySelectorAll("#stats > ul > li");
        } else {
            safetyElements = dom.querySelectorAll("#tag-list > div > li");
        }

        for (const idx in safetyElements) {
            const el = safetyElements[idx] as HTMLLIElement;
            if (el && el.innerText) {
                // matches is an array where (index)
                // 0: full string
                // 1: capture group 1 (rating, so 'Safe', 'Questionable', 'Explicit')
                const matches = el.innerText.match(safetyExp);
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
        }

        // Set tags
        let tagElements: NodeListOf<Element>;

        if (isSafebooru) {
            tagElements = dom.querySelectorAll("#tag-sidebar > li");
        } else {
            tagElements = dom.querySelectorAll("#tag-list > div > li[class^='tag-type']");
        }

        for (const idx in tagElements) {
            const el = tagElements[idx] as HTMLLIElement;
            if (el && el.innerText) {
                let tagName: string;

                if (isSafebooru) {
                    tagName = el.getElementsByTagName("a")[0].innerText;
                } else {
                    // First <a> is "?"
                    // Second <a> is "actual_tag_name"
                    tagName = el.getElementsByTagName("a")[1].innerText;
                }

                let category: SzuruCategory | undefined;

                switch (el.className) {
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

                let tag = new SzuruTag(tagName, category);
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
};
