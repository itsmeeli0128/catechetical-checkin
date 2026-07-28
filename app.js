const API_URL = "https://script.google.com/macros/s/AKfycby9JnTaIlBIkhcsQX3et6Iu05QA2f2PjV1skTO4uGEXk0ATVBEe2RsB8A75fznLUmC9/exec";


function onScanSuccess(decodedText) {

  console.log("Scanned:", decodedText);


  // Ipadala ang QR value sa Apps Script
  fetch(API_URL, {

    method: "POST",

    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },

    body: "id=" + encodeURIComponent(decodedText)

  })

  .then(response => response.json())

  .then(data => {

    console.log(data);


    const status = document.getElementById("status");


    if (data.success) {

      status.innerHTML =
      "✅ Check-in Successful<br>" +
      data.name +
      "<br>" +
      data.parish;

    } else {

      status.innerHTML =
      "⚠️ " + data.message;

    }


  })

  .catch(error => {

    console.error(error);

    document.getElementById("status").innerHTML =
    "❌ Connection Error";

  });

}



function onScanFailure(error) {

  // Ignore habang naghahanap ng QR
}



function startScanner() {

  const scanner = new Html5QrcodeScanner(

    "reader",

    {
      fps: 10,
      qrbox: 250
    }

  );


  scanner.render(

    onScanSuccess,

    onScanFailure

  );

}


window.onload = function(){

  startScanner();

};
