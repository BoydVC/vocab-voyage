(function () {
  "use strict";

  const STORE_KEY = "vocab-voyage.progress";
  const VIEWS = ["home", "map", "play", "progress", "about"];
  const MODES = [
    { id: "flash", name: "Flash cards", blurb: "Tap to flip · definition & roots" },
    { id: "mc", name: "Multiple choice", blurb: "Pick the best meaning" },
    { id: "blank", name: "Fill-in-the-blank", blurb: "Complete the sentence" },
    { id: "speed", name: "Speed run", blurb: "Race the clock · 60s" },
    { id: "write", name: "Writing nudge", blurb: "Use it in a sentence · self-check" },
  ];

  function loadWords() {
    if (window.__WORDS__ && window.__WORDS__.packs) return window.__WORDS__;
    return {
      meta: { title: "Vocab Voyage", label: "EXAMPLE deck", disclaimer: "EXAMPLE only" },
      packs: [],
    };
  }

  const DATA = loadWords();

  function defaultProgress() {
    return {
      stars: 0,
      streak: 0,
      lastPlayDay: null,
      seen: {},
      mastered: {},
      packStars: {},
      sessions: 0,
      correct: 0,
      attempts: 0,
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultProgress();
      return Object.assign(defaultProgress(), JSON.parse(raw));
    } catch (_) {
      return defaultProgress();
    }
  }

  function saveProgress(p) {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  }

  let progress = loadProgress();
  let state = {
    packId: DATA.packs[0] ? DATA.packs[0].id : null,
    mode: "flash",
    queue: [],
    idx: 0,
    score: 0,
    answered: 0,
    flipped: false,
    speedLeft: 60,
    speedTimer: null,
    writingWord: null,
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function packById(id) {
    return DATA.packs.find((p) => p.id === id) || DATA.packs[0];
  }

  function allWords() {
    return DATA.packs.flatMap((p) => p.words.map((w) => Object.assign({ packId: p.id }, w)));
  }

  function dayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function bumpStreak() {
    const today = dayKey();
    if (progress.lastPlayDay === today) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yk = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate();
    progress.streak = progress.lastPlayDay === yk ? progress.streak + 1 : 1;
    progress.lastPlayDay = today;
    saveProgress(progress);
  }

  function award(stars, wordId, ok) {
    progress.stars += stars;
    progress.attempts += 1;
    if (ok) {
      progress.correct += 1;
      progress.seen[wordId] = (progress.seen[wordId] || 0) + 1;
      if ((progress.seen[wordId] || 0) >= 2) progress.mastered[wordId] = true;
    }
    const pack = state.packId;
    progress.packStars[pack] = (progress.packStars[pack] || 0) + stars;
    bumpStreak();
    saveProgress(progress);
    paintChrome();
  }

  function packMastery(pack) {
    const ids = pack.words.map((w) => w.id);
    const m = ids.filter((id) => progress.mastered[id]).length;
    return { done: m, total: ids.length, pct: ids.length ? Math.round((m / ids.length) * 100) : 0 };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function paintChrome() {
    $("#streakPill").textContent = "🔥 " + progress.streak + " streak";
    $("#starsPill").textContent = "⭐ " + progress.stars;
    const n = allWords().length;
    $("#footWords").textContent = n + " EXAMPLE words · " + DATA.packs.length + " packs";
  }

  function setView(name) {
    if (!VIEWS.includes(name)) name = "home";
    VIEWS.forEach((v) => {
      const el = $("#view-" + v);
      const tab = $('.tab[data-view="' + v + '"]');
      if (el) {
        const on = v === name;
        el.classList.toggle("active", on);
        el.hidden = !on;
      }
      if (tab) {
        tab.classList.toggle("active", v === name);
        tab.setAttribute("aria-selected", v === name ? "true" : "false");
      }
    });
    if (location.hash.replace(/^#/, "") !== name) {
      history.replaceState(null, "", "#" + name);
    }
    if (name === "home") renderHome();
    if (name === "map") renderMap();
    if (name === "play") renderPlayShell();
    if (name === "progress") renderProgress();
  }

  function renderHome() {
    const mastered = Object.keys(progress.mastered).length;
    const total = allWords().length;
    $("#homeStats").innerHTML =
      '<div class="stat"><b>' + progress.stars + '</b><span>stars</span></div>' +
      '<div class="stat"><b>' + progress.streak + '</b><span>day streak</span></div>' +
      '<div class="stat"><b>' + mastered + '/' + total + '</b><span>mastered</span></div>';
    $("#homeHint").textContent =
      mastered === 0
        ? "Pick an island on the Map — every deck is labeled EXAMPLE."
        : "Nice progress! Keep sailing — " + (total - mastered) + " EXAMPLE words left to master.";

    $("#homeIslands").innerHTML = DATA.packs
      .map((p) => {
        const m = packMastery(p);
        return (
          '<button type="button" class="island-card" data-pack="' + p.id + '">' +
          '<span class="ico">' + p.emoji + '</span>' +
          '<strong>' + p.name + '</strong>' +
          '<small>EXAMPLE · ' + p.words.length + ' words · ' + m.pct + '% mastered</small>' +
          "</button>"
        );
      })
      .join("");

    $("#homeModes").innerHTML = MODES.map(
      (m) =>
        '<button type="button" class="mode-card" data-mode="' + m.id + '">' +
        "<strong>" + m.name + "</strong>" +
        "<small>" + m.blurb + "</small></button>"
    ).join("");

    $$("#homeIslands .island-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.packId = btn.getAttribute("data-pack");
        state.mode = "mc";
        setView("play");
        startVoyage();
      });
    });
    $$("#homeModes .mode-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.getAttribute("data-mode");
        setView("play");
        renderPlayShell();
      });
    });
  }

  function renderMap() {
    const ocean = $("#oceanMap");
    ocean.innerHTML = DATA.packs
      .map((p) => {
        const m = packMastery(p);
        return (
          '<div class="island" data-pack="' + p.id + '" style="border-color:' + p.color + '66">' +
          '<span class="badge">EXAMPLE</span>' +
          '<div class="big">' + p.emoji + '</div>' +
          '<h4 style="color:' + p.color + '">' + p.name + '</h4>' +
          '<p>' + p.blurb + '</p>' +
          '<p style="margin-top:.4rem"><strong>' + p.words.length + '</strong> words · ' + m.done + '/' + m.total + ' mastered</p>' +
          '<div class="bar"><i style="width:' + m.pct + '%;background:' + p.color + '"></i></div>' +
          "</div>"
        );
      })
      .join("");
    $$(".island", ocean).forEach((el) => {
      el.addEventListener("click", () => {
        state.packId = el.getAttribute("data-pack");
        setView("play");
        renderPlayShell();
      });
    });
  }

  function renderPlayShell() {
    const sel = $("#packSelect");
    sel.innerHTML = DATA.packs
      .map(
        (p) =>
          '<option value="' + p.id + '"' + (p.id === state.packId ? " selected" : "") + ">" +
          p.emoji + " " + p.name + " (EXAMPLE · " + p.words.length + ")</option>"
      )
      .join("");
    $("#modeSelect").value = state.mode;
    $("#playSetup").hidden = false;
    $("#playArena").hidden = true;
    $("#playDone").hidden = true;
    stopSpeed();
  }

  function startVoyage() {
    state.packId = $("#packSelect").value || state.packId;
    state.mode = $("#modeSelect").value || state.mode;
    const pack = packById(state.packId);
    if (!pack) return;
    state.queue = shuffle(pack.words);
    if (state.mode === "speed") state.queue = shuffle(pack.words.concat(pack.words)).slice(0, 20);
    if (state.mode === "write") state.queue = shuffle(pack.words).slice(0, 3);
    if (state.mode === "flash") state.queue = pack.words.slice();
    state.idx = 0;
    state.score = 0;
    state.answered = 0;
    state.flipped = false;
    progress.sessions += 1;
    saveProgress(progress);
    $("#playSetup").hidden = true;
    $("#playDone").hidden = true;
    $("#playArena").hidden = false;
    if (state.mode === "speed") {
      state.speedLeft = 60;
      startSpeed();
    }
    renderCard();
  }

  function stopSpeed() {
    if (state.speedTimer) {
      clearInterval(state.speedTimer);
      state.speedTimer = null;
    }
  }

  function startSpeed() {
    stopSpeed();
    state.speedTimer = setInterval(() => {
      state.speedLeft -= 1;
      const bar = $(".speed-progress > i");
      if (bar) bar.style.width = Math.max(0, (state.speedLeft / 60) * 100) + "%";
      const t = $("#speedClock");
      if (t) t.textContent = state.speedLeft + "s";
      if (state.speedLeft <= 0) {
        stopSpeed();
        finishVoyage();
      }
    }, 1000);
  }

  function currentWord() {
    return state.queue[state.idx];
  }

  function renderCard() {
    const w = currentWord();
    const pack = packById(state.packId);
    if (!w) {
      finishVoyage();
      return;
    }
    $("#playMeta").textContent =
      pack.emoji + " " + pack.name + " · " + MODES.find((m) => m.id === state.mode).name +
      " · " + (state.idx + 1) + "/" + state.queue.length;
    $("#playScore").textContent = "Score " + state.score + (state.mode === "speed" ? " · " : "");
    if (state.mode === "speed") {
      $("#playScore").innerHTML =
        'Score ' + state.score + ' · <span class="timer" id="speedClock">' + state.speedLeft + "s</span>";
    }

    const body = $("#playBody");
    const actions = $("#playActions");
    actions.innerHTML = "";

    if (state.mode === "flash") renderFlash(body, actions, w, pack);
    else if (state.mode === "mc" || state.mode === "speed") renderMC(body, actions, w, pack);
    else if (state.mode === "blank") renderBlank(body, actions, w, pack);
    else if (state.mode === "write") renderWrite(body, actions, w, pack);
  }

  function renderFlash(body, actions, w, pack) {
    body.innerHTML =
      '<div class="play-card flash-card' + (state.flipped ? " flipped" : "") + '" id="flashCard">' +
      (state.mode === "speed" ? "" : "") +
      '<div class="flash-front">' +
      '<p class="pos">' + w.pos + " · EXAMPLE word</p>" +
      '<p class="word-big">' + w.word + "</p>" +
      '<p class="hint">Tap flip to see the meaning</p>' +
      "</div>" +
      '<div class="flash-back">' +
      '<p class="pos">' + w.pos + "</p>" +
      '<p class="word-big" style="font-size:1.4rem">' + w.word + "</p>" +
      '<p class="def">' + w.def + "</p>" +
      (w.root ? '<span class="root-chip">Root tip: ' + w.root + "</span>" : "") +
      '<p class="hint" style="margin-top:.75rem">e.g. ' + w.sentence + "</p>" +
      "</div></div>";
    actions.innerHTML =
      '<button type="button" class="btn primary" id="btnFlip">Flip</button>' +
      '<button type="button" class="btn ghost" id="btnKnow">I know it ⭐</button>' +
      '<button type="button" class="btn ghost" id="btnLearn">Still learning</button>';
    $("#btnFlip").onclick = () => {
      state.flipped = !state.flipped;
      $("#flashCard").classList.toggle("flipped", state.flipped);
    };
    $("#flashCard").onclick = () => {
      state.flipped = !state.flipped;
      $("#flashCard").classList.toggle("flipped", state.flipped);
    };
    $("#btnKnow").onclick = () => {
      award(2, w.id, true);
      nextCard();
    };
    $("#btnLearn").onclick = () => {
      award(0, w.id, false);
      nextCard();
    };
  }

  function distractors(w) {
    const pool = allWords()
      .filter((x) => x.id !== w.id)
      .map((x) => x.def);
    return shuffle(pool).slice(0, 3);
  }

  function renderMC(body, actions, w) {
    const opts = shuffle([w.def].concat(distractors(w)));
    body.innerHTML =
      (state.mode === "speed"
        ? '<div class="speed-progress"><i style="width:' + (state.speedLeft / 60) * 100 + '%"></i></div>'
        : "") +
      '<div class="play-card">' +
      '<p class="pos">' + w.pos + " · EXAMPLE</p>" +
      '<p class="word-big">' + w.word + "</p>" +
      '<p class="hint">What does it mean?</p>' +
      '<div class="choices" id="choices">' +
      opts
        .map(
          (o, i) =>
            '<button type="button" class="choice" data-i="' + i + '" data-def="' +
            o.replace(/"/g, "&quot;") + '">' + o + "</button>"
        )
        .join("") +
      "</div><div id=\"fb\"></div></div>";
    actions.innerHTML = "";
    let locked = false;
    $$("#choices .choice").forEach((btn) => {
      btn.onclick = () => {
        if (locked) return;
        locked = true;
        const ok = btn.getAttribute("data-def") === w.def;
        btn.classList.add(ok ? "correct" : "wrong");
        $$("#choices .choice").forEach((b) => {
          if (b.getAttribute("data-def") === w.def) b.classList.add("correct");
        });
        $("#fb").innerHTML =
          '<div class="feedback ' + (ok ? "ok" : "bad") + '">' +
          (ok ? "Nice! +2 ⭐" : "Almost — meaning: " + w.def) +
          "</div>";
        award(ok ? 2 : 0, w.id, ok);
        if (ok) state.score += 2;
        state.answered += 1;
        setTimeout(nextCard, ok ? 650 : 1100);
      };
    });
  }

  function renderBlank(body, actions, w) {
    body.innerHTML =
      '<div class="play-card">' +
      '<p class="pos">Fill in the blank · EXAMPLE</p>' +
      '<p class="def" style="font-size:1.15rem">' + w.blank + "</p>" +
      '<p class="hint">Hint: ' + w.def + "</p>" +
      '<input class="blank-input" id="blankIn" autocomplete="off" placeholder="Type the word…" spellcheck="false">' +
      '<div id="fb"></div></div>';
    actions.innerHTML =
      '<button type="button" class="btn primary" id="btnCheck">Check</button>' +
      '<button type="button" class="btn ghost" id="btnSkip">Skip</button>';
    const check = () => {
      const val = ($("#blankIn").value || "").trim().toLowerCase();
      const ok = val === w.word.toLowerCase();
      $("#fb").innerHTML =
        '<div class="feedback ' + (ok ? "ok" : "bad") + '">' +
        (ok ? "Spot on! +3 ⭐" : "The word is <strong>" + w.word + "</strong>") +
        "</div>";
      award(ok ? 3 : 0, w.id, ok);
      if (ok) state.score += 3;
      state.answered += 1;
      $("#btnCheck").disabled = true;
      setTimeout(nextCard, ok ? 700 : 1200);
    };
    $("#btnCheck").onclick = check;
    $("#blankIn").onkeydown = (e) => {
      if (e.key === "Enter") check();
    };
    $("#btnSkip").onclick = () => {
      award(0, w.id, false);
      nextCard();
    };
    setTimeout(() => $("#blankIn").focus(), 50);
  }

  function renderWrite(body, actions, w) {
    state.writingWord = w;
    body.innerHTML =
      '<div class="play-card">' +
      '<p class="pos">Writing nudge · EXAMPLE word</p>' +
      '<p class="word-big">' + w.word + "</p>" +
      '<p class="def">' + w.def + "</p>" +
      '<p class="hint" style="margin:.75rem 0">' + w.prompt + "</p>" +
      '<label class="field"><span>Your sentence</span>' +
      '<textarea id="writeIn" placeholder="Write 1–2 clear sentences…"></textarea></label>' +
      '<div class="rubric"><strong>Self-check rubric</strong> (not AI grading — you decide):' +
      '<div class="checkboxes" id="rubricBox">' +
      '<label><input type="checkbox" data-r="1"> I used <em>' + w.word + '</em> correctly</label>' +
      '<label><input type="checkbox" data-r="2"> My sentence has a clear subject + verb</label>' +
      '<label><input type="checkbox" data-r="3"> A reader could guess the meaning from context</label>' +
      '<label><input type="checkbox" data-r="4"> Capitalization &amp; end punctuation look right</label>' +
      "</div></div></div>";
    actions.innerHTML =
      '<button type="button" class="btn primary" id="btnWriteDone">Save &amp; next ⭐</button>' +
      '<button type="button" class="btn ghost" id="btnWriteSkip">Skip</button>';
    $("#btnWriteDone").onclick = () => {
      const checks = $$('#rubricBox input[type="checkbox"]').filter((c) => c.checked).length;
      const text = ($("#writeIn").value || "").trim();
      const stars = text.length > 8 ? Math.min(4, 1 + checks) : 0;
      award(stars, w.id, stars > 0);
      state.score += stars;
      state.answered += 1;
      nextCard();
    };
    $("#btnWriteSkip").onclick = () => nextCard();
  }

  function nextCard() {
    state.flipped = false;
    state.idx += 1;
    if (state.idx >= state.queue.length) finishVoyage();
    else renderCard();
  }

  function finishVoyage() {
    stopSpeed();
    $("#playArena").hidden = true;
    $("#playDone").hidden = false;
    const m = packMastery(packById(state.packId));
    $("#doneStats").innerHTML =
      '<div class="stat"><b>' + state.score + '</b><span>stars this run</span></div>' +
      '<div class="stat"><b>' + state.answered + '</b><span>answered</span></div>' +
      '<div class="stat"><b>' + m.pct + '%</b><span>pack mastery</span></div>';
    paintChrome();
  }

  function renderProgress() {
    const mastered = Object.keys(progress.mastered).length;
    const total = allWords().length;
    const acc = progress.attempts ? Math.round((progress.correct / progress.attempts) * 100) : 0;
    $("#progressStats").innerHTML =
      '<div class="stat"><b>' + progress.stars + '</b><span>total stars</span></div>' +
      '<div class="stat"><b>' + progress.streak + '</b><span>day streak</span></div>' +
      '<div class="stat"><b>' + mastered + '/' + total + '</b><span>EXAMPLE words mastered</span></div>' +
      '<div class="stat"><b>' + acc + '%</b><span>accuracy</span></div>' +
      '<div class="stat"><b>' + progress.sessions + '</b><span>sessions</span></div>';
    $("#progressPacks").innerHTML = DATA.packs
      .map((p) => {
        const m = packMastery(p);
        return (
          '<div class="prog-row">' +
          "<span>" + p.emoji + "</span>" +
          "<div><strong>" + p.name + '</strong> <span class="hint">EXAMPLE</span>' +
          '<div class="bar"><i style="width:' + m.pct + '%"></i></div></div>' +
          "<span>" + m.done + "/" + m.total + "</span></div>"
        );
      })
      .join("");
  }

  function wire() {
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => setView(tab.getAttribute("data-view")));
    });
    $$("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.getAttribute("data-goto")));
    });
    $("#btnQuickPlay").addEventListener("click", () => {
      state.mode = "mc";
      state.packId = DATA.packs[0] && DATA.packs[0].id;
      setView("play");
      startVoyage();
    });
    $("#btnStart").addEventListener("click", startVoyage);
    $("#btnQuit").addEventListener("click", () => {
      stopSpeed();
      renderPlayShell();
    });
    $("#btnAgain").addEventListener("click", () => {
      renderPlayShell();
      startVoyage();
    });
    $("#packSelect").addEventListener("change", () => {
      state.packId = $("#packSelect").value;
    });
    $("#modeSelect").addEventListener("change", () => {
      state.mode = $("#modeSelect").value;
    });
    $("#btnResetProgress").addEventListener("click", () => {
      if (confirm("Reset all Vocab Voyage progress on this device?")) {
        progress = defaultProgress();
        saveProgress(progress);
        paintChrome();
        renderProgress();
      }
    });
    window.addEventListener("hashchange", () => {
      setView(location.hash.replace(/^#/, "") || "home");
    });
  }

  wire();
  paintChrome();
  setView(location.hash.replace(/^#/, "") || "home");
})();
