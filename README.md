# Memory Threads

**Live demo:** [https://thunderous-brigadeiros-35a3c5.netlify.app](https://thunderous-brigadeiros-35a3c5.netlify.app)

Groups personal life receipts (Spotify, household, India transactions) into explainable clusters called Memory Threads.

## Why this is different

Every other "personal data" app just shows a list.

Memory Threads **tells you why items belong together** — with a plain-English explanation on every cluster:

> *"6 receipts within an 81-minute window on 2016-12-11 (household + spotify)."*

No black-box AI. No invented narrative. Transparent rules you can read in the source.

The twist: **threads span data sources** — a Spotify play, a household transaction, and an India purchase from the same evening are grouped as one moment, not three.

## How it works

### 1. Three data sources come in

The project reads three CSVs, each with its own date format:

- **Spotify history** — `YYYY-MM-DD HH:mm:ss` (UTC)
- **Household transactions** — `D/M/YYYY H:mm:ss` (India format)
- **India transactions** — `M/D/YYYY H:mm` (US format)

Each is parsed into one shared receipt shape:

    {
      id: "sp_0042",
      kind: "music",
      source: "spotify",
      title: "Moonage Daydream",
      when: "2016-12-11T01:12:00.000Z",
      place: "iOS",
      people: [],
      body: "David Bowie — Ziggy Stardust (181s)"
    }

### 2. The build script groups them

`build.js` runs three rules in order. Each receipt belongs to at most one thread.

1. **Session rule** — sorts all receipts by time, then clusters any that occur within 90 minutes of each other (max 6 per cluster).
2. **Same-day rule** — groups remaining receipts by calendar day. Only kept if 2–6 land on the same date.
3. **Recurrence rule** — groups remaining receipts by artist (Spotify) or category (transactions). Only kept if they appear on 3 or more distinct days.

### 3. Threads are ranked and capped

Every thread gets a score:

- **+1000** if it spans multiple data sources (e.g. Spotify + household)
- **+10 per receipt** inside it

The top 20 threads are kept. Only receipts that appear inside those threads are saved. This keeps the page fast and the home screen readable.

### 4. The UI renders three views

`app.js` is a small state machine:

    home → thread → receipt

- **Home** — summary, computed story, search bar, filter chips, featured thread, thread list
- **Thread** — explanation of *why* the receipts are grouped, then the list of receipts
- **Receipt** — full detail (when, where, people, body)

The back button is context-aware: from a receipt it returns to the parent thread; from a thread it returns home.

### 5. Everything is static

There is no backend, no API, no database, no authentication. `build.js` runs once to produce `data.js`. After that, the app is three files served from any static host.

    index.html + styles.css + app.js + data.js

---

## Why this is different

Most "personal data" apps show a chronological list. Memory Threads does three things differently:

1. **Cross-source threads.** A Spotify play, a household transaction, and an India purchase from the same evening become one moment — not three separate records.
2. **Explainable grouping.** Every thread prints *why* its receipts belong together, in plain English. The rules are readable in `build.js`. No black-box model, no invented narrative.
3. **Computed insights.** The app doesn't just display data — it surfaces patterns: which year was dominated by music vs. spending, the peak hour of activity, and how many threads cross data sources.

---

## Tech stack

- **Vanilla JavaScript** — no framework, tiny payload, fast load
- **Node.js** — only used by `build.js` to pre-process the CSVs
- **Static hosting** — Netlify or GitHub Pages, no server required

---

## Rules used to group receipts

| Rule | Trigger | Cap |
|------|---------|-----|
| Session | Receipts within 90 minutes | 6 per thread |
| Same day | 2–6 receipts on one date | — |
| Recurrence | Same artist/category on 3+ days | 6 per thread |

## Challenges & Solutions

- **Three different date formats** across sources (D/M/Y, M/D/Y, ISO) → wrote three separate parsers that normalize to UTC.
- **Cross-source grouping.** A Spotify play and a household purchase rarely share a timestamp by accident — implemented a 90-minute window rule.
- **Too many threads.** 100k+ receipts produced 20,875 threads → ranked by cross-source strength and capped at 20.

## Future Work

- Light mode toggle
- Merge/split threads manually
- Save favourite threads to localStorage
- Export a thread as an image
