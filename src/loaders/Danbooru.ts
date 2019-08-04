import ILoader from "./ILoader"
import { SzuruPost, SzuruTag, SzuruCategory } from "../SzuruTypes";

export default class Danbooru implements ILoader {
    canImport(location: Location): boolean {
        return (
            location.host == "danbooru.donmai.us" ||
            location.host == "safebooru.donmai.us"
        );
    }

    async grabPost(dom: Document): Promise<SzuruPost | null> {
        let post = new SzuruPost();

        post.source = dom.location.href;

        // Get image url


        // If post has enough filled fields to be considered a valid post
        if (post.imageUrl) {
            return post;
        } else {
            return null;
        }
    }
}