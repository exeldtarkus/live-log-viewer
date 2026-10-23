# Live Log Viewer

English | [Bahasa Indonesia](README.id.md)

A VS Code extension that opens `.log` and `.log.gz` files in a viewer with per-level colors, text / regex / level filters, live tail and, for JSON logs, a Kibana-like table with field filters.

![Raw mode with level colors and stack traces](images/screenshots/raw.png)

## Features

- **Opens `*.log` and `*.log.gz` by default.** The normal text editor is still available via **Reopen Editor With…**.
- **Level colors**: FATAL (also CRITICAL), ERROR (ERR), WARN (WARNING), INFO, DEBUG, TRACE. The level is taken from the JSON fields `level` / `severity` / `log.level`, or from a level word in plain text. Lines without a level (stack traces, continuation lines) inherit the level of the line above.
- **Filters**: text, regex (`.*`), level dropdown; the counter shows `shown / total`.
- **Live tail**: the file is polled every 0.5 s and only new lines are appended. A truncated or rotated file is reloaded.
- **Raw mode**: line numbers (stay visible when scrolling horizontally), horizontal + vertical scroll, click a line to wrap / unwrap it.
- **Table mode** for JSON logs (Kibana Discover style): field sidebar, columns, expandable rows, ⊕ / ⊖ cell filters, filter pills, "+ Add filter" with **is one of** / **is not one of**.
- **`.log.gz`**: decompressed in memory (streaming), never extracted to disk.
- **Status bar `Logs: N`** with a quick list / full list of all log files in the workspace.

## Installation

From source:

```bash
npm install
npm run install:local   # builds the VSIX and installs it if the version changed (add -- --force to reinstall)
```

Then run **Developer: Reload Window**.

Or build the package and install it manually:

```bash
npm run package
code --install-extension live-log-viewer-<version>.vsix
```

## Usage

### 1. Open a log file

Open any `*.log` or `*.log.gz` file from the Explorer; it opens in **Live Log Viewer**. To see the plain text instead, use **Reopen Editor With…** → **Text Editor**.

The toolbar, from left to right:

| Control | What it does |
| --- | --- |
| **Raw \| Table** | Switch view mode (Table is greyed out unless at least half the lines are JSON objects) |
| **Filter by text…** | Case-insensitive text filter |
| **.\*** | Treat the filter text as a regular expression (an invalid regex gets a red border) |
| **All levels** | Show only one level |
| **Live** | Checked (default): new lines appear and the view follows the end. Unchecked: the view is paused; new lines are collected and shown when you check it again |
| `shown / total` | Number of lines shown after filtering / lines loaded |

### 2. Raw mode, filters and Live

Type in the filter box, tick `.*` for a regex, and pick a level. Stack-trace lines inherit the level of the line above, so filtering on **ERROR** keeps each exception together with its stack trace. Uncheck **Live** to stop the view from jumping to the end while you read.

![Raw mode with regex filter, ERROR level and Live paused](images/screenshots/raw-filter.png)

Click a line to wrap it (click again to unwrap). Line numbers stay visible when you scroll sideways.

### 3. Table mode (JSON logs)

Click **Table**. The left sidebar lists **Selected fields** (the columns) and **Available fields**, each with the number of lines that have it. Tick a field to add it as a column, untick to remove it. **Reset** in the *Selected fields* header restores the default columns (timestamp, level, message). The table scrolls horizontally inside its own area and the header stays visible.

![Table mode with extra columns](images/screenshots/table.png)

Click a row to expand it as pretty-printed JSON; click again to collapse.

![Expanded row](images/screenshots/table-expand.png)

### 4. Field filters: ⊕ / ⊖ and pills

Hover a cell to show **⊕** (filter for this value) and **⊖** (filter out this value). Each filter appears as a pill under the toolbar and matching cells are highlighted.

- Click a pill to toggle it between include and **NOT**.
- Click **×** on a pill to remove it.
- Long pills are cut with … ; hover for the full text.

![Pills "level: INFO" and "NOT thread: main", with the ⊕ / ⊖ buttons on a cell](images/screenshots/table-pills.png)

Field filters also apply in Raw mode (non-JSON lines such as stack traces follow the JSON line above them).

### 5. "+ Add filter": is one of / is not one of

Click **+ Add filter**, choose a field and an operator (**is one of** or **is not one of**), then tick one or more values. Values are listed most frequent first (top 500) with their counts; use **Search values…** to find one. Click **Add filter**.

![Add filter popup](images/screenshots/add-filter.png)

![Result: pill "level: is one of WARN, ERROR"](images/screenshots/add-filter-result.png)

### 6. Reset buttons

- **Reset filters** (toolbar): removes all pills and clears the text, regex and level filters.
- **Reset** (*Selected fields* header): restores the default columns.

### 7. `.log.gz` archives

`.log.gz` files open the same way. They are decompressed in memory and never extracted to disk. Archives do not change, so they are not watched (Live has no effect).

![A .log.gz archive in Table mode, filtered on ERROR](images/screenshots/gz.png)

### 8. Status bar and the log file list

The status bar shows **Logs: N**, the number of `*.log` / `*.log.gz` files in the workspace (`node_modules` excluded, max 5000). It is hidden when there are none and updates when log files are created or deleted.

Click it:

- **10 files or fewer**: a quick pick with name, folder, size and modified time (newest first), plus an **Open full view…** entry.
- **More than 10 files**: the **Log Files** tab opens directly. Files are grouped by folder with size and modified time; use the search box to filter and **Refresh** to rescan. Click a file to open it in the viewer.

![Log Files tab](images/screenshots/log-files.png)

### 9. Commands

| Command | Description |
| --- | --- |
| `Live Log Viewer: Open File Logs…` | Same as clicking the status bar item |
| `Live Log Viewer: Show All Log Files` | Open the **Log Files** tab |

Errors are written to the **Live Log Viewer** output channel (**View → Output**).

## Limitations

- Only the last 20 MB of a file is read when it is opened (also the last 20 MB of a decompressed `.gz`).
- The viewer keeps the last 100,000 lines and renders them without virtual scrolling.
- Table mode shows top-level JSON fields only; nested objects are shown as JSON text.
- The "+ Add filter" popup lists the top 500 values of a field (use ⊕ / ⊖ for others).
- Only the `*.log.gz` pattern is recognized, not names like `app.log.1.gz`.
- Filter pills, the view mode and the columns are not remembered after the tab is closed.

## Development

```bash
npm install
npm run compile          # TypeScript -> out/
npm run watch            # compile on change
npm test                 # compile + unit tests (node --test)
npm run package          # build the .vsix (vsce)
npm run install:local    # build + install into your local VS Code (add -- --force to reinstall the same version)
node scripts/screenshots.js   # regenerate images/screenshots/*.png (needs playwright-core + Chromium; run npm run compile first)
```

## License

MIT
