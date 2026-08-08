const API_URL =
  "https://script.google.com/macros/s/AKfycby9JnTaIlBIkhcsQX3et6Iu05QA2f2PjV1skTO4uGEXk0ATVBEe2RsB8A75fznLUmC9/exec";


let scanLocked = false;
let soundEnabled = false;
let audioContext = null;


/************************************************************
 * CHECK-IN MODE
 ************************************************************/

function handleModeChange() {
  const mode =
    document.getElementById("checkInMode").value;

  const sessionSelector =
    document.getElementById("sessionSelector");

  const sessionSelect =
    document.getElementById("sessionSelect");

  if (mode === "Concurrent Session") {
    sessionSelector.style.display = "block";
  } else {
    sessionSelector.style.display = "none";
    sessionSelect.value = "";
  }

  scanLocked = false;

  showReadyStatus();
}


/************************************************************
 * ENABLE SOUND
 ************************************************************/

function enableSound() {
  try {
    if (!audioContext) {
      audioContext =
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();
    }

    audioContext.resume();

    soundEnabled = true;

    playSuccessSound();

    const soundButton =
      document.getElementById(
        "enableSoundButton"
      );

    if (soundButton) {
      soundButton.innerHTML =
        "🔊 Sound Enabled";

      soundButton.disabled = true;

      soundButton.style.opacity =
        "0.75";
    }

  } catch (error) {
    console.error(
      "Sound error:",
      error
    );
  }
}


/************************************************************
 * SUCCESS SOUND
 ************************************************************/

function playSuccessSound() {
  if (
    !soundEnabled ||
    !audioContext
  ) {
    return;
  }

  const now =
    audioContext.currentTime;

  const oscillator1 =
    audioContext.createOscillator();

  const oscillator2 =
    audioContext.createOscillator();

  const gainNode =
    audioContext.createGain();

  oscillator1.type = "sine";
  oscillator2.type = "sine";

  oscillator1.frequency
    .setValueAtTime(
      700,
      now
    );

  oscillator2.frequency
    .setValueAtTime(
      1000,
      now + 0.12
    );

  gainNode.gain
    .setValueAtTime(
      0.22,
      now
    );

  gainNode.gain
    .exponentialRampToValueAtTime(
      0.01,
      now + 0.45
    );

  oscillator1.connect(
    gainNode
  );

  oscillator2.connect(
    gainNode
  );

  gainNode.connect(
    audioContext.destination
  );

  oscillator1.start(now);

  oscillator1.stop(
    now + 0.18
  );

  oscillator2.start(
    now + 0.12
  );

  oscillator2.stop(
    now + 0.45
  );
}


/************************************************************
 * WARNING SOUND
 ************************************************************/

function playWarningSound() {
  if (
    !soundEnabled ||
    !audioContext
  ) {
    return;
  }

  const now =
    audioContext.currentTime;

  const oscillator =
    audioContext.createOscillator();

  const gainNode =
    audioContext.createGain();

  oscillator.type =
    "square";

  oscillator.frequency
    .setValueAtTime(
      300,
      now
    );

  gainNode.gain
    .setValueAtTime(
      0.15,
      now
    );

  gainNode.gain
    .exponentialRampToValueAtTime(
      0.01,
      now + 0.35
    );

  oscillator.connect(
    gainNode
  );

  gainNode.connect(
    audioContext.destination
  );

  oscillator.start(now);

  oscillator.stop(
    now + 0.35
  );
}


/************************************************************
 * VIBRATION
 ************************************************************/

function vibrateDevice(pattern) {
  if (
    "vibrate" in navigator
  ) {
    navigator.vibrate(
      pattern
    );
  }
}


/************************************************************
 * QR SCAN SUCCESS
 ************************************************************/

function onScanSuccess(
  decodedText
) {

  if (scanLocked) {
    return;
  }


  /**********************************************************
   * GET SELECTED MODE
   **********************************************************/

  const checkInMode =
    document
      .getElementById(
        "checkInMode"
      )
      .value;


  const selectedSession =
    document
      .getElementById(
        "sessionSelect"
      )
      .value;


  /**********************************************************
   * VALIDATE CONCURRENT SESSION
   **********************************************************/

  if (
    checkInMode ===
      "Concurrent Session" &&
    !selectedSession
  ) {

    scanLocked = true;

    playWarningSound();

    vibrateDevice(
      [300]
    );

    showErrorResult(
      "SELECT A SESSION",
      "Please select the Concurrent Session before scanning.",
      "",
      "",
      "",
      true
    );

    return;
  }


  scanLocked = true;


  const registrationID =
    String(
      decodedText || ""
    ).trim();


  console.log(
    "Scanned:",
    registrationID
  );

  console.log(
    "Mode:",
    checkInMode
  );

  console.log(
    "Session:",
    selectedSession
  );


  const status =
    document.getElementById(
      "status"
    );


  status.innerHTML =
    "<div style='" +
      "padding:20px;" +
      "font-size:18px;" +
      "font-weight:bold;" +
      "color:#555;" +
      "text-align:center;" +
    "'>" +
      "⏳ Verifying participant..." +
    "</div>";


  /**********************************************************
   * SEND TO APPS SCRIPT
   **********************************************************/

  const requestBody =
    "id=" +
    encodeURIComponent(
      registrationID
    ) +

    "&mode=" +
    encodeURIComponent(
      checkInMode
    ) +

    "&session=" +
    encodeURIComponent(
      selectedSession
    );


  fetch(
    API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      body:
        requestBody
    }
  )

    .then(
      response => {

        if (!response.ok) {
          throw new Error(
            "Server returned " +
            response.status
          );
        }

        return response.json();
      }
    )

    .then(
      data => {

        console.log(
          "Server response:",
          data
        );


        /******************************************************
         * SUCCESS
         ******************************************************/

        if (
          data.success
        ) {

          playSuccessSound();

          vibrateDevice(
            [150, 80, 150]
          );

          showSuccessResult(
            data,
            checkInMode
          );

          return;
        }


        /******************************************************
         * WRONG CONCURRENT SESSION
         ******************************************************/

        if (
          data.wrongSession
        ) {

          playWarningSound();

          vibrateDevice(
            [300, 100, 300]
          );

          showWrongSessionResult(
            data
          );

          return;
        }


        /******************************************************
         * ALREADY CHECKED-IN
         ******************************************************/

        if (
          data.alreadyCheckedIn ||
          String(
            data.message || ""
          )
            .toLowerCase()
            .includes(
              "already"
            )
        ) {

          playWarningSound();

          vibrateDevice(
            [300]
          );

          showAlreadyCheckedInResult(
            data
          );

          return;
        }


        /******************************************************
         * GENERAL ERROR
         ******************************************************/

        playWarningSound();

        vibrateDevice(
          [300]
        );

        showErrorResult(
          "CHECK-IN FAILED",
          data.message ||
            "Unable to check in participant.",
          data.name || "",
          data.parish || "",
          data.position || "",
          false
        );
      }
    )

    .catch(
      error => {

        console.error(
          error
        );

        playWarningSound();

        vibrateDevice(
          [300, 100, 300]
        );

        showConnectionError();
      }
    );
}


/************************************************************
 * SUCCESS RESULT
 ************************************************************/

function showSuccessResult(
  data,
  checkInMode
) {

  const status =
    document.getElementById(
      "status"
    );


  let successTitle =
    "CHECK-IN SUCCESSFUL";


  if (
    checkInMode === "Day 1"
  ) {
    successTitle =
      "DAY 1 CHECK-IN SUCCESSFUL";
  }


  if (
    checkInMode === "Day 2"
  ) {
    successTitle =
      "DAY 2 CHECK-IN SUCCESSFUL";
  }


  if (
    checkInMode ===
    "Concurrent Session"
  ) {
    successTitle =
      "SESSION CHECK-IN SUCCESSFUL";
  }


  const positionHtml =
    data.position
      ? "<div style='" +
          "font-size:15px;" +
          "color:#555;" +
          "margin-top:5px;" +
        "'>" +
          escapeHtml(
            data.position
          ) +
        "</div>"
      : "";


  const sessionHtml =
    data.concurrentSession
      ? "<div style='" +
          "font-size:16px;" +
          "margin-top:14px;" +
          "padding:12px;" +
          "background:#fff;" +
          "border-radius:10px;" +
          "color:#333;" +
        "'>" +
          "<strong>Concurrent Session</strong>" +
          "<br>" +
          escapeHtml(
            data.concurrentSession
          ) +
        "</div>"
      : "";


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
      "'>" +
        "✅" +
      "</div>" +

      "<div style='" +
        "font-size:23px;" +
        "font-weight:bold;" +
        "margin-bottom:14px;" +
      "'>" +
        successTitle +
      "</div>" +

      "<div style='" +
        "font-size:22px;" +
        "font-weight:bold;" +
        "color:#153e75;" +
        "margin-bottom:6px;" +
      "'>" +
        escapeHtml(
          data.name || ""
        ) +
      "</div>" +

      "<div style='" +
        "font-size:16px;" +
        "color:#444;" +
      "'>" +
        escapeHtml(
          data.parish || ""
        ) +
      "</div>" +

      positionHtml +

      sessionHtml +

      createNextButton(
        "#2e7d32"
      ) +

    "</div>";
}


/************************************************************
 * ALREADY CHECKED-IN RESULT
 ************************************************************/

function showAlreadyCheckedInResult(
  data
) {

  const status =
    document.getElementById(
      "status"
    );


  const sessionHtml =
    data.concurrentSession
      ? "<div style='" +
          "font-size:15px;" +
          "margin-top:10px;" +
          "color:#444;" +
        "'>" +
          "<strong>Concurrent Session:</strong><br>" +
          escapeHtml(
            data.concurrentSession
          ) +
        "</div>"
      : "";


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
        "⚠️" +
      "</div>" +

      "<div style='" +
        "font-size:22px;" +
        "font-weight:bold;" +
        "margin-bottom:12px;" +
      "'>" +
        "ALREADY CHECKED-IN" +
      "</div>" +

      (
        data.name
          ? "<div style='" +
              "font-size:20px;" +
              "font-weight:bold;" +
              "color:#153e75;" +
            "'>" +
              escapeHtml(
                data.name
              ) +
            "</div>"
          : ""
      ) +

      (
        data.parish
          ? "<div style='" +
              "font-size:15px;" +
              "color:#444;" +
              "margin-top:5px;" +
            "'>" +
              escapeHtml(
                data.parish
              ) +
            "</div>"
          : ""
      ) +

      "<div style='" +
        "font-size:15px;" +
        "margin-top:12px;" +
      "'>" +
        escapeHtml(
          data.message ||
          "Participant has already checked in."
        ) +
      "</div>" +

      sessionHtml +

      createNextButton(
        "#ef6c00"
      ) +

    "</div>";
}


/************************************************************
 * WRONG SESSION RESULT
 ************************************************************/

function showWrongSessionResult(
  data
) {

  const status =
    document.getElementById(
      "status"
    );


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
        "font-size:52px;" +
        "line-height:1;" +
        "margin-bottom:10px;" +
      "'>" +
        "⚠️" +
      "</div>" +

      "<div style='" +
        "font-size:22px;" +
        "font-weight:bold;" +
        "margin-bottom:12px;" +
      "'>" +
        "WRONG CONCURRENT SESSION" +
      "</div>" +

      (
        data.name
          ? "<div style='" +
              "font-size:20px;" +
              "font-weight:bold;" +
              "color:#153e75;" +
              "margin-bottom:5px;" +
            "'>" +
              escapeHtml(
                data.name
              ) +
            "</div>"
          : ""
      ) +

      (
        data.parish
          ? "<div style='" +
              "font-size:15px;" +
              "color:#444;" +
            "'>" +
              escapeHtml(
                data.parish
              ) +
            "</div>"
          : ""
      ) +

      "<div style='" +
        "margin-top:16px;" +
        "padding:12px;" +
        "background:white;" +
        "border-radius:10px;" +
        "color:#333;" +
      "'>" +

        "<strong>Assigned Session:</strong>" +
        "<br>" +
        escapeHtml(
          data.concurrentSession || ""
        ) +

      "</div>" +

      createNextButton(
        "#ef6c00"
      ) +

    "</div>";
}


/************************************************************
 * GENERAL ERROR RESULT
 ************************************************************/

function showErrorResult(
  title,
  message,
  name,
  parish,
  position,
  sessionSelectionError
) {

  const status =
    document.getElementById(
      "status"
    );


  status.innerHTML =
    "<div style='" +
      "background:#ffebee;" +
      "border:3px solid #c62828;" +
      "border-radius:16px;" +
      "padding:22px 18px;" +
      "color:#b71c1c;" +
      "text-align:center;" +
    "'>" +

      "<div style='" +
        "font-size:50px;" +
        "margin-bottom:10px;" +
      "'>" +
        "❌" +
      "</div>" +

      "<div style='" +
        "font-size:22px;" +
        "font-weight:bold;" +
      "'>" +
        escapeHtml(
          title
        ) +
      "</div>" +

      (
        name
          ? "<div style='" +
              "font-size:20px;" +
              "font-weight:bold;" +
              "color:#153e75;" +
              "margin-top:12px;" +
            "'>" +
              escapeHtml(
                name
              ) +
            "</div>"
          : ""
      ) +

      (
        parish
          ? "<div style='" +
              "font-size:15px;" +
              "color:#444;" +
              "margin-top:5px;" +
            "'>" +
              escapeHtml(
                parish
              ) +
            "</div>"
          : ""
      ) +

      (
        position
          ? "<div style='" +
              "font-size:14px;" +
              "color:#555;" +
              "margin-top:4px;" +
            "'>" +
              escapeHtml(
                position
              ) +
            "</div>"
          : ""
      ) +

      "<div style='" +
        "margin-top:12px;" +
        "font-size:15px;" +
      "'>" +
        escapeHtml(
          message
        ) +
      "</div>" +

      (
        sessionSelectionError
          ? "<button " +
              "onclick='resetAfterSessionError()' " +
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
                "Select Session" +
            "</button>"
          : createNextButton(
              "#c62828"
            )
      ) +

    "</div>";
}


/************************************************************
 * CONNECTION ERROR
 ************************************************************/

function showConnectionError() {

  const status =
    document.getElementById(
      "status"
    );


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
      "'>" +
        "❌" +
      "</div>" +

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

      createNextButton(
        "#c62828",
        "Try Again"
      ) +

    "</div>";
}


/************************************************************
 * NEXT PARTICIPANT BUTTON
 ************************************************************/

function createNextButton(
  backgroundColor,
  label
) {

  const buttonLabel =
    label ||
    "Scan Next Participant";


  return (
    "<button " +
      "onclick='scanNextParticipant()' " +
      "style='" +
        "margin-top:20px;" +
        "padding:13px 24px;" +
        "font-size:17px;" +
        "font-weight:bold;" +
        "background:" +
          backgroundColor +
          ";" +
        "color:white;" +
        "border:none;" +
        "border-radius:10px;" +
        "cursor:pointer;" +
      "'>" +
        buttonLabel +
    "</button>"
  );
}


/************************************************************
 * SCAN NEXT PARTICIPANT
 ************************************************************/

function scanNextParticipant() {

  scanLocked =
    false;

  showReadyStatus();
}


/************************************************************
 * RESET SESSION ERROR
 ************************************************************/

function resetAfterSessionError() {

  scanLocked =
    false;

  const sessionSelect =
    document.getElementById(
      "sessionSelect"
    );

  sessionSelect.focus();

  showReadyStatus();
}


/************************************************************
 * READY STATUS
 ************************************************************/

function showReadyStatus() {

  const status =
    document.getElementById(
      "status"
    );

  const mode =
    document
      .getElementById(
        "checkInMode"
      )
      .value;


  let modeText =
    "Day 1 Check-In";


  if (
    mode === "Day 2"
  ) {
    modeText =
      "Day 2 Check-In";
  }


  if (
    mode ===
    "Concurrent Session"
  ) {

    const session =
      document
        .getElementById(
          "sessionSelect"
        )
        .value;

    modeText =
      session
        ? "Concurrent Session: " +
          session
        : "Concurrent Session Check-In";
  }


  status.innerHTML =
    "<div style='" +
      "background:#eef8ee;" +
      "border-left:6px solid #2e7d32;" +
      "border-radius:12px;" +
      "padding:18px;" +
      "font-size:17px;" +
      "font-weight:bold;" +
      "color:#2e7d32;" +
      "text-align:center;" +
    "'>" +

      "📷 Ready to Scan" +

      "<div style='" +
        "font-size:14px;" +
        "font-weight:normal;" +
        "color:#555;" +
        "margin-top:7px;" +
      "'>" +

        escapeHtml(
          modeText
        ) +

      "</div>" +

    "</div>";
}


/************************************************************
 * IGNORE QR SEARCH ERRORS
 ************************************************************/

function onScanFailure(error) {
  // Normal habang naghahanap
  // ng QR code ang camera.
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

  return String(
    value || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/************************************************************
 * PAGE LOAD
 ************************************************************/

window.onload =
  function() {

    handleModeChange();

    startScanner();

  };
