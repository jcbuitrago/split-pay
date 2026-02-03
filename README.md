# Split-Pay: Simple Bill Splitter

A tiny, single-page web app to split a restaurant bill fairly among people. Works entirely in the browser using [index.html](index.html), [style.css](style.css), and [app.js](app.js). No backend or account required.

## Features

- **People management:** Add each diner’s name.
- **Products with price:** Add items consumed with their price.
- **Assign consumers:** For each product, check who consumed it (one or many).
- **Tax (%):** Enter a tax percentage; prices are adjusted before splitting.
- **Fair split:** Each product’s cost is split equally among its checked consumers; totals are summed per person.
- **Lightweight:** No data leaves your browser; no persistence by default.

## How To Use

1. **Add people:** In the People section, enter a name and click “Add person” (press Enter to quick-add).
2. **Add products:** Enter product name and price, then “Add product” (Enter works too).
3. **Mark consumption:** In the products table, tick the checkboxes under each person who consumed that item.
4. **Enter tax (optional):** In Split → Tax (%), input a number like `8.5`. Empty/invalid values are treated as `0`.
5. **Split bill:** Click “Split bill” to see each person’s total.

Notes:
- Unassigned products (no consumers checked) are ignored in the split.
- Currency is displayed to two decimals.

## Quick Start

Open locally in a browser or serve via a simple static server.

### PowerShell (open file directly)

```powershell
Start-Process "$env:USERPROFILE\hello-world-web\index.html"
```

### Python (if installed)

```powershell
cd "$env:USERPROFILE\hello-world-web"
python -m http.server 8000
```
Visit http://localhost:8000

### Node (if installed)

```powershell
cd "$env:USERPROFILE\hello-world-web"
npx serve -p 8000
```
Visit http://localhost:8000

## Deploy to GitHub Pages

1. Initialize git, commit, and push to a GitHub repo on branch `main`.
2. On GitHub: Repo → Settings → Pages → Source: "Deploy from a branch"; Branch: `main`; Folder: `/ (root)`.
3. Wait for the Pages build, then open the published URL (usually `https://<user>.github.io/<repo>/`).
