# Morcego Budget App

A mobile-first personal budget tracker. Works as a PWA (Progressive Web App) — install it from Safari to the home screen and it behaves like a native app.

## Features

- Monthly budget tracking (Jan–Dec)
- Separate projected vs actual amounts per line item
- Expenses, income, debt, and yearly expenses
- Edit mode to add/remove/rename categories and update projected values
- Per-month notes
- Full dark mode support
- Offline capable (once loaded)
- All data stored locally on device (localStorage)

## Files

```
index.html    — the entire app (self-contained)
manifest.json — PWA manifest (enables "Add to Home Screen")
icon.png      — app icon (add a 192×192 PNG here)
README.md     — this file
```

## Deploying to Netlify (recommended, free)

1. Go to [netlify.com](https://netlify.com) and sign up (free)
2. From the dashboard, drag the entire `morcego-budget` folder onto the deploy area
3. Netlify gives you a URL like `https://your-app.netlify.app`

## Installing on iPhone / iPad

1. Open the Netlify URL in **Safari** (not Chrome)
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add**

The app icon appears on your home screen. Opens full-screen, no browser chrome, works offline after first load.

## Continuing development with Claude Code

```bash
# Install Claude Code (requires Node.js 18+)
npm install -g @anthropic-ai/claude-code

# Navigate to this folder and start Claude Code
cd morcego-budget
claude
```

From there you can ask Claude Code to:
- Add new features (e.g. "add a year-at-a-glance summary view")
- Change the design
- Add export to CSV
- Add push notifications for bill due dates
- Convert to a React/Vite project for easier scaling

## Data storage

All data is saved in `localStorage` under keys prefixed with `mb:`:

| Key         | Contents                        |
|-------------|---------------------------------|
| `mb:data`   | Monthly actuals (by month index)|
| `mb:exp`    | Expense category definitions    |
| `mb:inc`    | Income category definitions     |
| `mb:debt`   | Debt items                      |
| `mb:yearly` | Yearly expense items            |
| `mb:notes`  | Per-month notes                 |

## Adding a custom icon

Replace `icon.png` with a 192×192 PNG image before deploying. Any simple icon works — a dollar sign, a bat (morcego 🦇), whatever you like.
