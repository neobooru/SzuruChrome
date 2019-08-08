import ILoader from "./ILoader"
import { LocalPost, LocalTag } from "../LocalTypes";

export default class Reddit implements ILoader {
    canImport(location: Location): boolean {
        return (
            location.host == "reddit.com" ||
            location.host == "www.reddit.com" ||
            location.host == "old.reddit.com"
        );
    }

    async grabPost(dom: Document): Promise<LocalPost | null> {
        let post = new LocalPost();
        post.source = dom.location.href;

        // Set image url
        // For old.reddit.com
        const oldLinkElements = dom.querySelectorAll("a.title");
        if (oldLinkElements.length > 0) {
            post.imageUrl = (oldLinkElements[0] as HTMLAnchorElement).href;
        }

        // For new reddit
        const newLinkElements = dom.querySelectorAll("div[data-test-id='post-content'] > div > a");
        if (newLinkElements.length > 0) {
            post.imageUrl = (newLinkElements[0] as HTMLAnchorElement).href;
        }

        // If post has enough filled fields to be considered a valid post
        if (post.imageUrl) {
            return post;
        } else {
            return null;
        }
    }
}
