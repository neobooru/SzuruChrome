# Developer notes

## How does it work?

This add-on has three parts.  
The first part is the popup, which is what pops up when you click on the logo.

The second part is a content script which is injected on the page you visit. This script tries to find importable content on the current page and sends this to the popup.

The third part is the background script which handles the upload functionality. This was previously part of the popup, but has since been moved to the background script.

### The popup

When opened (when you click on the add-on logo in your browser) it sends a message to the content script injected on the current page (active tab). This message asks the content script to scrape the DOM and return a SzuruPost element (with a source, contentUrl, safety, and a list of tags). Once it receives this element it renders it in the popup where you can make changes before importing it. When you click on the "Upload" button the SzuruPost will be sent to the background script which will handle the upload functionality. This is done so that the upload continues even after you close the popup. This means that you can close the popup after clicking the "Upload" button, and it'll continue with the upload.

### The content script

This script is injected on every page and does absolutely nothing until it receives the 'grab_post' message from the popup. When it does receive this message it checks if there are any loaders available to scrape this page. If a matching loader is found it'll pass the DOM of this page to the loader. The loader then uses the DOM to fill (as much as possible) a SzuruPost object. The SzuruPost is then passed back to the popup where you can change the post before importing it.

### The background script

This script handles the uploading of a post. It will also update a tag's category in your szurubooru instance when it differs from what is imported.

## F.A.Q

### Why send the DOM to the ILoader instead of just a URL?

If we send a URL to the ILoader it has to download the page again itself, which can go wrong in a dozen ways:

1.  The website might be offline now
2.  If the website is an SPA it might not see the same version/content as you did
3.  If you made changes to the DOM but didn't submit them to the server (e.g. edit post page) the ILoader would see a different page (kinda the same as point 2)
4.  If any form of authentication (username+password/client certificate/etc.) is involved it gets tricky
5.  We already have the DOM, why download it again?
