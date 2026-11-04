// ===== 唯一需要修改的地方 =====
window.SBGOV_CONFIG = {
  API_BASE: "https://api.sbgov.tw",
  TURNSTILE_SITEKEY: "0x4AAAAAAFz0DT7MQ8tNo_UV",
};

(function () {
  const cfg = window.SBGOV_CONFIG;
  let applyWidgetId = null;
  let statusWidgetId = null;
  let reportWidgetId = null;
  const tokens = { apply: "", status: "", report: "" };

  function initTurnstile() {
    if (typeof turnstile === "undefined") return;

    applyWidgetId = turnstile.render("#apply-turnstile", {
      sitekey: cfg.TURNSTILE_SITEKEY, action: "apply", theme: "light",
      callback: (t) => { tokens.apply = t; },
      "expired-callback": () => { tokens.apply = ""; },
      "error-callback": () => { tokens.apply = ""; },
    });

    statusWidgetId = turnstile.render("#status-turnstile", {
      sitekey: cfg.TURNSTILE_SITEKEY, action: "status", theme: "light",
      callback: (t) => { tokens.status = t; },
      "expired-callback": () => { tokens.status = ""; },
      "error-callback": () => { tokens.status = ""; },
    });

    reportWidgetId = turnstile.render("#report-turnstile", {
      sitekey: cfg.TURNSTILE_SITEKEY, action: "report", theme: "light",
      callback: (t) => { tokens.report = t; },
      "expired-callback": () => { tokens.report = ""; },
      "error-callback": () => { tokens.report = ""; },
    });
  }

  async function apiPost(path, payload) {
    try {
      const r = await fetch(cfg.API_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await r.json();
    } catch (e) {
      return { ok: false, error: "網路錯誤 / Network Error: " + e };
    }
  }

  function setupTabs() {
    const applyBtn = document.getElementById("tab-apply");
    const statusBtn = document.getElementById("tab-status");
    const applyPanel = document.getElementById("panel-apply");
    const statusPanel = document.getElementById("panel-status");
    if (!applyBtn || !statusBtn) return;

    const activeCls = ["border-b-2", "border-slate-900", "font-semibold"];
    const inactiveCls = ["text-slate-400"];

    function setActive(a, b, show, hide) {
      show.classList.remove("hidden"); hide.classList.add("hidden");
      a.classList.add(...activeCls); a.classList.remove(...inactiveCls);
      b.classList.remove(...activeCls); b.classList.add(...inactiveCls);
    }

    applyBtn.onclick = () => {
      setActive(applyBtn, statusBtn, applyPanel, statusPanel);
      if (applyWidgetId) turnstile.reset(applyWidgetId); tokens.apply = "";
    };
    statusBtn.onclick = () => {
      setActive(statusBtn, applyBtn, statusPanel, applyPanel);
      if (statusWidgetId) turnstile.reset(statusWidgetId); tokens.status = "";
    };
  }

  function bindApply(opts) {
    const btn = document.getElementById("apply-go");
    if (!btn) return;
    btn.onclick = async () => {
      const sub = document.getElementById("apply-sub").value.trim().toLowerCase();
      const tgt = document.getElementById("apply-tgt").value.trim().toLowerCase();
      const contact = document.getElementById("apply-contact").value.trim();
      const msg = document.getElementById("apply-msg");

      if (!tokens.apply) {
        msg.className = "text-sm text-amber-600"; msg.textContent = opts.waitTurnstile || "請先完成人機驗證"; return;
      }
      msg.className = "text-sm text-slate-400"; msg.textContent = opts.loading || "提交中…";
      const j = await apiPost("/api/apply", {
        subdomain: sub, github_target: tgt, contact: contact, turnstile_token: tokens.apply,
      });
      tokens.apply = ""; if (applyWidgetId) turnstile.reset(applyWidgetId);
      msg.className = "text-sm " + (j.ok ? "text-green-600" : "text-red-600");
      msg.textContent = j.ok ? (opts.success || j.message) : (j.error || opts.fail || "提交失敗");
    };
  }

  function bindStatus(opts) {
    const btn = document.getElementById("status-go");
    if (!btn) return;
    btn.onclick = async () => {
      const sub = document.getElementById("status-sub").value.trim().toLowerCase();
      const out = document.getElementById("status-out");
      if (!tokens.status) { out.innerHTML = `<p class="text-amber-600">${opts.waitTurnstile || "請先完成人機驗證"}</p>`; return; }
      out.innerHTML = `<p class="text-slate-400">${opts.loading || "查詢中…"}</p>`;
      const j = await apiPost("/api/status", { subdomain: sub, turnstile_token: tokens.status });
      tokens.status = ""; if (statusWidgetId) turnstile.reset(statusWidgetId);
      if (!j.ok) { out.innerHTML = `<p class="text-red-600">${j.error}</p>`; return; }
      const d = j.data;
      const label = (opts.labels && opts.labels[d.status]) || [d.status, ""];
      out.innerHTML = `
        <p>${opts.subdomainLabel || "子網域"}：<b>${d.subdomain}.sbgov.tw</b></p>
        <p>${opts.statusLabel || "狀態"}：<span class="${label[1]} font-semibold">${label[0]}</span></p>
        ${d.blocked ? `<p class="text-red-700 font-semibold">${opts.blockedLabel || "此子網域已被封禁"}</p>` : ""}
        ${d.status === "rejected" && d.reject_reason ? `<p class="text-slate-600">${opts.reasonLabel || "原因"}：${d.reject_reason}</p>` : ""}
        <p class="text-slate-400">${opts.timeLabel || "申請時間"}：${d.created_at}</p>`;
    };
  }

  function bindReport(opts) {
    const btn = document.getElementById("report-go");
    if (!btn) return;
    btn.onclick = async () => {
      const sub = document.getElementById("report-sub").value.trim().toLowerCase();
      const reason = document.getElementById("report-reason").value.trim();
      const contact = document.getElementById("report-contact").value.trim();
      const msg = document.getElementById("report-msg");

      if (!tokens.report) {
        msg.className = "text-sm text-amber-600"; msg.textContent = opts.waitTurnstile || "請先完成人機驗證"; return;
      }
      msg.className = "text-sm text-slate-400"; msg.textContent = opts.loading || "提交中…";
      const j = await apiPost("/api/report", {
        subdomain: sub, reason: reason, contact: contact, turnstile_token: tokens.report,
      });
      tokens.report = ""; if (reportWidgetId) turnstile.reset(reportWidgetId);
      msg.className = "text-sm " + (j.ok ? "text-green-600" : "text-red-600");
      msg.textContent = j.ok ? (opts.success || j.message) : (j.error || opts.fail || "提交失敗");
      
      if (j.ok) {
        document.getElementById("report-sub").value = "";
        document.getElementById("report-reason").value = "";
        document.getElementById("report-contact").value = "";
      }
    };
  }

  window.SBGOV = { initTurnstile, apiPost, setupTabs, bindApply, bindStatus, bindReport };
})();
