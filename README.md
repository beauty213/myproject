# Memory Threads

A focused web app that groups personal "life receipts" into **Memory Threads** — clusters of 2 to 6 receipts that appear to describe one real-life moment, routine, or life phase.

Each thread explains *why* its receipts belong together, so you always understand the connection.

---

## What it does

- Reads three personal data sources:
  - **Spotify history** — tracks you actually listened to
  - **Household transactions** — daily spending and routines
  - **India transactions** — merchant and category records
- Groups them into **Memory Threads** using three transparent rules:
  1. **Session** — receipts within 90 minutes of each other
  2. **Same day** — 2 to 6 receipts on one calendar date
  3. **Recurrence** — same artist or category appearing on 3+ different days
- Displays each thread with a plain-English explanation of the grouping logic
- Lets you drill into any individual receipt for its full detail

No backend. No authentication. No AI chatbot. No graph physics.

---

## Try it live

**Netlify:** [https://thunderous-brigadeiros-35a3c5.netlify.app](https://thunderous-brigadeiros-35a3c5.netlify.app)

**GitHub Pages:** *(add your URL once Pages is enabled)*

---

## Project structure

    project/
    ├── index.html            # Single-page shell
    ├── styles.css            # All styling
    ├── app.js                # UI logic (3-view state machine)
    ├── build.js              # Node script: parses CSVs, generates data.js
    ├── data.js               # Generated — receipts and threads
    ├── README.md             # This file
    └── input/
        ├── Daily_Household_Transactions.csv
        ├── spotify_history.csv
        └── india_transactions.csv

---

## How it works

### 1. Ingestion (`build.js`)

The build script reads three CSV files and normalizes them into a single `receipts` array. Each receipt has a shared shape:

    {
      id: "sp_0042",
      kind: "music" | "transaction",
      source: "spotify" | "household" | "india",
      title: "Moonage Daydream - 2012 Remaster",
      when: "2016-12-11T01:12:00.000Z",
      place: "iOS",
      people: [],
      body: "David Bowie — The Rise and Fall of Ziggy Stardust (181s)"
    }

Three date parsers handle the three different date formats:

- Household: `D/M/YYYY H:mm:ss` (Indian format)
- Spotify: `YYYY-MM-DD HH:mm:ss` (ISO, UTC)
- India: `M/D/YYYY H:mm` (US format)

All timestamps are normalized to UTC, then displayed back in local time.

### 2. Grouping

Three rules run in sequence. Each receipt is used by at most one thread.

**Rule 1 — Session.** Sorts receipts chronologically, clusters any that occur within 90 minutes of each other (max 6 per cluster).

**Rule 2 — Same day.** Groups remaining receipts by calendar day (IST). Only kept if 2–6 receipts fall on the same day.

**Rule 3 — Recurrence.** Groups remaining receipts by artist (Spotify) or category/subcategory (transactions). Only kept if they appear on 3+ distinct days.

### 3. Ranking and capping

Threads are scored by:

- **+1000** if the thread spans multiple data sources (Spotify + household, etc.)
- **+10 per receipt** in the thread

The top 20 threads are kept. Only receipts inside those threads are emitted. This keeps the home screen readable and the payload small.

### 4. Rendering (`app.js`)

A three-state machine:

    home → thread → receipt

- **Home**: summary + featured thread + thread list
- **Thread**: "Why these receipts are grouped" + receipt list
- **Receipt**: full detail (when, where, people, body)

Back button is contextual: from a receipt, it returns to the parent thread; from a thread, it returns home.

---

## Running locally

Requires **Node.js v18 or later**.

    # 1. Rebuild data.js from the CSVs in input/
    node build.js

    # 2. Serve the folder (any static server works)
    python3 -m http.server 8000

    # 3. Open http://localhost:8000

Or simply open `index.html` directly in a browser.

---

## Design principles

- **Feasibility over features.** No backend, no auth, no uploads.
- **Clarity over quantity.** Explanations are first-class, not an afterthought.
- **Honest signals only.** Threads are grouped by time proximity, shared source, and recurrence — never by invented narrative.
- **Static-first.** The entire app runs from three files and one generated data file.

---

## Limitations

- All data is processed locally at build time. The app is read-only.
- Thread grouping uses simple heuristics, not machine learning.
- Cross-source threads only fire when receipts from different sources genuinely share a time window.
- The `is_fraud` column in the India dataset is parsed but not used for grouping.

---

## License

MIT
