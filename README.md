# Homework Hub (PWA)

A tiny, installable web app for Chromebooks that tracks assignments offline.
- Add title, subject, due date, and priority
- Filter (Today / This Week / All / Overdue / Done) + Search + Sort
- Mark done, edit, delete
- Export/Import JSON or CSV
- Works offline; installable (PWA)

## How to use on a school Chromebook
1. Copy this folder to Google Drive **or** host it (GitHub Pages works great).
2. Open `index.html` in Chrome.
3. Click the ⋮ menu → **Install Homework Hub** (or the **Install** button at the top).
4. It becomes an app icon and works offline.

### GitHub Pages (free hosting)
- Create a repository named `homework-hub`.
- Upload these files.
- In Settings → Pages → set the branch to `main` and the root.
- Visit the URL GitHub gives you and click **Install**.

### Local file tip
Chromebooks sometimes restrict local file access for service workers.
If `Install` doesn’t appear from a local file path, host it (GitHub Pages) or use a local web server.

## Shortcuts
- `/` → focus search
- `N` → focus new title box

Your data is stored in `localStorage` on the device.