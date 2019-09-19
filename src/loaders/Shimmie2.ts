import ILoader from "./ILoader"
import { ScrapedPost, ScrapedTag } from "../LocalTypes";

export default class Shimmie2 implements ILoader {
    canImport(location: Location): boolean {
        return location.host == "rule34.paheal.net";
    }

    async grabPost(dom: Document): Promise<ScrapedPost | null> {
        let post = new ScrapedPost();
        post.source = document.location.href;

        // Set image url
        const originalImageElements = Array.from(document.querySelectorAll(".image_info > tbody > tr > td > a"))
            .map(x => x as HTMLAnchorElement)
            .filter(x => x.innerText == "Image Only");

        if (originalImageElements.length > 0) {
            post.imageUrl = originalImageElements[0].href;
        }

        // Set safety
        post.safety = "unsafe"; // Usually it is unsafe

        // Set tags
        // Shimmie2 doesn't support categories so we don't need to worry about those.
        // They also use uppercase tags, so we toLowerCase() those.
        // Tags might not match with other booru-likes, but that is for the user to figure out.
        // For example by deleting 'wrong' tags or setting up some aliases in szurubooru.
        post.tags = Array.from(document.querySelectorAll("a.tag_name"))
            .map(x => (x as HTMLAnchorElement).innerText.toLowerCase())
            .map(x => new ScrapedTag(x));

        // console.dir(post);

        // If post has enough filled fields to be considered a valid post
        if (post.imageUrl) {
            return post;
        } else {
            return null;
        }
    }
}
