const state = {
    view: "home",
    threadId: null,
    receiptId: null,
    returnTo: null,
  };
  
  const $ = (sel) => document.querySelector(sel);
  const byId = (arr, id) => arr.find((x) => x.id === id);
  
  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  threads.sort((a, b) => {
    const aFirst = receipts.find(r => r.id === a.receiptIds[0])?.when || "";
    const bFirst = receipts.find(r => r.id === b.receiptIds[0])?.when || "";
    return new Date(bFirst) - new Date(aFirst);
  });
  function fmtWhen(iso) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  
  function render() {
    const app = $("#app");
    const title = $("#title");
    const backBtn = $("#backBtn");
  
    app.innerHTML = "";
  
    if (state.view === "home") {
      title.textContent = "Memory Threads";
      backBtn.hidden = true;
      app.appendChild(renderHome());
    } else if (state.view === "thread") {
      const t = byId(threads, state.threadId);
      title.textContent = t.title;
      backBtn.hidden = false;
      backBtn.onclick = () => { state.view = "home"; render(); };
      app.appendChild(renderThread(t));
    } else if (state.view === "receipt") {
      const r = byId(receipts, state.receiptId);
      title.textContent = r.title;
      backBtn.hidden = false;
      backBtn.onclick = () => {
        if (state.returnTo === "thread" && state.threadId) {
          state.view = "thread";
        } else {
          state.view = "home";
        }
        render();
      };
      app.appendChild(renderReceipt(r));
    }
  }
  
  function renderHome() {
    const frag = document.createDocumentFragment();
  
    const summary = document.createElement("div");
    summary.className = "summary";
    summary.innerHTML = `
      <h2>Your library</h2>
      <div class="big">${receipts.length} receipts · ${threads.length} memory threads</div>
      <div class="sub">Threads are groups of receipts that describe one moment, routine, or phase.</div>
    `;
    frag.appendChild(summary);
    if (threads[0]) {
        const featured = threads[0];
        const hero = document.createElement("div");
        hero.className = "summary";
        hero.style.borderColor = "var(--accent)";
        hero.style.cursor = "pointer";
        hero.innerHTML = `
          <h2>Featured thread</h2>
          <div class="big" style="font-size:18px;">${featured.title}</div>
          <div class="sub">${featured.why}</div>
        `;
        hero.onclick = () => { state.view = "thread"; state.threadId = featured.id; render(); };
        frag.appendChild(hero);
      }
  
    const label = document.createElement("div");
    label.className = "section-label";
    label.textContent = "Memory Threads";
    frag.appendChild(label);
  
    const list = document.createElement("div");
    list.className = "thread-list";
  
    threads.forEach((t) => {
      const card = document.createElement("div");
      card.className = "thread-card";
      card.innerHTML = `
        <h3>${t.title}<span class="count">${t.receiptIds.length} receipts</span></h3>
     <div class="meta">${t.receiptIds.length} receipts · ${fmtDate(receipts.find(r => r.id === t.receiptIds[0])?.when)}</div>
        <div class="why">${t.why}</div>
      `;
      card.onclick = () => {
        state.view = "thread";
        state.threadId = t.id;
        render();
      };
      list.appendChild(card);
    });
  
    frag.appendChild(list);
    return frag;
  }
  
  function renderThread(t) {
    const frag = document.createDocumentFragment();
  
    const header = document.createElement("div");
    header.className = "summary";
    header.innerHTML = `
      <h2>Why these receipts are grouped</h2>
      <div class="sub" style="font-size:14px;color:var(--text);margin-top:6px;">${t.why}</div>
      <div class="sub" style="margin-top:10px;">Signals: ${t.signals.join(", ")}</div>
    `;
    frag.appendChild(header);
  
    const label = document.createElement("div");
    label.className = "section-label";
    label.textContent = `Receipts in this thread (${t.receiptIds.length})`;
    frag.appendChild(label);
  
    const list = document.createElement("div");
    list.className = "receipt-list";
  
    t.receiptIds.forEach((rid) => {
      const r = byId(receipts, rid);
      if (!r) return;
      const el = document.createElement("div");
      el.className = "receipt";
      el.innerHTML = `
        <div class="kind">${r.kind}</div>
        <div class="title">${r.title}</div>
        <div class="when">${fmtWhen(r.when)} · ${r.place}</div>
      `;
      el.onclick = () => {
        state.view = "receipt";
        state.receiptId = r.id;
        state.returnTo = "thread";
        render();
      };
      list.appendChild(el);
    });
  
    frag.appendChild(list);
    return frag;
  }
  
  function renderReceipt(r) {
    const detail = document.createElement("div");
    detail.className = "receipt-detail";
    detail.innerHTML = `
      <div class="kind">${r.kind}</div>
      <h2>${r.title}</h2>
      <dl>
        <dt>When</dt><dd>${fmtWhen(r.when)}</dd>
        <dt>Where</dt><dd>${r.place}</dd>
        <dt>People</dt><dd>${(r.people || []).join(", ") || "—"}</dd>
      </dl>
      <div class="body">${r.body}</div>
      <div class="link-row">
        <button id="backToThread">Back to thread</button>
      </div>
    `;
    queueMicrotask(() => {
      const btn = detail.querySelector("#backToThread");
      if (btn) btn.onclick = () => { state.view = "thread"; render(); };
    });
    return detail;
  }
  
  render();