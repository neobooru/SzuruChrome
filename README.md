# SzuruChrome

Chrome/Firefox extension which can import media from various sites into a [szurubooru](https://github.com/rr-/szurubooru) instance.

## Supported sites

- Danbooru (and Safebooru variant)
- Gelbooru/Safebooru/Rule34.xxx/tbib.org
- yande.re/konachan (Moebooru)
- SankakuComplex (doesn't currently work because of the hotlink protection)
- Rule34 paheal (Shimmie2)
- E-Shuushuu
- Zerochan
- Reddit
- Twitter
- Fallback (simply grabs the largest image on a page)

## Installation

_Work in progress_

For development see [build/debug](#Builddebug).  
There also is a .xpi for Firefox on the [release tab](https://github.com/neobooru/SzuruChrome/releases).  
There _isn't_ a .crx for Chrome because you can't install it anyway, so you'll have to use the unpacked extension.

This extension should also work on Firefox Android (I can't test this because Firefox Android doesn't support client certificates).  
Same goes for Kiwi Browser and pretty much all other Chromium based browsers with extension support.  
The Yandex browser does support client certificates and extensions (SzuruChrome works fine), but I'm not sure if I'd trust them with my data.  
The layout is obviously not designed for mobile, so at times it looks less than ideal.

## How does it work?

This add-on has three parts.  
The first part is the popup, which is what pops up when you click on the logo.

The second part is a content script which is injected on the page you visit. This script tries to find importable content on the current page and sends this to the popup.

The third part is the background script which handles the upload functionality. This was previously part of the popup, but has since been moved to the background script.

### The popup

When opened (when you click on the add-on logo in your browser) it sends a message to the content script injected on the current page (active tab). This message asks the content script to scrape the DOM and return a SzuruPost element (with a source, contentUrl, safety, and a list of tags). Once it receives this element it renders it in the popup where you can make changes before importing it. When you click on the "Upload" button the SzuruPost will be sent to the background script which will handle the upload functionality. This is done so that the upload continues even after you close the popup. This means that you can close the popup after clicking the "Upload" button and it'll continue with the upload.

### The content script

This script is injected on every page and does absolutely nothing until it receives the 'grab_post' message from the popup. Once it does received this message it checks if there are any loaders available to scrape this page. If a matching loader is found it'll pass the DOM of this page to the loader. The loader then uses the DOM to fill (as much as possible) a SzuruPost object. The SzuruPost is then passed back to the popup where you can change the post before importing it.

### The background script

This script handles the uploading of a post. It will also update a tag's category in your szurubooru instance when it differs from what is imported.

## Build/debug

```sh
# Install node modules
yarn install

# Use any of the following commands to build once
yarn build
yarn build:dev

# Or use one of these to build + rebuild on changes
yarn watch
yarn watch:dev
```

After this you can load them in your browser.  
Chrome: `chrome://extensions/` -> "Load unpacked" -> Select `./dist` folder  
Firefox: `about:debugging` -> "Load Temporary Add-on..." -> Select any file in the `./dist` folder (it will load all files)

## Planned features

These are some things I might work on. Though honestly I don't expect this extension to change much anytime soon.

- Finishing the initial version of this add-on (see visual design doc for all features)
- Right click any image on a page to import it
- Configurable list of tags to always ignore (e.g. tagme, highres)
- [low priority] Import artist commentary
- [low priority] Import notes
- [lowest priority] Move from 'options_page' to 'options_ui'
- [lowest priority] Multiple szurubooru instances (where you can choose to which one you want to upload the post)

## FAQ

### I can't connect to a szurubooru instance because it complains about CORS

See workaround below.

```apache
# CORS hack
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Authorization, Content-Type"

# CORS custom response for OPTIONS request (because szurubooru doesn't handle this, yet)
RewriteEngine on
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=204,L]
```

### I can't connect to a szurubooru instance which requires a client certificate (Firefox only)

Because the CORS spec is a bitch the preflight request is sent without the client certificate. A workaround would be to add the following to your apache2 config. Chrome has a 'bug' where it does send the client certificate in the preflight request (the sane thing to do if you ask me).

```apache
<Location "/api">
    # Can also be set to 'none'
    SSLVerifyClient optional
</Location>
```

### Why send the DOM to the ILoader instead of just an url?

If we send an URL to the ILoader it has to download the page again itself, which can go wrong in a dozen ways:

1.  The website might be offline now
2.  If the website is a SPA it might not see the same version/content as you did
3.  If you made changes to the DOM but didn't submit them to the server (e.g. edit post page) the ILoader would see a different page (kinda the same as point 2)
4.  If any form of authentication (username+password/client certificate/etc) is involved it gets tricky
5.  We already have the DOM, why download it again?
