const API_URL =
  "https://script.google.com/macros/s/AKfycby9JnTaIlBIkhcsQX3et6Iu05QA2f2PjV1skTO4uGEXk0ATVBEe2RsB8A75fznLUmC9/exec";


let scanLocked = false;
let soundEnabled = false;
let audioContext = null;


/************************************************************
 * ENABLE SOUND
 ************************************************************/

function enableSound() {
  try {
    audioContext =
      new (window.AudioContext ||
        window.webkitAudioContext)();

    audioContext.resume();

    soundEnabled = true;

    playSuccessSound();

    const soundButton =
      document.getElementById("enableSoundButton");

    if (soundButton) {
      soundButton.innerHTML = "🔊 Sound Enabled";
      soundButton.disabled = true;
    }

  } catch (error) {
    console.error("Sound error:", error);
  }
}


/************************************************************
 * SUCCESS SOUND
 ************************************************************/

function playSuccessSound() {
  if (!soundEnabled || !audioContext) {
    return;
  }

  const now = audioContext.currentTime;

  const oscillator1 =
    audioContext.createOscillator();

  const oscillator2 =
    audioContext.createOscillator();

  const gainNode =
    audioContext.createGain();

  oscillator1.type = "sine";
  oscillator2.type = "sine";

  oscillator1.frequency.setValueAtTime(
    700,
    now
  );

  oscillator2.frequency.setValueAtTime(
    1000,
    now + 0.12
  );

  gainNode.gain.setValueAtTime(
    0.25,
    now
  );

  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    now + 0.45
  );

  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator1.start(now);
  oscillator1.stop(now + 0.18);

  oscillator2.start(now + 0.12);
  oscillator2.stop(now + 0.45);
}


/************************************************************
 * WARNING SOUND
 ************************************************************/

function playWarningSound() {
  if (!soundEnabled || !audioContext) {
    return;
  }

  const now = audioContext.currentTime;

  const oscillator =
    audioContext.createOscillator();

  const gainNode =
    audioContext.createGain();

  oscillator.type = "square";

  oscillator.frequency.setValueAtTime(
    300,
    now
  );

  gainNode.gain.setValueAtTime(
    0.18,
    now
  );

  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    now + 0.35
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.35);
}


/************************************************************
 * VIBRATION
 ************************************************************/

function vibrateDevice(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}


/************************************************************
 * SCAN SUCCESS
 ************************************************************/

function onScanSuccess(decodedText) {
  if (scanLocked) {
    return;
  }

  scanLocked = true;

  const registrationID =
    String(decodedText || "").trim();

  console.log(
    "Scanned:",
    registrationID
  );

  const status =
    document.getElementById("status");

  status.innerHTML =
    "<div style='" +
    "padding:18px;" +
    "font-size:18px;" +
    "color:#555;" +
    "'>" +
    "⏳ Verifying participant..." +
    "</div>";


  fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded"
    },

    body:
      "id=" +
      encodeURIComponent(registrationID)
  })

    .then(response => {
      if (!response.ok) {
        throw new Error(
          "Server returned " +
          response.status
        );
      }

      return response.json();
    })

    .then(data => {
      console.log(data);

      if (data.success) {
        playSuccessSound();

        vibrateDevice([150, 80, 150]);

        status.innerHTML =
          "<div style='" +
          "background:#e8f5e9;" +
          "border:3px solid #2e7d32;" +
          "border-radius:16px;" +
          "padding:24px 18px;" +
          "color:#1b5e20;" +
          "text-align:center;" +
          "'>" +

          "<div style='" +
          "font-size:58px;" +
          "line-height:1;" +
          "margin-bottom:10px;" +
          "'>✅</div>" +

          "<div style='" +
          "font-size:24px;" +
          "font-weight:bold;" +
          "margin-bottom:14px;" +
          "'>" +
          "CHECK-IN SUCCESSFUL" +
          "</div>" +

          "<div style='" +
          "font-size:22px;" +
          "font-weight:bold;" +
          "color:#153e75;" +
          "margin-bottom:7px;" +
          "'>" +
          escapeHtml(data.name || "") +
          "</div>" +

          "<div style='" +
          "font-size:16px;" +
          "color:#444;" +
          "margin-bottom:7px;" +
          "'>" +
          escapeHtml(data.parish || "") +
          "</div>" +

          (
            data.concurrentSession
              ? "<div style='" +
                "font-size:16px;" +
                "margin-top:12px;" +
                "padding:10px;" +
                "background:#fff;" +
                "border-radius:10px;" +
                "'>" +
                "<strong>Concurrent Session:</strong><br>" +
                escapeHtml(
                  data.concurrentSession
                ) +
                "</div>"
              : ""
          ) +

          "<button " +
          "onclick='scanNextParticipant()' " +
          "style='" +
          "margin-top:20px;" +
          "padding:13px 24px;" +
          "font-size:17px;" +
          "font-weight:bold;" +
          "background:#2e7d32;" +
          "color:white;" +
          "border:none;" +
          "border-radius:10px;" +
          "cursor:pointer;" +
          "'>" +
          "Scan Next Participant" +
          "</button>" +

          "</div>";

      } else {
        playWarningSound();

        vibrateDevice([300]);

        const alreadyCheckedIn =
          String(data.message || "")
            .toLowerCase()
            .includes("already");

        const title =
          alreadyCheckedIn
            ? "ALREADY CHECKED-IN"
            : "CHECK-IN FAILED";

        const icon =
          alreadyCheckedIn
            ? "⚠️"
            : "❌";

        status.innerHTML =
          "<div style='" +
          "background:#fff3e0;" +
          "border:3px solid #ef6c00;" +
          "border-radius:16px;" +
          "padding:22px 18px;" +
          "color:#b74d00;" +
          "text-align:center;" +
          "'>" +

          "<div style='" +
          "font-size:50px;" +
          "line-height:1;" +
          "margin-bottom:10px;" +
          "'>" +
          icon +
          "</div>" +

          "<div style='" +
          "font-size:22px;" +
          "font-weight:bold;" +
          "margin-bottom:10px;" +
          "'>" +
          title +
          "</div>" +

          (
            data.name
              ? "<div style='" +
                "font-size:20px;" +
                "font-weight:bold;" +
                "color:#153e75;" +
                "margin-bottom:6px;" +
                "'>" +
                escapeHtml(data.name) +
                "</div>"
              : ""
          ) +

          (
            data.parish
              ? "<div style='" +
                "font-size:15px;" +
                "color:#444;" +
                "'>" +
                escapeHtml(data.parish) +
                "</div>"
              : ""
          ) +

          "<div style='" +
          "font-size:15px;" +
          "margin-top:10px;" +
          "'>" +
          escapeHtml(
            data.message ||
            "Unable to check in participant."
          ) +
          "</div>" +

          "<button " +
          "onclick='scanNextParticipant()' " +
          "style='" +
          "margin-top:20px;" +
          "padding:13px 24px;" +
          "font-size:17px;" +
          "font-weight:bold;" +
          "background:#ef6c00;" +
          "color:white;" +
          "border:none;" +
          "border-radius:10px;" +
          "cursor:pointer;" +
          "'>" +
          "Scan Next Participant" +
          "</button>" +

          "</div>";
      }
    })

    .catch(error => {
      console.error(error);

      playWarningSound();

      vibrateDevice([300, 100, 300]);

      status.innerHTML =
        "<div style='" +
        "background:#ffebee;" +
        "border:3px solid #c62828;" +
        "border-radius:16px;" +
        "padding:22px;" +
        "color:#b71c1c;" +
        "text-align:center;" +
        "'>" +

        "<div style='" +
        "font-size:50px;" +
        "margin-bottom:10px;" +
        "'>❌</div>" +

        "<div style='" +
        "font-size:22px;" +
        "font-weight:bold;" +
        "'>" +
        "CONNECTION ERROR" +
        "</div>" +

        "<div style='" +
        "margin-top:10px;" +
        "font-size:15px;" +
        "'>" +
        "Please check the internet connection." +
        "</div>" +

        "<button " +
        "onclick='scanNextParticipant()' " +
        "style='" +
        "margin-top:20px;" +
        "padding:13px 24px;" +
        "font-size:17px;" +
        "font-weight:bold;" +
        "background:#c62828;" +
        "color:white;" +
        "border:none;" +
        "border-radius:10px;" +
        "cursor:pointer;" +
        "'>" +
        "Try Again" +
        "</button>" +

        "</div>";
    });
}


/************************************************************
 * SCAN NEXT PARTICIPANT
 ************************************************************/

function scanNextParticipant() {
  scanLocked = false;

  const status =
    document.getElementById("status");

  status.innerHTML =
    "<div style='" +
    "background:#eef8ee;" +
    "border-left:6px solid #2e7d32;" +
    "border-radius:12px;" +
    "padding:18px;" +
    "font-size:18px;" +
    "font-weight:bold;" +
    "color:#2e7d32;" +
    "'>" +
    "📷 Ready to Scan..." +
    "</div>";
}


/************************************************************
 * IGNORE SCANNER SEARCH ERRORS
 ************************************************************/

function onScanFailure(error) {
  // Normal lang ito habang naghahanap
  // ang camera ng QR code.
}


/************************************************************
 * START SCANNER
 ************************************************************/

function startScanner() {
  const scanner =
    new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250
        }
      },
      false
    );

  scanner.render(
    onScanSuccess,
    onScanFailure
  );
}


/************************************************************
 * HTML SECURITY
 ************************************************************/

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/************************************************************
 * PAGE LOAD
 ************************************************************/

window.onload = function() {
  const container =
    document.querySelector(".container");

  const soundButton =
    document.createElement("button");

  soundButton.id =
    "enableSoundButton";

  soundButton.innerHTML =
    "🔈 Enable Scanner Sound";

  soundButton.onclick =
    enableSound;

  soundButton.style.cssText =
    "margin-bottom:18px;" +
    "padding:10px 18px;" +
    "font-size:15px;" +
    "font-weight:bold;" +
    "background:#153e75;" +
    "color:white;" +
    "border:none;" +
    "border-radius:9px;" +
    "cursor:pointer;";

  const reader =
    document.getElementById("reader");

  container.insertBefore(
    soundButton,
    reader
  );

  startScanner();
};
