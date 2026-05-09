# HabitBoard React PWA

A spreadsheet-style habit tracker built with React + Vite, now with PWA support for desktop and phone.

## Features
- Monthly habit board with days in columns
- Edit, rename, delete habits
- Theme personalization in settings
- JSON export and import
- Working dashboard summary charts and mini day cards
- Installable PWA on supported browsers

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## PWA notes
- On Chrome/Edge desktop, open the app and use the install button in the address bar.
- On Android Chrome, use Add to Home Screen / Install App.
- Service worker and manifest are included.

## Data
- Data is stored locally in the browser.
- You can export everything as JSON from the app settings.
