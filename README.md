Hier eine erste Version, die du direkt ins Repo legen kannst – z. B. clients/README.md.
Du gibst deinen Kunden dann nur ihre persönliche CLIENT_API_ID und (optional) einen eigenen Farbsatz / Branding.

# Endora Guest Chat – Einbettung

Willkommen bei **Endora**, deinem AI-Concierge für Gäste.  
Dieses Repository enthält fertige Chat-Oberflächen, die du auf deiner Website oder über QR-Codes nutzen kannst.

---

## 1. Begriffe

- **client_api_id**  
  Eindeutiger Schlüssel für dein Objekt / deine Unterkunft.  
  ➜ Wird von Marco / Endora vergeben (z. B. `test_client_p`).

- **Cloudflare Chat Endpoint**  
  Geschützte URL, über die alle Chats laufen:  
  `https://pages.endora.io/api/chat?client=<client_api_id>`

Du änderst **immer nur** die `client_api_id`. Der Endpoint selbst bleibt gleich.

---

## 2. Variante A – Endora-Seite direkt nutzen (Link + QR)

Am einfachsten ist es, die von Endora gehostete Seite zu verwenden, z. B.:

https://pages.endora.io/clients/yellow/

Was du tun kannst:
	1.	Link zur Seite in deine Buchungsbestätigung / Willkommens-E-Mail einbauen.
	2.	QR-Code mit genau dieser URL erzeugen und im Apartment aushängen.

Vorteil:
Kein technischer Aufwand, die Seite wird von Endora gepflegt.

⸻

## 3. Variante B – Einbettung per <iframe> auf deiner Website

Wenn du bereits eine eigene Website hast, kannst du Endora einfach im Inhalt einbetten:

<iframe
  src="https://pages.endora.io/clients/yellow/"
  style="width:100%;max-width:420px;height:600px;border:none;border-radius:20px;overflow:hidden;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>

Optional: Du kannst das style-Attribut an dein Layout anpassen (Höhe, Breite etc.).

⸻

## 4. Variante C – Direkte Einbettung des Chats (Advanced)

Wenn du den Chat direkt in dein eigenes Design integrieren möchtest, kannst du den folgenden Code verwenden.

⚠️ Wichtig:
	•	Ersetze CLIENT_ID_FROM_ENDORA durch deine echte client_api_id.
	•	Diese Variante ist für Websites gedacht, bei denen du HTML bearbeiten kannst.

<!-- Container, in dem der Chat angezeigt wird -->
<div id="endora-chat-container"></div>

<!-- Endora Chat Loader -->
<script>
  // 1) Client-ID eintragen (von Endora erhalten)
  const CLIENT_API_ID = 'CLIENT_ID_FROM_ENDORA';

  // 2) Endpunkt (nicht ändern, nur die Client-ID oben)
  const CHAT_ENDPOINT = `https://pages.endora.io/api/chat?client=${encodeURIComponent(CLIENT_API_ID)}`;

  // 3) Loader-Script dynamisch einfügen
  (function(){
    var s = document.createElement('script');
    s.src = 'https://pages.endora.io/chat-interface-tech-config/v1/coreloader.js';

    s.setAttribute('data-webhook', CHAT_ENDPOINT);
    s.setAttribute('data-client-id', CLIENT_API_ID);
    s.setAttribute('data-brand', 'Endora');
    s.setAttribute('data-page-url', window.location.origin + window.location.pathname);
    s.setAttribute('data-start-open', 'false');

    document.body.appendChild(s);
  })();
</script>

Der Loader:
	•	hängt eine fertige Chat-UI in #endora-chat-container (oder in eine definierte Struktur),
	•	schickt alle Nachrichten sicher über Cloudflare & Endora weiter,
	•	und respektiert dein Branding (z. B. Name „Endora“ / Farben).

⸻

## 5. Was du von Endora bekommst

Von Endora erhältst du:
	1.	deine client_api_id (z. B. villa_sunrise_01),
	2.	einen fertigen Demo-Link (z. B. https://pages.endora.io/clients/villa-sunrise/),
	3.	auf Wunsch ein fertig vorbereitetes HTML-Snippet (Variante C) zur direkten Einbettung.

⸻

## 6. Support

Wenn du Hilfe bei der Einbindung brauchst oder eine eigene Farbwelt / eigenes Branding für deinen Endora-Chat möchtest, melde dich einfach bei uns.

Wenn du jetzt als Nächstes magst, können wir:

- den aktuellen `coreloader.js` gemeinsam einmal „aufräumen“ (Kommentare, Option für `data-client-id`, Fallbacks),  
- oder direkt eine Kunden-Variante (Minimal-Loader) daraus ableiten, die du als „Standard-Snippet“ verteilen kannst. 

