import { SzuruPost } from "../SzuruTypes";

export default interface ILoader {
    canImport(location: Location): boolean;
    grabPost(dom: Document): Promise<SzuruPost | null>;
}
