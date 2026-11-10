# LinkedIn Feed Off

A Chrome and Edge extension that **disables the LinkedIn home feed and other people's profiles**, so you can use LinkedIn for jobs and keeping your own profile up to date — without the infinite scroll or profile browsing.

## Download and install

This extension isn't on the Chrome Web Store, so you install it straight from
this repository. It takes about a minute.

### 1. Download the extension

**Option A — ZIP (no tools needed)**

1. Near the top of this page, click the green **Code** button.
2. Click **Download ZIP**.
3. Unzip the file. You'll get a folder named `linkedin-feed-off-main`.
   Move it somewhere permanent (for example, your Documents folder) —
   Chrome loads the extension from this folder, so if you delete or move it
   later, the extension stops working.

**Option B — Git**

```sh
git clone https://github.com/frederick-lu-code/linkedin-feed-off.git
```

### 2. Add it to Chrome

1. Open a new tab and go to `chrome://extensions`
   (in Microsoft Edge: `edge://extensions`).
2. Turn on **Developer mode** (top-right toggle in Chrome; left sidebar in Edge).
3. Click **Load unpacked**.
4. Select the folder you downloaded — the one that directly contains
   `manifest.json`. (If you used the ZIP and see another folder inside with
   the same name, pick the inner one.)
5. Refresh any open LinkedIn tabs.

**LinkedIn Feed Off** now appears in your extensions list. To keep its icon handy,
click the puzzle-piece **Extensions** button in the toolbar and pin it.

### Updating

Download the latest version the same way and replace your old folder's
contents (or run `git pull`), then click the reload ↻ icon on the
extension's card in `chrome://extensions`.

### Uninstalling

Click **Remove** on the extension's card in `chrome://extensions`, then
delete the folder.

> Chrome may show a "Disable developer mode extensions" notice at startup.
> That's normal for extensions installed this way — click the X to dismiss it.

## What it does

Blocked on Home:

- The main feed (posts, suggested content, infinite scroll)
- The “Start a post” composer on the feed page

Blocked everywhere (on by default, can be turned off in the popup):

- Other people's profiles (`/in/...`), including their activity and details pages
- My Network and "People you may know"
- People search and "All" search results
- A company's or school's **People** tab
- The "People also viewed" sidebar on your own profile

Allowed:

- Jobs: search, listings, applications, and company pages
- Your own profile, including editing it
- Messaging and notifications
- Login and account pages
- A specific post opened from a notification (`/feed/update/...`)

### How it recognises your own profile

When you open a profile, the extension asks LinkedIn (using your existing
signed-in session) which profile is yours, and only that one is shown.
Nothing is sent anywhere other than LinkedIn. The answer is cached in the
browser so your profile opens instantly next time. If LinkedIn can't confirm
it — for example, when you're signed out — the profile stays hidden.

### Settings

Click the toolbar icon to:

- turn the whole extension off temporarily, or
- switch **Block other profiles** off while leaving the feed disabled.
