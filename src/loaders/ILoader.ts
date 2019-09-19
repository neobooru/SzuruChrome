import { ScrapedPost } from "../LocalTypes";

export default interface ILoader {
    canImport(location: Location): boolean;
    grabPost(dom: Document): Promise<ScrapedPost | null>;
}
