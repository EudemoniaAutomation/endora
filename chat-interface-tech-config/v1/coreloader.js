// ===============================
//   Endora Chat Core Loader v1
// ===============================

// Diese Funktion lädt dynamisch das Chat-Widget
(function () {
  console.log("[Endora Loader] initializing…");

  // 1) Script-Tag auslesen
  const SCRIPT_TAG = document.currentScript;

  // 2) Kundenspezifische Daten auslesen
  const WEBHOOK_URL = SCRIPT_TAG.getAttribute("data-webhook") || "";
  const CLIENT_API_ID = SCRIPT_TAG.getAttribute("data-client") || "";
  const BRAND = SCRIPT_TAG.getAttribute("data-brand") || "Endora";
  const PAGE_URL = SCRIPT_TAG.getAttribute("data-page-url") || window.location.href;
  const START_OPEN = SCRIPT_TAG.getAttribute("data-start-open") === "true";

  if (!WEBHOOK_URL) {
    console.error("[Endora Loader] ❌ Fehlendes data-webhook");
    return;
  }
  if (!CLIENT_API_ID) {
    console.error("[Endora Loader] ❌ Fehlendes data-client");
    return;
  }

  console.log("[Endora Loader] client_api_id =", CLIENT_API_ID);
  console.log("[Endora Loader] webhook =", WEBHOOK_URL);

  //---------------------------------------------------------------
  // 3) API Sender — sendet Nachrichten an Cloudflare → n8n → LLM
  //---------------------------------------------------------------
  async function sendMessageToEndora(message, sessionId) {
    try {
      const res = await fetch(`${WEBHOOK_URL}?client=${encodeURIComponent(CLIENT_API_ID)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-ID": CLIENT_API_ID
        },
        body: JSON.stringify({
          chatInput: message,
          sessionId: sessionId,
          client_id: CLIENT_API_ID,
          page_url: PAGE_URL
        })
      });

      return await res.json();
    } catch (err) {
      console.error("[Endora Loader] ❌ API error", err);
      return { error: "Network error" };
    }
  }

  //---------------------------------------------------------------
  // 4) UI Elemente
  //---------------------------------------------------------------

  const input = document.getElementById("inline-input");
  const send = document.getElementById("inline-send");
  const messages = document.getElementById("inline-messages");

  const popupInput = document.getElementById("popup-input");
  const popupSend = document.getElementById("popup-send");
  const popupMessages = document.getElementById("popup-messages");

  const popupWrap = document.getElementById("popup-wrap");
  const popupOverlay = document.getElementById("popup-overlay");

  const qrImage = document.getElementById("apt-qr-img");

  //---------------------------------------------------------------
  // 5) QR-Code generieren
  //---------------------------------------------------------------

  const qrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
    encodeURIComponent(PAGE_URL);

  if (qrImage) qrImage.src = qrUrl;

  //---------------------------------------------------------------
  // 6) Nachricht anzeigen
  //---------------------------------------------------------------
  function addMessage(container, text, sender = "bot") {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerHTML = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  //---------------------------------------------------------------
  // 7) Event Listener Inline-Chat
  //---------------------------------------------------------------
  send?.addEventListener("click", async () => {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    addMessage(messages, msg, "user");

    const response = await sendMessageToEndora(msg, "inline-session");
    addMessage(messages, response.reply || JSON.stringify(response), "bot");
  });

  //---------------------------------------------------------------
  // 8) Event Listener Popup-Chat
  //---------------------------------------------------------------
  popupSend?.addEventListener("click", async () => {
    const msg = popupInput.value.trim();
    if (!msg) return;
    popupInput.value = "";
    addMessage(popupMessages, msg, "user");

    const response = await sendMessageToEndora(msg, "popup-session");
    addMessage(popupMessages, response.reply || JSON.stringify(response), "bot");
  });

  //---------------------------------------------------------------
  // 9) popup Fenster öffnen/schließen
  //---------------------------------------------------------------

  document.getElementById("bubble-btn")?.addEventListener("click", () => {
    popupOverlay.style.display = "block";
    popupWrap.style.display = "block";
  });

  document.getElementById("popup-close")?.addEventListener("click", () => {
    popupOverlay.style.display = "none";
    popupWrap.style.display = "none";
  });

  //---------------------------------------------------------------
  // 10) Auto-Open Option
  //---------------------------------------------------------------

  if (START_OPEN) {
    popupOverlay.style.display = "block";
    popupWrap.style.display = "block";
  }

  console.log("[Endora Loader] Ready 🎉");
})();
