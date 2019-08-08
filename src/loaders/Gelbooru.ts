import ILoader from "./ILoader"
import { LocalPost, LocalTag, LocalCategory } from "../LocalTypes";

// Small hack to avoid screwing with semver
enum Version {
    v020 = 1, // 0.2.0
    v025, // 0.2.5
}

export default class Gelbooru implements ILoader {
    canImport(location: Location): boolean {
        return (
            location.host == "safebooru.org" ||
            location.host == "gelbooru.com" ||
            location.host == "rule34.xxx"
        );
    }

    async grabPost(dom: Document): Promise<LocalPost | null> {
        /**
         * Make sure to use the `dom` variable and NOT `document`!
         */

        let version: Version;
        switch (dom.location.host) {
            case "safebooru.org":
            case "rule34.xxx":
                version = Version.v020;
                break;
            case "gelbooru.com":
                version = Version.v025;
                break;
            default:
                console.error("Couldn't guess version");
                return null;
        }

        console.log("Gelbooru guessed version: " + version);

        let post = new LocalPost();
        post.source = dom.location.href;

        // Set image url (direct url to image)
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

        if (version == Version.v020) {
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

        if (version == Version.v020) {
            tagElements = dom.querySelectorAll("#tag-sidebar > li");
        } else {
            tagElements = dom.querySelectorAll("#tag-list > div > li[class^='tag-type']");
        }

        for (const idx in tagElements) {
            const el = tagElements[idx] as HTMLLIElement;
            if (el && el.innerText) {
                let tagName: string;

                if (version == Version.v020) {
                    const nameElements = el.getElementsByTagName("a");

                    // Some <li/> don't actually contain a name.
                    // E.g. the sub-headers ("Copyright", "Character", "General", "Meta") on rule34.xxx
                    if (nameElements.length > 0) {
                        tagName = el.getElementsByTagName("a")[0].innerText;
                    }
                    else {
                        continue;
                    }
                } else {
                    // First <a> is "?"
                    // Second <a> is "actual_tag_name"
                    tagName = el.getElementsByTagName("a")[1].innerText;
                }

                let category: LocalCategory | undefined;

                switch (el.className) {
                    case "tag-type-copyright":
                        category = "copyright";
                        break;
                    case "tag-type-character":
                        category = "character";
                        break;
                    case "tag-type-artist":
                        category = "artist";
                        break;
                    case "tag-type-metadata":
                        category = "meta";
                        break;
                }

                let tag = new LocalTag(tagName, category);
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
