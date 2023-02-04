# SzuruChrome

Chrome/Firefox extension which can import media from various sites into a [szurubooru](https://github.com/rr-/szurubooru) instance.

## Supported sites

| Engine         | Sites                                                         | Features                                                       | Notes                                                                           |
| -------------- | ------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| animepictures  | anime-pictures.net                                            | content, resolution, tags, tag_category                        | Rating is assumed to be safe.                                                   |
| danbooru       | danbooru.donmai.us, safebooru.donmai.us                       | content, rating, resolution, tags, tag_category, source, notes |                                                                                 |
| e621           | e621.net, e926.net                                            | content, rating, resolution, tags, tag_category, source        |                                                                                 |
| furaffinity    | www.furaffinity.net                                           | content, rating, resolution, tags, tag_category                |                                                                                 |
| gelbooru       | safebooru.org, gelbooru.com, rule34.xxx, tbib.org, xbooru.com | content, rating, resolution, tags, tag_category, source, notes | Supported features might vary between hosts.                                    |
| inkbunny       | inkbunny.net                                                  | content, rating, resolution, tags                              |                                                                                 |
| moebooru       | yande.re, konachan.com                                        | content, rating, resolution, tags, tag_category, source, notes |                                                                                 |
| pixiv          | pixiv.net, www.pixiv.net                                      | content                                                        |                                                                                 |
| reddit         | reddit.com, new.reddit.com, old.reddit.com                    | content                                                        |                                                                                 |
| rule34us       | rule34.us                                                     | content, resolution, tags, tag_category                        | Rating is assumed to be unsafe.                                                 |
| sankakucomplex | chan.sankakucomplex.com                                       | content, rating, tags, tag_category, notes                     | Hotlink protection currently prevents szurubooru from importing from this site. |
| shimmie2       | rule34.paheal.net, rule34hentai.net                           | content, tags, source                                          | Rating is assumed to be unsafe.                                                 |
| shuushuu       | e-shuushuu.net                                                | content, rating, resolution, tags, tag_category                | Rating is assumed to be safe.                                                   |
| twitter        | twitter.com, mobile.twitter.com                               | content                                                        |                                                                                 |
| zerochan       | www.zerochan.net                                              | content, resolution, tags, tag_category                        | Rating is assumed to be safe.                                                   |
| fallback       |                                                               | content                                                        | Tries to find the largest image or video on the current page.                   |

## Installation

For development see [build/debug](#Builddebug).

### Firefox

Just download the .xpi from [release tab](https://github.com/neobooru/SzuruChrome/releases) and install it.

### Chrome

I can't create a valid .crx file, which means that you'll have to use [Chrome's "Load unpacked extension"](https://developer.chrome.com/docs/extensions/mv3/getstarted/#unpacked) feature.
You can download a .zip containing the needed files from the [release tab](https://github.com/neobooru/SzuruChrome/releases). Check [this stackoverflow answer](https://stackoverflow.com/a/38011386) if you want to get rid of the developer extension popup.

## Build/debug

```sh
# Install node modules
pnpm install

# Live dev build (watch)
pnpm dev

# Production build
pnpm build
```

After this you can load them in your browser.  
Chrome: `chrome://extensions/` → "Load unpacked" → Select `./dist` folder  
Firefox: `about:debugging` → "Load Temporary Add-on..." → Select any file in the `./dist` folder (it will load all files)

See [the developer docs](./docs/DEVELOPER.md) for more information.

## Planned features

These are some things I might work on. Though honestly I don't expect this extension to change much anytime soon.

- Finishing the initial version of this add-on (see visual design doc for all features)
- Right click any image on a page to import it
- Configurable list of tags to always ignore (e.g. tagme, highres)
- [low priority] Import artist commentary
