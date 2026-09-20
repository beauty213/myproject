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
## Challenges & Solutions

- **Three different date formats** across sources (D/M/Y, M/D/Y, ISO) → wrote three separate parsers that normalize to UTC.
- **Cross-source grouping.** A Spotify play and a household purchase rarely share a timestamp by accident — implemented a 90-minute window rule.
- **Too many threads.** 100k+ receipts produced 20,875 threads → ranked by cross-source strength and capped at 20.

## Future Work

- Light mode toggle
- Merge/split threads manually
- Save favourite threads to localStorage
- Export a thread as an image
