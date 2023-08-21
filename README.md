# SzuruChrome

Chrome/Firefox extension which can import media from various sites into a [szurubooru](https://github.com/rr-/szurubooru) instance.

![Screenshot](./docs/screenshots/Default%20-%20Existing%20post%20found.png)

## Installation

### Firefox

I am experimenting with publishing the extension to Firefox Add-ons. You can find it [here](https://addons.mozilla.org/en-US/firefox/addon/szuruchrome/). This version will automatically update.

You can also download the .xpi from the [release tab](https://github.com/neobooru/SzuruChrome/releases) and manually install it. This version will not automatically update.

Both versions can be installed side by side, as they do not affect each other. This also means that you need to configure both of them independently.

### Chrome

I can't create a valid .crx file, which means that you'll have to use [Chrome's "Load unpacked extension"](https://developer.chrome.com/docs/extensions/mv3/getstarted/#unpacked) feature.
You can download a .zip containing the needed files from the [release tab](https://github.com/neobooru/SzuruChrome/releases). Check [this Stack Overflow answer](https://stackoverflow.com/a/38011386) if you want to get rid of the developer extension popup.

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

See [the developer notes](https://github.com/neobooru/SzuruChrome/wiki/Developer-notes) for more information.
