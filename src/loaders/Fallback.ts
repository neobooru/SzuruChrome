import ILoader from "./ILoader";
import { ScrapedPost } from "../LocalTypes";

export default class Fallback implements ILoader {
    canImport(location: Location): boolean {
        return false;
    }
    
    async grabPost(document: Document): Promise<ScrapedPost | null> {
        function getSize(el: HTMLImageElement) {
            return el.width * el.height;
        }

        // Get largest img element on this page
        const largestImgElement = Array.from(document.getElementsByTagName('img'))
            .reduce((a, b) => getSize(a) > getSize(b) ? a : b);

        if (largestImgElement) {
            let post = new ScrapedPost();
            post.source = document.location.href;
            post.imageUrl = largestImgElement.src;
            return post;
        }
        
        return null;
    }  
}
