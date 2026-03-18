// ==UserScript==
// @name         Hook playstar (Cocos)
// @namespace    http://tampermonkey.net/
// @version      2026-03-18
// @description  Hook playstar and print decoded result payload
// @author       You
// @match        https://download-hongkong.aixbofhe.com/PSS-ON-*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=aixbofhe.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  "use strict";

  function inject(code) {
    const s = document.createElement("script");
    s.textContent = code;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  }

  inject(`
  (function () {
    "use strict";

    const HOOK_MARK = "__tm_hooked_decodeResultRecall__";
    const PANEL_ID = "__tm_decode_panel__";
    const MAX_ITEMS = 20;
    let panelReady = false;
    let panelListEl = null;
    let panelStatusEl = null;
    let allRecords = [];

    function enableDrag(panel, handle) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;

      handle.style.cursor = "move";
      handle.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        if (e.target && e.target.tagName === "BUTTON") return;
        dragging = true;
        const rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        panel.style.left = rect.left + "px";
        panel.style.top = rect.top + "px";
        panel.style.right = "auto";
        document.body.style.userSelect = "none";
      });

      window.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
        const nextLeft = Math.min(maxLeft, Math.max(0, startLeft + dx));
        const nextTop = Math.min(maxTop, Math.max(0, startTop + dy));
        panel.style.left = nextLeft + "px";
        panel.style.top = nextTop + "px";
      });

      window.addEventListener("mouseup", function () {
        if (!dragging) return;
        dragging = false;
        document.body.style.userSelect = "";
      });
    }

    function safeStringify(obj) {
      return JSON.stringify(
        obj,
        function (_k, value) {
          if (typeof value === "bigint") return value.toString();
          return value;
        },
        2
      );
    }

    function downloadJson(text, filename) {
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }

    async function saveJsonToPickedDir(dirHandle, text, filename) {
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(text);
      await writable.close();
    }

    function makeStamp() {
      const d = new Date();
      const pad = function (n) { return String(n).padStart(2, "0"); };
      return (
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) + "_" +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds()) + "_" +
        String(d.getMilliseconds()).padStart(3, "0")
      );
    }

    function ensurePanel() {
      if (panelReady) return true;
      const root = document.body || document.documentElement;
      if (!root) return false;

      let panel = document.getElementById(PANEL_ID);
      if (!panel) {
        panel = document.createElement("div");
        panel.id = PANEL_ID;
        panel.style.cssText = [
          "position:fixed",
          "top:10px",
          "right:10px",
          "width:300px",
          "max-height:42vh",
          "z-index:2147483647",
          "background:rgba(0,0,0,0.82)",
          "color:#b8ffba",
          "font:11px/1.35 Consolas,Monaco,monospace",
          "border:1px solid rgba(184,255,186,0.5)",
          "border-radius:8px",
          "box-shadow:0 6px 20px rgba(0,0,0,0.35)",
          "pointer-events:auto",
          "overflow:hidden"
        ].join(";");

        const header = document.createElement("div");
        header.style.cssText = "display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(184,255,186,0.08);border-bottom:1px solid rgba(184,255,186,0.3)";
        const title = document.createElement("strong");
        title.textContent = "playstar HOOK";
        title.style.cssText = "flex:1 1 auto;color:#d6ffd8";
        panelStatusEl = document.createElement("span");
        panelStatusEl.textContent = "waiting...";
        panelStatusEl.style.cssText = "opacity:.8";
        const clearBtn = document.createElement("button");
        clearBtn.textContent = "Clear";
        clearBtn.style.cssText = "border:1px solid #7bbf7d;background:#0f2c10;color:#b8ffba;border-radius:4px;padding:1px 5px;cursor:pointer";
        clearBtn.onclick = function () {
          allRecords = [];
          if (panelListEl) panelListEl.innerHTML = "";
          if (panelStatusEl) panelStatusEl.textContent = "hits: 0";
        };
        const downloadAllBtn = document.createElement("button");
        downloadAllBtn.textContent = "Download All";
        downloadAllBtn.style.cssText = "border:1px solid #7bbf7d;background:#0f2c10;color:#b8ffba;border-radius:4px;padding:1px 5px;cursor:pointer";
        downloadAllBtn.onclick = async function () {
          if (!allRecords.length) return;
          const stamp = makeStamp();
          if (window.showDirectoryPicker) {
            try {
              const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
              for (let i = 0; i < allRecords.length; i++) {
                const idx = String(i + 1).padStart(3, "0");
                const filename = "decodeResultRecall_" + stamp + "_" + idx + ".json";
                await saveJsonToPickedDir(dirHandle, safeStringify(allRecords[i]), filename);
              }
              return;
            } catch (e) {
              console.warn("[TM hook] directory picker canceled or failed, fallback to browser download:", e);
            }
          }
          for (let i = 0; i < allRecords.length; i++) {
            const idx = String(i + 1).padStart(3, "0");
            downloadJson(safeStringify(allRecords[i]), "decodeResultRecall_" + stamp + "_" + idx + ".json");
          }
        };
        header.appendChild(title);
        header.appendChild(panelStatusEl);
        header.appendChild(downloadAllBtn);
        header.appendChild(clearBtn);

        panelListEl = document.createElement("div");
        panelListEl.style.cssText = "max-height:calc(42vh - 34px);overflow:auto;padding:6px;word-break:break-all";

        panel.appendChild(header);
        panel.appendChild(panelListEl);
        root.appendChild(panel);
        enableDrag(panel, header);
      } else {
        panelListEl = panel.querySelector(".__tm_list__") || panel.children[1];
        panelStatusEl = panel.querySelector("span") || null;
      }

      panelReady = !!panelListEl;
      return panelReady;
    }

    function addPanelItem(decoded) {
      if (!ensurePanel()) return;
      const wrap = document.createElement("div");
      wrap.style.cssText = "margin:0 0 6px 0;padding:6px;border:1px solid rgba(184,255,186,0.25);border-radius:6px;background:rgba(255,255,255,0.03)";
      const jsonText = safeStringify(decoded);
      allRecords.unshift(decoded);
      while (allRecords.length > MAX_ITEMS) allRecords.pop();

      const ts = document.createElement("div");
      ts.style.cssText = "margin-bottom:0;color:#d6ffd8;cursor:pointer;user-select:none";
      const titleTime = new Date().toLocaleTimeString();
      const setTitle = function (opened) {
        ts.textContent = "[" + titleTime + "] decoded object " + (opened ? "(click to collapse)" : "(click to expand)");
      };
      setTitle(false);

      const pre = document.createElement("pre");
      pre.style.cssText = "margin:6px 0 0 0;white-space:pre-wrap;color:#b8ffba;font-size:10px;line-height:1.3;display:none";
      pre.textContent = jsonText;

      ts.onclick = function () {
        const opened = pre.style.display !== "none";
        pre.style.display = opened ? "none" : "block";
        setTitle(!opened);
      };

      wrap.appendChild(ts);
      wrap.appendChild(pre);

      panelListEl.insertBefore(wrap, panelListEl.firstChild);
      while (panelListEl.childNodes.length > MAX_ITEMS) {
        panelListEl.removeChild(panelListEl.lastChild);
      }
      if (panelStatusEl) panelStatusEl.textContent = "hits: " + panelListEl.childNodes.length;
    }

    function patchDecodeResultRecall(target, sourceTag) {
      if (!target || typeof target.decodeResultRecall !== "function") return false;
      if (target.decodeResultRecall[HOOK_MARK]) return true;

      const original = target.decodeResultRecall;
      const wrapped = function (bytes) {
        let decoded;
        try {
          decoded = original.apply(this, arguments);
        } catch (err) {
          console.error("[TM hook] decodeResultRecall threw:", err);
          throw err;
        }

        try {
          console.groupCollapsed("[TM hook] decodeResultRecall hit");
          console.log("decoded object:", decoded);
          console.groupEnd();
          addPanelItem(decoded);
        } catch (logErr) {
          console.warn("[TM hook] log failed:", logErr);
        }

        return decoded;
      };

      try {
        Object.defineProperty(wrapped, "name", { value: "decodeResultRecall_hooked" });
      } catch (e) {}
      wrapped[HOOK_MARK] = true;
      wrapped.__original__ = original;
      target.decodeResultRecall = wrapped;
      console.log("[TM hook] patched decodeResultRecall from", sourceTag, target);
      return true;
    }

    function tryPatchObject(obj, tag) {
      try {
        return patchDecodeResultRecall(obj, tag);
      } catch (e) {
        return false;
      }
    }

    function hookSystemRegister() {
      if (!window.System || typeof window.System.register !== "function") return false;
      if (window.System.register.__tm_wrapped__) return true;

      const originalRegister = window.System.register;
      window.System.register = function () {
        const args = Array.prototype.slice.call(arguments);
        const declareIdx = args.length === 3 ? 2 : 1;
        const declare = args[declareIdx];
        const modName = typeof args[0] === "string" ? args[0] : "<anonymous>";

        if (typeof declare === "function") {
          args[declareIdx] = function (_export, _context) {
            const safeExport = function (name, value) {
              if (name === "decodeResultRecall" && typeof value === "function") {
                const holder = { decodeResultRecall: value };
                patchDecodeResultRecall(holder, "System.export:" + modName + ":" + name);
                value = holder.decodeResultRecall;
              }
              tryPatchObject(value, "System.exportValue:" + modName + ":" + name);
              return _export(name, value);
            };

            const declared = declare(safeExport, _context);

            if (declared && Array.isArray(declared.setters)) {
              declared.setters = declared.setters.map(function (setter, idx) {
                if (typeof setter !== "function") return setter;
                return function (depModule) {
                  tryPatchObject(depModule, "System.setter:" + modName + "#dep" + idx);
                  return setter(depModule);
                };
              });
            }
            return declared;
          };
        }
        return originalRegister.apply(this, args);
      };
      window.System.register.__tm_wrapped__ = true;
      console.log("[TM hook] System.register wrapped");
      return true;
    }

    function scanGlobalsOnce() {
      const keys = Object.getOwnPropertyNames(window);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        let v;
        try {
          v = window[k];
        } catch (e) {
          continue;
        }
        if (!v) continue;
        if (tryPatchObject(v, "window." + k)) return true;
      }
      return false;
    }

    (function boot() {
      ensurePanel();
      hookSystemRegister();
      let done = scanGlobalsOnce();
      let tries = 0;
      const timer = setInterval(function () {
        ensurePanel();
        tries++;
        hookSystemRegister();
        if (!done) done = scanGlobalsOnce();
        if (done || tries > 120) {
          clearInterval(timer);
          if (!done) console.warn("[TM hook] decodeResultRecall not found in 120s");
        }
      }, 100);
    })();
  })();
  `);
})();
