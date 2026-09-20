const fs = require("fs");
const path = require("path");

const IN = path.join(__dirname, "input");
const OUT = path.join(__dirname, "data.js");

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") {}
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.length === header.length)
    .map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i]])));
}

function parseHouseholdDate(s) {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, d, mo, y, h = "0", mi = "0", se = "0"] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h - 5, +mi - 30, +se));
}
function parseSpotifyDate(s) {
  const d = new Date(s.replace(" ", "T") + "Z");
  return isNaN(d) ? null : d;
}
function parseIndiaDate(s) {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, mo, d, y, h, mi] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h - 5, +mi - 30));
}

const receipts = [];
let rid = 0;
const nextId = (prefix) => `${prefix}_${String(++rid).padStart(4, "0")}`;

function loadHousehold() {
  const csv = fs.readFileSync(path.join(IN, "Daily_Household_Transactions.csv"), "utf8");
  const rows = parseCSV(csv);
  for (const r of rows) {
    const when = parseHouseholdDate(r.Date || "");
    if (!when) continue;
    const title = r.Subcategory || r.Category || "Transaction";
    receipts.push({
      id: nextId("hh"),
      kind: "transaction",
      source: "household",
      title,
      when: when.toISOString(),
      place: r.Mode || "Household",
      people: ["Household"],
      body: `${r.Note || "(no note)"} — ${r.Amount} ${r.Currency} (${r["Income/Expense"] || r.Income_Expense || ""})`,
      category: r.Category || "Other",
      subcategory: r.Subcategory || "",
    });
  }
}

function loadSpotify() {
  const csv = fs.readFileSync(path.join(IN, "spotify_history.csv"), "utf8");
  const rows = parseCSV(csv);
  for (const r of rows) {
    const when = parseSpotifyDate(r.ts || "");
    if (!when) continue;
    const ms = parseInt(r.ms_played, 10);
    if (!ms || ms < 30000) continue;
    receipts.push({
      id: nextId("sp"),
      kind: "music",
      source: "spotify",
      title: r.track_name,
      when: when.toISOString(),
      place: r.platform || "Spotify",
      people: [],
      body: `${r.artist_name} — ${r.album_name} (${Math.round(ms / 1000)}s)`,
      artist: r.artist_name,
      album: r.album_name,
    });
  }
}

function loadIndia() {
  const csv = fs.readFileSync(path.join(IN, "india_transactions.csv"), "utf8");
  const rows = parseCSV(csv);
  for (const r of rows) {
    const when = parseIndiaDate(r.trans_date_trans_time || "");
    if (!when) continue;
    const merchant = r.merchant || r.category || "Transaction";
    receipts.push({
      id: nextId("in"),
      kind: "transaction",
      source: "india",
      title: merchant.replace(/^fraud_/, ""),
      when: when.toISOString(),
      place: r.city || r.state || "India",
      people: [((r.first || "") + " " + (r.last || "")).trim()].filter(Boolean),
      body: `${r.amt} INR — ${r.category || "uncategorized"}`,
      category: r.category || "Other",
    });
  }
}

const THIRTY_MIN = 90* 60 * 1000;

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

function istDay(iso) {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function sourcesOf(rs) {
  return [...new Set(rs.map(r => r.source))].join(" + ");
}
function describeThread(rs) {
    const sources = [...new Set(rs.map(r => r.source))];
    const times = rs.map(r => new Date(r.when).getTime());
    const first = new Date(Math.min(...times));
    const hour = first.getHours();
  
    let timeOfDay = "daytime";
    if (hour < 6) timeOfDay = "early morning";
    else if (hour < 12) timeOfDay = "morning";
    else if (hour < 17) timeOfDay = "afternoon";
    else if (hour < 21) timeOfDay = "evening";
    else timeOfDay = "late night";
  
    // What's the dominant theme?
    const categories = rs.map(r => (r.category || "").toLowerCase()).filter(Boolean);
    const catCount = {};
    categories.forEach(c => { catCount[c] = (catCount[c] || 0) + 1; });
    const topCat = Object.entries(catCount).sort((a,b) => b[1]-a[1])[0]?.[0] || "";
  
    const artists = [...new Set(rs.map(r => r.artist).filter(Boolean))];
    const household = rs.filter(r => r.source === "household");
    const india = rs.filter(r => r.source === "india");
    const spotify = rs.filter(r => r.source === "spotify");
  
    // Cross-source: build a "life moment" title
    if (spotify.length && household.length) {
      if (topCat && topCat !== "other") {
        return `${capitalize(topCat)} and music, ${timeOfDay}`;
      }
      if (artists.length) {
        return `${timeOfDay} with ${artists[0]}`;
      }
      return `Music and chores, ${timeOfDay}`;
    }
  
    if (spotify.length && india.length) {
      if (artists.length) {
        return `${artists[0]}, ${timeOfDay}`;
      }
      return `Soundtrack to a transaction, ${timeOfDay}`;
    }
  
    // Spotify only
    if (spotify.length && artists.length >= 2) {
      return `${timeOfDay} with ${artists[0]} and ${artists[1]}`;
    }
    if (spotify.length && artists.length === 1) {
      return `${timeOfDay} with ${artists[0]}`;
    }
  
    // Household dominant
    if (household.length && household.length >= rs.length / 2) {
      if (topCat && topCat !== "other" && topCat !== "subscription") {
        return `${capitalize(topCat)} run, ${timeOfDay}`;
      }
      if (topCat === "subscription") {
        return `Subscriptions and small bills, ${timeOfDay}`;
      }
      return `Errands, ${timeOfDay}`;
    }
  
    // India dominant
    if (india.length && india.length >= rs.length / 2) {
      if (topCat && topCat !== "other") {
        return `${capitalize(topCat)}, ${timeOfDay}`;
      }
      return `Purchases, ${timeOfDay}`;
    }
  
    // Fallback
    if (topCat && topCat !== "other") {
      return `${capitalize(topCat)}, ${timeOfDay}`;
    }
    return `${timeOfDay}, ${first.toISOString().slice(0, 10)}`;
  }
  
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
function buildThreads(receipts) {
  const threads = [];
  const used = new Set();
  const sorted = [...receipts].sort((a, b) => new Date(a.when) - new Date(b.when));

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue;
    const cluster = [sorted[i]];
    let j = i + 1;
    while (j < sorted.length && cluster.length < 6) {
      const gap = new Date(sorted[j].when) - new Date(cluster[cluster.length - 1].when);
      if (gap > THIRTY_MIN) break;
      if(gap<60*1000){j++;continue;}
      cluster.push(sorted[j]);
      j++;
    }
    if (cluster.length >= 2) {
      cluster.forEach(r => used.add(r.id));
      const a = new Date(cluster[0].when), b = new Date(cluster[cluster.length - 1].when);
      const mins = Math.round((b - a) / 60000);
      const srcs = sourcesOf(cluster);
      threads.push({
        id: "t_sess_" + cluster[0].id,
        title: describeThread(cluster),
        why: `${cluster.length} receipts within a ${mins}-minute window on ${istDay(cluster[0].when)} (${srcs}).`,
        signals: ["time proximity", srcs],
        receiptIds: cluster.map(r => r.id),
      });
      i = j - 1;
    }
  }

  const byDay = groupBy(sorted.filter(r => !used.has(r.id)), r => istDay(r.when));
  for (const [day, group] of byDay) {
    if (group.length < 2 || group.length > 6) continue;
    group.forEach(r => used.add(r.id));
    const srcs = sourcesOf(group);
    threads.push({
      id: "t_day_" + day,
      title: describeThread(group),
      why: `${group.length} receipts on ${day}, spanning ${srcs}.`,
      signals: ["same day", srcs],
      receiptIds: group.map(r => r.id),
    });
  }

  const bySignal = groupBy(sorted.filter(r => !used.has(r.id)), r => {
    if (r.source === "spotify") return `artist:${r.artist}`;
    if (r.subcategory) return `sub:${r.category}/${r.subcategory}`;
    return null;
  });
  for (const [sig, group] of bySignal) {
    const days = new Set(group.map(r => istDay(r.when)));
    if (days.size < 3) continue;
    const pick = group.slice(0, 6);
    if (pick.length < 2) continue;
    pick.forEach(r => used.add(r.id));
    const label = sig.replace(/^artist:/, "").replace(/^sub:/, "");
    const dayList = [...days].sort();
    threads.push({
      id: "t_routine_" + sig.replace(/\W+/g, "_"),
      title: `Recurring: ${label}`,
      why: `Appears on ${days.size} different days (${dayList[0]} … ${dayList[dayList.length - 1]}). A routine, not a one-off.`,
      signals: ["recurrence", label],
      receiptIds: pick.map(r => r.id),
    });
  }

  return threads;
}

loadHousehold();
loadSpotify();
loadIndia();

const threads = buildThreads(receipts);

// Rank threads: prefer cross-source threads and larger threads
threads.sort((a, b) => {
    const scoreA = (a.signals.join(" ").includes(" + ") ? 1000 : 0) + a.receiptIds.length * 10;
    const scoreB = (b.signals.join(" ").includes(" + ") ? 1000 : 0) + b.receiptIds.length * 10;
    return scoreB - scoreA;
  });
  
  // Keep only the top 40 threads
  const topThreads = threads.slice(0, 20);
  
  // Keep only receipts that appear in those threads
  const usedIds = new Set(topThreads.flatMap(t => t.receiptIds));
  const topReceipts = receipts.filter(r => usedIds.has(r.id));
  
  const out = `// Auto-generated by build.js — do not edit
  const receipts = ${JSON.stringify(topReceipts, null, 2)};
  const threads = ${JSON.stringify(topThreads, null, 2)};
  `;
  
  fs.writeFileSync(OUT, out);
  console.log(`Wrote ${topReceipts.length} receipts and ${topThreads.length} threads to ${OUT}`);
