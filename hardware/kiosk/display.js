/**
 * aitema|Termin - Aufrufanzeige Display Client
 * WebSocket client for hardware displays (Raspberry Pi).
 *
 * Configuration via URL parameters:
 * ?server=ws://host:3000&tenant=demo&location=xxx&device=rpi-001
 */

(function () {
  "use strict";

  // === Configuration ===
  const params = new URLSearchParams(window.location.search);
  const WS_SERVER = params.get("server") || "ws://localhost:3000";
  const TENANT = params.get("tenant") || "demo";
  const LOCATION_ID = params.get("location") || "";
  const DEVICE_ID = params.get("device") || "display-" + Date.now();

  // === DOM Elements ===
  const clockEl = document.getElementById("clock");
  const currentCallEl = document.getElementById("current-call");
  const callTicketEl = document.getElementById("call-ticket");
  const callCounterEl = document.getElementById("call-counter");
  const calledListEl = document.getElementById("called-list");
  const waitingCountEl = document.getElementById("waiting-count");
  const connectionStatusEl = document.getElementById("connection-status");

  // === State ===
  let ws = null;
  let reconnectTimer = null;
  let calledTickets = [];
  let currentCall = null;
  let callDisplayTimeout = null;

  // === Clock ===
  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // === WebSocket Connection ===
  function connect() {
    const url = `${WS_SERVER}/api/v1/${TENANT}/display/ws?locationId=${LOCATION_ID}&deviceId=${DEVICE_ID}&type=display`;

    console.log("[Display] Connecting to:", url);
    ws = new WebSocket(url);

    ws.onopen = function () {
      console.log("[Display] Connected");
      connectionStatusEl.textContent = "Verbunden";
      connectionStatusEl.className = "status-online";
    };

    ws.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {
        console.error("[Display] Parse error:", e);
      }
    };

    ws.onclose = function () {
      console.log("[Display] Disconnected, reconnecting in 3s...");
      connectionStatusEl.textContent = "Verbindung getrennt...";
      connectionStatusEl.className = "status-offline";
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = function (err) {
      console.error("[Display] WebSocket error:", err);
      ws.close();
    };
  }

  // === Message Handling ===
  function handleMessage(msg) {
    switch (msg.type) {
      case "BOARD_UPDATE":
        updateBoard(msg.data);
        break;

      case "TICKET_CALLED":
        showNewCall(msg.data);
        break;

      case "CONNECTED":
        console.log("[Display] Server acknowledged connection");
        break;

      default:
        console.log("[Display] Unknown message type:", msg.type);
    }
  }

  // === Board Update ===
  function updateBoard(data) {
    calledTickets = data.calledTickets || [];
    var waitingCount = data.waitingCount || 0;

    waitingCountEl.textContent = waitingCount;
    renderCalledList();
  }

  function renderCalledList() {
    calledListEl.innerHTML = "";

    calledTickets.forEach(function (ticket, index) {
      var div = document.createElement("div");
      div.className = "called-item" + (index === 0 ? " new" : "");
      div.innerHTML =
        '<span class="ticket-num">' + escapeHtml(ticket.ticketNumber) + "</span>" +
        '<div>' +
        '<div class="counter-name">' + escapeHtml(ticket.counterName || "---") + "</div>" +
        '<div class="service-name">' + escapeHtml(ticket.serviceName || "") + "</div>" +
        "</div>";
      calledListEl.appendChild(div);
    });
  }

  // === New Call Animation ===
  function showNewCall(data) {
    // Play notification sound
    playNotificationSound();

    // Show the large animated call display
    callTicketEl.textContent = data.ticketNumber;
    callCounterEl.textContent = data.counterName;
    currentCallEl.classList.remove("hidden");

    // Reset animation
    callTicketEl.style.animation = "none";
    void callTicketEl.offsetHeight; // Force reflow
    callTicketEl.style.animation = "flash 1s ease-in-out 3";

    // Hide after 15 seconds
    if (callDisplayTimeout) clearTimeout(callDisplayTimeout);
    callDisplayTimeout = setTimeout(function () {
      currentCallEl.classList.add("hidden");
    }, 15000);
  }

  // === Notification Sound ===
  function playNotificationSound() {
    try {
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Three-tone chime
      var frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      var duration = 0.2;

      frequencies.forEach(function (freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * duration);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + i * duration + duration
        );
        osc.start(audioCtx.currentTime + i * duration);
        osc.stop(audioCtx.currentTime + i * duration + duration);
      });
    } catch (e) {
      console.warn("[Display] Audio not available:", e);
    }
  }

  // === Heartbeat ===
  setInterval(function () {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "HEARTBEAT" }));
    }
  }, 30000);

  // === Utility ===
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // === Start ===
  if (LOCATION_ID) {
    connect();
  } else {
    calledListEl.innerHTML =
      '<p style="text-align:center;padding:3rem;color:#8899aa;font-size:1.5rem;">Bitte locationId als URL-Parameter angeben:<br><code>?location=LOCATION_ID&tenant=TENANT_SLUG</code></p>';
  }
})();
