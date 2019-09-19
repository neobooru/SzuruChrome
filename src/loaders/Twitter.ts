import ILoader from "./ILoader"
import { ScrapedPost, ScrapedTag } from "../LocalTypes";

function getOriginalImage(imageUrl: string) {
    const x = imageUrl.replace(/:large|:med|:small|:orig$/, ""); // Remove `:large`, `:small` etc from url
    return x + ":orig"; // Add :orig to url (to get original image)
}

export default class Twitter implements ILoader {
    canImport(location: Location): boolean {
        return location.host == "twitter.com";
    }

    async grabPost(dom: Document): Promise<ScrapedPost | null> {
        let post = new ScrapedPost();
        post.source = document.location.href;

        // Set image url
        // When clicked on post (not fullscreen, with post text etc)
        const overlayElement = document.querySelector("#permalink-overlay-dialog");
        if (overlayElement) {
            const cardImageElement = overlayElement.querySelector("div[data-element-context='platform_photo_card'] > img");
            if (cardImageElement) {
                post.imageUrl = getOriginalImage((cardImageElement as HTMLImageElement).src);
            }
        }

        // When clicked on image (fullscreen)
        const mediaImageElements = document.querySelectorAll("div.Gallery-media > img.media-image");
        if (mediaImageElements.length > 0) {
            post.imageUrl = getOriginalImage((mediaImageElements[0] as HTMLImageElement).src);
        }

        // If post has enough filled fields to be considered a valid post
        if (post.imageUrl) {
            return post;
        } else {
            return null;
        }
    }
}
