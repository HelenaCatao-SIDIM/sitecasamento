(() => {
  // ---------- configuração (js/config.js) ----------
  const CFG = window.SITE_CONFIG || {};
  const API = (CFG.apiUrl || "").trim();
  const DEMO_MODE = !API; // sem planilha ligada: convites fictícios e votos de exemplo
  const api = {
    get: (params) => fetch(API + "?" + new URLSearchParams(params)).then((r) => r.json()),
    // texto puro evita a checagem prévia de CORS do navegador com o Apps Script
    post: (body) => fetch(API, { method: "POST", body: JSON.stringify(body) }).then((r) => r.json()),
  };

  // ---------- armazenamento local: o que a pessoa já fez neste aparelho ----------
  const KEY = "hi-site-v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  let state = load();
  state.rasuras = state.rasuras || {};
  state.rsvp = state.rsvp || {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  // identifica o aparelho para "um voto por aparelho"
  state.device = state.device || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  save();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- rasuras: o que está riscado foi omitido ----------
  const pandaPhoto = document.getElementById("pandaPhoto");
  const rasuras = [...document.querySelectorAll("[data-rasura]")].map((wrap) => {
    const key = wrap.dataset.rasura;
    const btn = wrap.querySelector(".struck");
    const panel = document.getElementById(wrap.dataset.panel);
    const soft = wrap.classList.contains("soft");
    const label = btn.dataset.label || btn.textContent.replace("*", "");
    const closedLabel = soft ? `${label}, com nota. Toque para ver.` : `${label}, riscado. Toque para ver o que foi omitido.`;
    btn.setAttribute("aria-label", closedLabel);
    const open = (animate) => {
      wrap.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", `${label}, riscado. Corrigido: ${wrap.querySelector(".hand")?.textContent || "ver abaixo"}.`);
      if (panel) { panel.hidden = false; if (animate) panel.classList.add("show"); }
      if (key === "panda") { pandaPhoto.classList.add("clear"); pandaPhoto.removeAttribute("role"); pandaPhoto.removeAttribute("tabindex"); }
    };
    const close = () => {
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", closedLabel);
      if (panel) { panel.hidden = true; panel.classList.remove("show"); }
      if (key === "panda") { pandaPhoto.classList.remove("clear"); pandaPhoto.setAttribute("role", "button"); pandaPhoto.setAttribute("tabindex", "0"); }
    };
    btn.addEventListener("click", () => {
      if (wrap.classList.contains("open")) return;
      open(true); state.rasuras[key] = true; save();
    });
    return { key, btn, close };
  });
  const pandaBtn = rasuras.find((r) => r.key === "panda").btn;
  pandaPhoto.addEventListener("click", () => pandaBtn.click());
  pandaPhoto.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pandaBtn.click(); } });

  // 19/12: o coração troca as fotos pelas de bebê
  const heartBtn = document.getElementById("heartBtn");
  heartBtn.addEventListener("click", () => {
    const on = heartBtn.closest(".pair").classList.toggle("babies");
    heartBtn.setAttribute("aria-pressed", String(on));
    heartBtn.setAttribute("aria-label", on ? "Voltar para as fotos daquela noite" : "Trocar pelas fotos de bebê");
  });

  // as horas se escrevem sozinhas quando aparecem na tela
  if ("IntersectionObserver" in window && !reduce) {
    const wio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        // observa a frase em volta: o recorte da própria linha a deixaria "invisível" para o observador
        const el = e.target.querySelector(".write");
        el.classList.add("go"); el.classList.remove("wait"); wio.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll(".write").forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("wait"); wio.observe(el.parentElement); }
    });
  }

  // "o pedido!" sobe e ganha força conforme a tela rola
  const cue = document.getElementById("pedidoCue");
  if (cue && !reduce) {
    const base = cue.parentElement;
    let ticking = false;
    const update = () => {
      ticking = false;
      const top = base.getBoundingClientRect().bottom + 35;
      const p = Math.min(1, Math.max(0, (innerHeight - top) / (innerHeight * 0.5)));
      cue.style.opacity = (0.08 + 0.92 * p).toFixed(3);
      cue.style.transform = `translateY(${((1 - p) * 56).toFixed(1)}px) rotate(-4deg)`;
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    update();
  }

  // vídeo pequeno do 7 de janeiro: parado para quem pediu menos movimento
  if (reduce) document.querySelectorAll(".boat video, .vs-clip video").forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });

  // ---------- Cape Town: registros entram ao rolar ----------
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.remove("rise-wait"); io.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll(".rise").forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("rise-wait"); io.observe(el); }
    });
  }

  // ---------- votação do muro ----------
  const OPTIONS = [
    { id: "muro", label: "É o muro", reaction: "Italo agradece por ainda existirem pessoas razoáveis neste país." },
    { id: "reboco", label: "É reboco", reaction: "Seu voto foi registrado. Italo discorda formalmente." },
    { id: "neutro", label: "Prefiro não me envolver", reaction: "Decisão sensata. As relações diplomáticas agradecem." },
  ];
  // Modo demonstração: votos de exemplo. Com a planilha ligada, o total vem dela e começa do zero.
  const DEMO = { muro: 38, reboco: 17, neutro: 5 };
  let serverCounts = null;
  const voteEl = document.getElementById("vote");

  const percents = (counts) => {
    const total = OPTIONS.reduce((s, o) => s + counts[o.id], 0) || 1;
    const raw = OPTIONS.map((o) => (counts[o.id] * 100) / total);
    const base = raw.map(Math.floor);
    let left = 100 - base.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) base[i]++; });
    return base;
  };

  const renderVote = () => {
    const mine = state.voto;
    if (!mine) {
      voteEl.innerHTML = `<h3>Você acredita? <span class="tap-note tap-vote" aria-hidden="true">vote ↓</span></h3><div class="choices">${
        OPTIONS.map((o) => `<button class="choice" type="button" data-vote="${o.id}">${o.label}</button>`).join("")
      }</div><div class="vote-err" id="voteErr" hidden>Não conseguimos registrar seu voto. Tente de novo.</div>`;
      return;
    }
    const counts = DEMO_MODE ? { ...DEMO, [mine]: DEMO[mine] + 1 } : (serverCounts || { muro: 0, reboco: 0, neutro: 0 });
    const pct = percents(counts);
    const chosen = OPTIONS.find((o) => o.id === mine);
    voteEl.innerHTML = `<h3>Você acredita?</h3><div class="results">${
      OPTIONS.map((o, i) => `<div class="res"><span class="pct">${pct[i]}%</span><span class="lbl">${o.label}${o.id === mine ? "<em>seu voto</em>" : ""}</span><span class="bar"><i data-w="${pct[i]}"></i></span></div>`).join("")
    }</div><p class="reaction">${chosen.reaction}</p>`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      voteEl.querySelectorAll(".bar i").forEach((b) => { b.style.width = b.dataset.w + "%"; });
    }));
  };
  voteEl.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-vote]");
    if (!b || state.voto) return;
    const choices = voteEl.querySelectorAll(".choice");
    choices.forEach((c) => (c.disabled = true));
    if (DEMO_MODE) { setTimeout(() => { state.voto = b.dataset.vote; save(); renderVote(); }, 350); return; }
    try {
      const res = await api.post({ action: "votar", opcao: b.dataset.vote, dispositivo: state.device });
      if (!res || !res.votos) throw new Error(res && res.erro);
      serverCounts = res.votos; state.voto = b.dataset.vote; save(); renderVote();
    } catch {
      choices.forEach((c) => (c.disabled = false));
      voteEl.querySelector("#voteErr").hidden = false;
    }
  });
  if (!DEMO_MODE && state.voto) {
    api.get({ action: "votos" }).then((r) => { if (r && r.votos) { serverCounts = r.votos; renderVote(); } }).catch(() => {});
  }
  renderVote();

  // ---------- achados: ponte e macaco ----------
  const EGGS = {
    ponte: {
      title: "Registro de viagem",
      html: `<p class="big">Eles viajaram 600 km pra chegar até essa ponte<br>e o Italo nem pisou nela.</p>
             <figure class="photo"><img src="midia/ponte.jpg" width="1200" height="1600" alt="Ponte suspensa sobre o rio, entre montanhas"></figure>`,
    },
    intro: {
      title: "Antes de começar",
      html: `<p class="big">Este site esconde algumas coisas.</p>
             <p style="margin:0.8rem 0 0">Sempre que aparecer:</p>
             <ul class="intro-list">
               <li>uma palavra <span class="demo-struck">riscada</span></li>
               <li>um asterisco<span class="demo-star">*</span></li>
               <li>um vídeo ou uma etiqueta flutuando <span class="demo-play">▶</span></li>
             </ul>
             <p style="margin:0.6rem 0 0"><strong>toque.</strong> Tem história escondida ali.</p>
             <button class="btn primary" type="button" data-close style="margin-top:1.4rem;width:100%">Entendi, vamos lá</button>`,
    },
    pai: {
      title: "Primeiro encontro",
      html: `<p class="big">Italo atravessou a cidade pra ver Helena…<br>e o pai dela.</p>
             <video class="clip" src="midia/pai.mp4" poster="midia/pai-poster.jpg" controls playsinline autoplay preload="metadata" aria-label="Vídeo: o pai da Helena dança na rua com uma caixa de som"></video>
             <p class="foot" style="margin-top:0.6rem">Sabará, 7 de janeiro de 2022.</p>`,
    },
    romantico: {
      title: "O último romântico",
      html: `<figure class="photo" style="margin-top:1rem"><img src="midia/dia7.jpg" width="600" height="900" style="border-radius:0.8rem" alt="Selfie de Italo com um balão desenhado à mão: um bonequinho de cabelo comprido e os dizeres dia 7"></figure>
             <p class="foot" style="margin-top:0.7rem">*Contando os dias para ver Helena.</p>
             <p class="foot" style="margin-top:0.2rem">Até então, pessoalmente, a gente tinha se visto uma vez.</p>`,
    },
    nadar: {
      title: "Condições adversas",
      html: `<video class="clip" src="midia/nadar.mp4" poster="midia/nadar-poster.jpg" controls playsinline autoplay preload="metadata" aria-label="Vídeo: Italo dirige pela rua alagada e diz: Vamos nadar."></video>
             <p class="foot" style="margin-top:0.6rem">Voltando para casa, 7 de janeiro de 2022.</p>`,
    },
    leoa: {
      title: "Hoedspruit · Kruger",
      html: `<video class="clip" src="midia/leoa-helena.mp4" poster="midia/leoa-helena-poster.jpg" controls playsinline autoplay preload="metadata" aria-label="Vídeo: Helena se esconde no carro do safári enquanto a câmera mostra as leoas"></video>
             <p class="foot" style="margin-top:0.6rem">“Não pode olhar pra leoa, só pelo celular.”</p>`,
    },
    roda: {
      title: "Na volta",
      html: `<figure class="photo"><img src="midia/roda.jpg" width="900" height="1600" alt="Roda do carro de Italo quebrada, com o pneu solto do aro"></figure>
             <p class="foot" style="margin-top:0.6rem">Sabará, 7 de janeiro de 2022.</p>`,
    },
    macaco: {
      title: "Registro anterior · mesmo local",
      html: `<video class="clip" src="midia/macaco.mp4" poster="midia/macaco-poster.jpg" controls playsinline autoplay preload="metadata" aria-label="Vídeo: um babuíno abre a porta de um carro"></video>
             <p class="foot" style="margin-top:0.6rem">Cape Town, 5 de setembro de 2026.</p>`,
    },
  };
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  let lastFocus = null;
  const openModal = (key) => {
    const egg = typeof key === "object" ? key : EGGS[key]; if (!egg) return;
    lastFocus = document.activeElement;
    modalTitle.textContent = egg.title;
    modalBody.innerHTML = egg.html;
    modal.hidden = false;
    (modalBody.querySelector("[data-close]") || modalClose).focus();
  };
  const closeModal = () => {
    modalBody.querySelectorAll("video").forEach((v) => v.pause());
    modal.hidden = true;
    if (lastFocus) lastFocus.focus();
  };
  document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openModal(b.dataset.open)));
  modalClose.addEventListener("click", closeModal);
  modalBody.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  // boas-vindas: uma vez por aparelho, e nunca para quem chega direto num atalho (ex.: #confirmar)
  const showIntro = () => { openModal("intro"); state.introSeen = true; save(); };
  if (!state.introSeen && !location.hash) setTimeout(showIntro, 500);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  // ---------- confirmação por lista de convidados ----------
  // Modo demonstração: convites fictícios. Com a planilha ligada, os convites vêm dela.
  const DEMO_INVITES = [
    { id: "andrade", name: "Família Andrade", by: "Helena",
      guests: [{ id: "a1", name: "Carla Andrade" }, { id: "a2", name: "Rafael Andrade" }, { id: "a3", name: "Lia Andrade", child: true }, { id: "a4", name: "Tomás Andrade", child: true }] },
    { id: "prado", name: "Joana Prado", by: "Italo", guests: [{ id: "p1", name: "Joana Prado" }] },
    { id: "lopes", name: "Pedro e Marina", by: "Helena e Italo", guests: [{ id: "l1", name: "Pedro Lopes" }, { id: "l2", name: "Marina Lopes" }] },
    { id: "costa", name: "Marina Costa", by: "Italo", guests: [{ id: "c1", name: "Marina Costa" }] },
  ];
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const out = document.getElementById("rsvpOut");
  const form = document.getElementById("rsvpForm");
  const nameInput = document.getElementById("rsvpName");

  const find = (q) => {
    const words = norm(q).split(/\s+/).filter((w) => w.length >= 2);
    if (!words.length) return [];
    return DEMO_INVITES.filter((inv) => {
      const hay = norm([inv.name, ...inv.guests.map((g) => g.name)].join(" "));
      return words.every((w) => hay.split(/\s+/).some((t) => t.startsWith(w)));
    });
  };
  let cache = DEMO_MODE ? DEMO_INVITES : [];
  const fromApi = (c) => {
    const inv = { id: String(c.id), name: c.nome, by: c.por || "", guests: (c.pessoas || []).map((p) => ({ id: String(p.id), name: p.nome, child: !!p.crianca })) };
    const ans = c.respostas || {};
    if (inv.guests.length && inv.guests.every((g) => g.id in ans)) {
      state.rsvp[inv.id] = { done: true, answers: Object.fromEntries(inv.guests.map((g) => [g.id, { go: !!ans[g.id].vai, diet: ans[g.id].restricao || "" }])) };
    }
    return inv;
  };
  const waDigits = (CFG.whatsapp || "").replace(/\D/g, "");
  const waText = waDigits ? `+${waDigits.slice(0, 2)} (${waDigits.slice(2, 4)}) ${waDigits.slice(4, -4)}-${waDigits.slice(-4)}` : "[número a confirmar]";
  const byLine = (inv) => `${inv.by} ${inv.by.includes(" e ") ? "convidaram" : "convidou"}:`;

  let draft = null;   // { inviteId, answers: { guestId: { go, diet, showDiet } } }
  let current = null; // convite na tela, para o "Alterar resposta"

  const renderInvite = (inv) => {
    const saved = state.rsvp[inv.id];
    if (!draft || draft.inviteId !== inv.id) {
      draft = { inviteId: inv.id, answers: JSON.parse(JSON.stringify(saved?.answers || {})) };
    }
    const a = draft.answers;
    const allAnswered = inv.guests.every((g) => a[g.id] && typeof a[g.id].go === "boolean");
    out.innerHTML = `<div class="invite">
      <p class="label">Encontramos seu convite</p>
      <p class="name">${esc(inv.name)}</p>
      <p class="by">${esc(byLine(inv))}</p>
      <ul class="guests">${inv.guests.map((g) => {
        const ans = a[g.id] || {};
        const diet = ans.go === true
          ? (ans.showDiet || ans.diet
              ? `<label class="label" for="diet-${g.id}">Restrição alimentar</label><input class="field diet" id="diet-${g.id}" data-diet="${g.id}" type="text" value="${esc(ans.diet || "")}" placeholder="Ex.: vegetariana, alergia a camarão">`
              : `<button class="add-diet" type="button" data-showdiet="${g.id}">Adicionar restrição alimentar</button>`)
          : "";
        return `<li class="guest"><span class="gname">${esc(g.name)}</span>
          <div class="seg" role="group" aria-label="Resposta de ${esc(g.name)}">
            <button type="button" data-ans="${g.id}" data-go="1" aria-pressed="${ans.go === true}">Vou</button>
            <button type="button" data-ans="${g.id}" data-go="0" aria-pressed="${ans.go === false}">Não vou conseguir</button>
          </div>${diet}</li>`;
      }).join("")}</ul>
      <div class="rsvp-actions">
        <button class="btn primary" type="button" id="confirmBtn" ${allAnswered ? "" : "disabled"}>Confirmar</button>
        ${allAnswered ? "" : `<span class="hint">Marque a resposta de cada pessoa.</span>`}
      </div>
    </div>`;
  };

  const renderDone = (inv) => {
    const ans = state.rsvp[inv.id].answers;
    const going = inv.guests.filter((g) => ans[g.id]?.go);
    const notGoing = inv.guests.filter((g) => ans[g.id]?.go === false);
    const head = going.length
      ? `<h4>${going.length > 1 ? "Presenças confirmadas." : "Presença confirmada."}</h4><p class="see">Até 23 de janeiro. 🤎</p>`
      : `<h4>Que pena.</h4><p class="see">Obrigado por avisar.</p>`;
    const list = inv.guests.length > 1
      ? `<ul>${going.map((g) => `<li>${esc(g.name)} · vai${ans[g.id].diet ? ` · ${esc(ans[g.id].diet)}` : ""}</li>`).join("")}${notGoing.map((g) => `<li>${esc(g.name)} · não vai</li>`).join("")}</ul>`
      : "";
    out.innerHTML = `<div class="invite done">${head}${list}
      <div class="rsvp-actions"><button class="link-btn" type="button" id="changeBtn">Alterar resposta</button></div></div>`;
  };

  const show = (inv) => { current = inv.id; draft = null; state.rsvp[inv.id]?.done ? renderDone(inv) : renderInvite(inv); };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = nameInput.value;
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (norm(q).length < 3 || (!DEMO_MODE && words.length < 2)) {
      out.innerHTML = `<p class="hint">Digite seu nome e sobrenome para buscarmos o convite.</p>`;
      return;
    }
    let found;
    if (DEMO_MODE) found = find(q);
    else {
      out.innerHTML = `<p class="hint">Procurando o seu convite…</p>`;
      try {
        const res = await api.get({ action: "buscar", nome: q });
        found = (res.convites || []).map(fromApi);
      } catch {
        out.innerHTML = `<p class="hint">Não conseguimos buscar agora. Tente de novo em instantes.</p>`;
        return;
      }
      cache = found;
    }
    if (found.length === 1) return show(found[0]);
    if (found.length > 1) {
      out.innerHTML = `<p>Encontramos mais de um convite com esse nome. Qual é o seu?</p><div class="pick">${
        found.map((inv) => `<button type="button" data-pick="${inv.id}">${esc(inv.name)}<small>${esc(inv.guests.map((g) => g.name.split(" ")[0]).join(", "))}</small></button>`).join("")
      }</div>`;
      return;
    }
    out.innerHTML = `<div class="notfound"><p style="margin:0">Não encontramos seu convite. Fale com a gente pelo WhatsApp.</p><p class="hint" style="margin:0.4rem 0 0">Helena · ${esc(waText)}</p></div>`;
  });

  out.addEventListener("click", async (e) => {
    const t = e.target;
    const pick = t.closest("[data-pick]");
    if (pick) return show(cache.find((i) => i.id === pick.dataset.pick));
    const inv = draft && cache.find((i) => i.id === draft.inviteId);
    const ansBtn = t.closest("[data-ans]");
    if (ansBtn && inv) {
      const id = ansBtn.dataset.ans;
      draft.answers[id] = { ...(draft.answers[id] || {}), go: ansBtn.dataset.go === "1" };
      renderInvite(inv);
      out.querySelector(`[data-ans="${id}"][data-go="${ansBtn.dataset.go}"]`)?.focus();
      return;
    }
    const sd = t.closest("[data-showdiet]");
    if (sd && inv) {
      draft.answers[sd.dataset.showdiet].showDiet = true;
      renderInvite(inv);
      document.getElementById("diet-" + sd.dataset.showdiet)?.focus();
      return;
    }
    if (t.id === "confirmBtn" && inv) {
      Object.values(draft.answers).forEach((x) => { if (!x.go) x.diet = ""; delete x.showDiet; });
      if (!DEMO_MODE) {
        t.disabled = true; t.textContent = "Enviando…";
        try {
          const res = await api.post({
            action: "confirmar", convite_id: inv.id,
            respostas: inv.guests.map((g) => ({ pessoa_id: g.id, vai: !!draft.answers[g.id].go, restricao: draft.answers[g.id].diet || "" })),
          });
          if (!res || !res.ok) throw new Error(res && res.erro);
        } catch {
          t.disabled = false; t.textContent = "Confirmar";
          out.querySelector(".rsvp-actions").insertAdjacentHTML("beforeend", `<span class="hint">Não conseguimos registrar. Tente de novo.</span>`);
          return;
        }
      }
      state.rsvp[inv.id] = { done: true, answers: draft.answers }; save();
      renderDone(inv);
      const going = inv.guests.filter((g) => draft.answers[g.id]?.go).length;
      const thanks = document.getElementById("thanks");
      thanks.innerHTML = going
        ? `<h2>${going > 1 ? "Presenças confirmadas." : "Presença confirmada."}</h2><p>Até 23 de janeiro. 🤎</p>`
        : `<h2>Que pena.</h2><p>Obrigado por avisar.</p>`;
      thanks.hidden = false;
      setTimeout(() => showView("presentes"), 700);
      return;
    }
    if (t.id === "changeBtn" && current) {
      const invC = cache.find((i) => i.id === current);
      draft = { inviteId: invC.id, answers: JSON.parse(JSON.stringify(state.rsvp[invC.id].answers)) };
      renderInvite(invC);
    }
  });
  out.addEventListener("input", (e) => {
    const d = e.target.dataset.diet;
    if (d && draft) draft.answers[d].diet = e.target.value;
  });

  // ---------- presentes: lista com foto e valor, pago por Pix ----------
  const GIFTS = (CFG.presentes || []).map((g) => ({ ...g, nome: g.nome || "" }));
  const brl = (v) => (typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ [valor]");
  const PIX = CFG.pix || {};
  // Pix copia e cola (BR Code) com o valor do presente
  const crc16 = (str) => {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  };
  const plain = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const pixPayload = (valor) => {
    const f = (id, v) => id + String(v.length).padStart(2, "0") + v;
    const p = f("00", "01") + f("26", f("00", "br.gov.bcb.pix") + f("01", PIX.chave))
      + f("52", "0000") + f("53", "986") + (typeof valor === "number" ? f("54", valor.toFixed(2)) : "")
      + f("58", "BR") + f("59", plain(PIX.titular).slice(0, 25)) + f("60", plain(PIX.cidade || "SABARA").slice(0, 15))
      + f("62", f("05", "***")) + "6304";
    return p + crc16(p);
  };
  const hasPix = !!(PIX.chave && PIX.titular);
  document.getElementById("gifts").innerHTML = GIFTS.map((g) =>
    `<button class="gift" type="button" data-gift="${esc(g.id)}">${g.foto ? `<img class="gift-img" src="midia/${esc(g.foto)}" alt="">` : `<span class="ph">Foto · ${esc(g.nome)}</span>`}<span class="gift-name">${esc(g.nome)}</span><span class="gift-price">${brl(g.valor)}</span></button>`
  ).join("");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-gift]");
    if (!b) return;
    const g = GIFTS.find((x) => x.id === b.dataset.gift);
    const head = g ? `<p class="big">${esc(g.nome)}</p><p style="margin:0.2rem 0 0">${brl(g.valor)}</p>` : `<p class="big">O valor que você quiser</p>`;
    const code = hasPix ? (g ? pixPayload(g.valor) : PIX.chave) : (g ? "[código Pix copia e cola, já com o valor]" : "[chave Pix]");
    openModal({
      title: "Presentear",
      html: `${head}
        <div class="pix">
          ${g ? `<figure class="ph qr" id="pixQr">${hasPix ? "" : "QR Code do Pix"}</figure>` : `<p style="margin:0">Titular: ${hasPix ? esc(PIX.titular) : `<span class="todo">[nome do titular]</span>`}</p>`}
          <span class="label">${g ? "Pix copia e cola" : "Chave Pix"}</span>
          <div class="pix-code" id="pixCode">${esc(code)}</div>
          <button class="btn primary" type="button" data-copy>Copiar</button>
          <p class="foot">Obrigado pelo carinho. 🤎</p>
        </div>`,
    });
    const qr = document.getElementById("pixQr");
    if (qr && hasPix && window.QRCode) {
      qr.classList.remove("ph");
      new window.QRCode(qr, { text: code, width: 176, height: 176, colorDark: "#3A2A1E", colorLight: "#F7F0E4" });
    }
  });
  modalBody.addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]");
    if (!c) return;
    const el = document.getElementById("pixCode");
    const done = () => { c.textContent = "Copiado"; };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); c.textContent = "Selecionado: copie com o menu"; };
    try { navigator.clipboard.writeText(el.textContent).then(done, fallback); } catch { fallback(); }
  });

  // ---------- textos que vêm da configuração ----------
  const fill = (key, html) => document.querySelectorAll(`[data-cfg="${key}"]`).forEach((el) => { el.innerHTML = html; el.classList.remove("todo"); });
  if (CFG.prazoConfirmacao) fill("prazo", esc(CFG.prazoConfirmacao));
  if (waDigits) fill("whatsapp", `<a class="text-link" href="https://wa.me/${waDigits}" target="_blank" rel="noopener">${esc(waText)}</a>`);

  // ---------- links internos e endereço direto ----------
  document.getElementById("enter").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("historia").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });
  // ---------- três páginas: a história, confirmar presença, presentes ----------
  const views = [...document.querySelectorAll(".view")];
  const showView = (name) => {
    views.forEach((v) => { v.hidden = v.dataset.name !== name; });
    document.querySelectorAll(".nav a").forEach((a) => {
      if (a.dataset.view === name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "auto" });
    try { history.replaceState(null, "", name === "historia" ? location.pathname + location.search : "#" + name); } catch {}
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-view]");
    if (!a) return;
    e.preventDefault();
    showView(a.dataset.view);
  });
  const h = location.hash.slice(1);
  if (h === "confirmar" || h === "rsvp") showView("confirmar");
  else if (h === "presentes") showView("presentes");
  else if (h && /^[\w.~-]+$/.test(h) && document.getElementById(h)) {
    requestAnimationFrame(() => document.getElementById(h).scrollIntoView());
  }

  // ---------- recomeçar o protótipo ----------
  if (!DEMO_MODE) document.querySelector(".proto")?.remove();
  document.getElementById("reset")?.addEventListener("click", () => {
    try { localStorage.removeItem(KEY); } catch {}
    state = { rasuras: {}, rsvp: {} }; draft = null; current = null;
    rasuras.forEach((r) => r.close());
    heartBtn.closest(".pair").classList.remove("babies"); heartBtn.setAttribute("aria-pressed", "false");
    renderVote(); out.innerHTML = ""; nameInput.value = "";
    document.getElementById("thanks").hidden = true;
    showView("historia");
    setTimeout(showIntro, 300);
    window.scrollTo({ top: 0, behavior: "auto" });
  });
})();
