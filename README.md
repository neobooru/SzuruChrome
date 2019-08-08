# SzuruChrome

Chrome/Firefox extension which can import media from various sites into a [szurubooru](https://github.com/rr-/szurubooru) instance.

## Supported sites

-   Gelbooru/Safebooru/Rule34.xxx
-   Danbooru (and Safebooru variant)
-   Rule34 paheal (Shimmie2)
-   yande.re/konachan (Moebooru)
-   Reddit
-   Twitter

## Installation

_Work in progress_

For development see [build/debug](#Builddebug).  
There also is a .xpi for Firefox on the [release tab](https://github.com/neobooru/SzuruChrome/releases).  
There _isn't_ a .crx for Chrome because you can't install it anyway, so you'll have to use the unpacked extension.

## How does it work?

This add-on has two parts. The first part is the popup, which is what pops up when you click on the logo. The second part is a content script which is injected on _every_ website ([why?](#Why-is-the-content-script-injected-on-every-page)).

### The popup

When opened (when you click on the add-on logo in your browser) it sends a message to the content script injected on the current page (active tab). This message asks the content script to scrape the DOM and return a SzuruPost element (with a source, imageUrl, safety, and a list of tags). Once it receives this element it renders it in the popup where you can make changes before importing it.

### The content script

This script is injected on every page ([why?](#Why-is-the-content-script-injected-on-every-page)) and does absolutely nothing until it receives the 'grab_post' message from the popup. Once it does received this message it checks if there are any loaders available to scrape this page. If a matching loader is found it'll pass the DOM of this page to the loader. The loader then uses the DOM to fill (as much as possible) a SzuruPost object. The SzuruPost is then passed back to the popup where you can change the post before importing it.

## Build/debug

```sh
# Install node modules
npm install

# Use any of the following commands to build once
npm run build
npm run build:dev

# Or use one of these to build + rebuild on changes
npm run watch
npm run watch:dev
```

After this you can load them in your browser.  
Chrome: `chrome://extensions/` -> "Load unpacked" -> Select `./dist` folder  
Firefox: `about:debugging` -> "Load Temporary Add-on..." -> Select any file in the `./dist` folder (it will load all files)

## Planned features

-   Finishing the initial version of this add-on (see visual design doc for all features)
-   Auto-set tag category when creating a new tag (imported tag)
-   Reverse image search to check whether (similar) file already exist before uploading it
-   Right click any image on a page to import it
-   Configurable list of tags to always ignore (e.g. tagme, highres)
-   [low priority] Import artist commentary
-   [low priority] Import notes
-   [lowest priority] Move from 'options_page' to 'options_ui'
-   [lowest priority] Multiple szurubooru instances (where you can choose to which one you want to upload the post)
-   [lowest priority] Application size could be reduced, but I am not too worried about that because it's all local and zipped it is just 1.2MB

## FAQ

### I can't connect to a szurubooru instance because it complains about CORS

See workaround below.

```apache
# CORS hack
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "POST, GET, OPTIONS"
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

### Why is the content script injected on every page?

Because I didn't know that you can inject a script from the popup (after opening it, so only when needed). I might change this later.

### Why send the DOM to the ILoader instead of just an url?

If we send an URL to the ILoader it has to download the page again itself, which can go wrong in a dozen ways:

1.  The website might be offline now
2.  If the website is a SPA it might not see the same version/content as you did
3.  If you made changes to the DOM but didn't submit them to the server (e.g. edit post page) the ILoader would see a different page (kinda the same as point 2)
4.  If any form of authentication (username+password/client certificate/etc) is involved it gets tricky
5.  We already have the DOM, why download it again?

### Why is the CSS so bad?

Because CSS scares me.
