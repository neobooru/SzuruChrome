import ILoader from "./ILoader"
import { SzuruPost, SzuruTag } from "../SzuruTypes";

function getOriginalImage(imageUrl: string) {
    const x = imageUrl.replace(/:large|:med|:small|:orig$/, ""); // Remove `:large`, `:small` etc from url
    return x + ":orig"; // Add :orig to url (to get original image)
}

export default class Twitter implements ILoader {
    canImport(location: Location): boolean {
        return location.host == "twitter.com";
    }

    async grabPost(dom: Document): Promise<SzuruPost | null> {
        let post = new SzuruPost();
        post.source = dom.location.href;

        // Set image url
        // When clicked on post (not fullscreen, with post text etc)
        const overlayElement = dom.querySelector("#permalink-overlay-dialog");
        if (overlayElement) {
            const cardImageElement = overlayElement.querySelector("div[data-element-context='platform_photo_card'] > img");
            if (cardImageElement) {
                post.imageUrl = getOriginalImage((cardImageElement as HTMLImageElement).src);
            }
        }

        // When clicked on image (fullscreen)
        const mediaImageElements = dom.querySelectorAll("div.Gallery-media > img.media-image");
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
