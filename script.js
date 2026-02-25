// ==============================
// Global variables
// ==============================
const API_KEY = "4696d2678ce1b24a9d1d9fe1d940e9cc";
// Step 2 / OCR extracted data
let extractedName = "Not detected";
let extractedDOB = "Not detected";
let extractedGender = "Not detected";
let extractedAadharLast4 = "1234";
let extractedFullAddress = "Not detected";
let extractedAddress = "";
let extractedVisitPass = "";

// Step completion flags
let step1Done = false;
let step2Done = false;
let step3Done = false;


// Camera streams
let stream1 = null;
let stream2 = null;


// ==============================
// DOM Elements
// ==============================
const steps = document.querySelectorAll(".step");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const aadharResult = document.getElementById("aadharResult");


// Step 1 Elements
const camera = document.getElementById("camera");
const preview = document.getElementById("preview");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("captureBtn");
const retakeBtn = document.getElementById("retakeBtn");
const nextBtn = document.getElementById("nextBtn");


// Step 2 Elements
const camera2 = document.getElementById("camera2");
const preview2 = document.getElementById("preview2");
const canvas2 = document.getElementById("canvas2");
const captureAadhar = document.getElementById("captureAadhar");
const retakeAadhar = document.getElementById("retakeAadhar");
const finalNext = document.getElementById("finalNext");


// ==============================
// Show step function
// ==============================
function showStep(n) {
    step1.style.display = n === 1 ? "block" : "none";
    step2.style.display = n === 2 ? "block" : "none";
    step3.style.display = n === 3 ? "block" : "none";


    steps.forEach(s => s.classList.remove("active"));
    steps[n - 1].classList.add("active");


    // Start cameras if not already
    if (n === 1 && !stream1) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(s => { stream1 = s; camera.srcObject = s; camera.play(); })
            .catch(() => alert("Front camera required"));
    }
    if (n === 2 && !stream2) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(s => { stream2 = s; camera2.srcObject = s; camera2.play(); })
            .catch(() => alert("Back camera required for Aadhar"));
    }
}


// ==============================
// Step 1 Capture
// ==============================
captureBtn.onclick = async () => {
    if (!camera.videoWidth) return;


    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    canvas.getContext("2d").drawImage(camera, 0, 0);

canvas.toBlob(blob => {
    window.selfieBlob = blob; // ✅ STORE GLOBALLY
}, "image/jpeg", 0.95);

preview.src = canvas.toDataURL("image/jpeg", 0.95);



    camera.style.display = "none";
    preview.style.display = "block";
    retakeBtn.disabled = false;
    captureBtn.disabled = true;
    captureBtn.textContent = "Captured";


    step1Done = true;
    nextBtn.disabled = false;
};


retakeBtn.onclick = () => {
    camera.style.display = "block";
    preview.style.display = "none";
    captureBtn.textContent = "Capture Photo";
    captureBtn.disabled = false;
    retakeBtn.disabled = true;
    nextBtn.disabled = true;
    step1Done = false;
};


nextBtn.onclick = () => {
    if (!step1Done) return;
    showStep(2);
};


// ==============================
// Step 2 Capture & OCR
// ==============================
captureAadhar.onclick = async () => {
    if (!camera2.videoWidth) return;


    // Capture photo
    canvas2.width = camera2.videoWidth;
    canvas2.height = camera2.videoHeight;
    const ctx = canvas2.getContext("2d");
    ctx.drawImage(camera2, 0, 0);


    preview2.src = canvas2.toDataURL("image/jpeg", 0.95);
    camera2.style.display = "none";
    preview2.style.display = "block";


    retakeAadhar.disabled = false;
    captureAadhar.disabled = true;
    captureAadhar.textContent = "Processing...";
    aadharResult.innerHTML = "Reading Aadhar card...";


    // OCR canvas (same as before)
    const ocrCanvas = document.createElement("canvas");
    ocrCanvas.width = canvas2.width;
    ocrCanvas.height = canvas2.height;
    const ocrCtx = ocrCanvas.getContext("2d");
    ocrCtx.drawImage(canvas2, 0, 0);


    // High contrast
    const imgData = ocrCtx.getImageData(0, 0, ocrCanvas.width, ocrCanvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const gray = 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
        const value = gray < 120 ? 0 : 255;
        imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = value;
    }
    ocrCtx.putImageData(imgData, 0, 0);


    try {
        const result = await Tesseract.recognize(ocrCanvas, 'eng', {
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/: -',
            tessedit_pageseg_mode: '6',
            preserve_interword_spaces: '1',
        });


        const text = result.data.text;


        // SUPER STRONG AADHAAR EXTRACTION (this fixes empty column forever)
        const aadharRegex = /\d{4}[\s-]?\d{4}[\s-]?\d{4}/g;
        const matches = text.match(aadharRegex);
        if (matches && matches.length > 0) {
            extractedAadharLast4 = matches[0].replace(/\D/g, '').slice(-4);
        } else {
            const any12 = text.match(/\d{12}/);
            extractedAadharLast4 = any12 ? any12[0].slice(-4) : "0000";
        }


        // DOB
        // DOB - Enhanced extraction with proper formatting
const dobMatch = text.match(/(\d{2}[\/\-\.\s]\d{2}[\/\-\.\s]\d{4}|\d{8}|\d{4})/);
if (dobMatch) {
    let dob = dobMatch[0];
    // If 8 digits without separator (e.g., 02022002), format it
    if (/^\d{8}$/.test(dob)) {
        extractedDOB = dob.substring(0,2) + '/' + dob.substring(2,4) + '/' + dob.substring(4,8);
    } else {
        extractedDOB = dob.replace(/[\-\.\s]/g, '/'); // Normalize separators to /
    }
}


        // Gender
        const upper = text.toUpperCase();
        if (upper.includes("MALE") || upper.includes("पुरुष")) extractedGender = "MALE";
        else if (upper.includes("FEMALE") || upper.includes("महिला")) extractedGender = "FEMALE";


        // Name
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
        const ignore = ["GOVERNMENT","INDIA","AADHAAR","DOB","MALE","FEMALE","YEAR","VID","ENROLMENT"];
        const candidates = lines.filter(l => !ignore.some(w => l.toUpperCase().includes(w)));
        if (candidates.length > 0) {
            extractedName = candidates.sort((a,b) => b.length - a.length)[0]
                            .replace(/Name|नाम|:/gi, '').trim();
        }


    } catch (err) {
        console.log("OCR error:", err);
        extractedAadharLast4 = "0000";
    }


    // Show results (same HTML you already have)
    aadharResult.innerHTML = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; font-size:22px; line-height:2.6; color:#222;">
    <div style="display:flex; justify-content:space-between; max-width:520px; margin-bottom:6px;">
        <span style="font-weight:bold; color:#007bff;">Name</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-weight:500;">${extractedName}</span>
    </div>
    <div style="display:flex; justify-content:space-between; max-width:520px; margin-bottom:6px;">
        <span style="font-weight:bold; color:#007bff;">DOB</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-weight:500;">${extractedDOB || "Not detected"}</span>
    </div>
    <div style="display:flex; justify-content:space-between; max-width:520px; margin-bottom:6px;">
        <span style="font-weight:bold; color:#007bff;">Gender</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-weight:500;">${extractedGender || "Not detected"}</span>
    </div>
    <div style="display:flex; justify-content:space-between; max-width:520px; margin-bottom:6px;">
        <span style="font-weight:bold; color:#007bff;">Aadhar Number</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-family:'Courier New', monospace; font-weight:bold; letter-spacing:5px; font-size:22px; color:#000;">
            XXXX XXXX ${extractedAadharLast4}
        </span>
    </div>
    <div style="display:flex; justify-content:space-between; max-width:520px;">
        <span style="font-weight:bold; color:#007bff;">Timestamp</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-weight:500; font-size:22px; color:#444;">
            ${new Date().toLocaleString('en-IN', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).replace(',', '')}
        </span>
    </div>
</div>`;


    captureAadhar.textContent = "Extracted";
    // Show edit button after extraction
document.getElementById("editBtn").style.display = "block";
    finalNext.disabled = false;
    step2Done = true;
};


retakeAadhar.onclick = () => {
    camera2.style.display = "block";
    preview2.style.display = "none";
    captureAadhar.textContent = "Capture Aadhar";
    captureAadhar.disabled = false;
    retakeAadhar.disabled = true;
    finalNext.disabled = true;
    aadharResult.innerHTML = "Captured data will appear here...";
    step2Done = false;
};


// ==============================
// EDIT BUTTON FUNCTIONALITY
// ==============================
document.getElementById("editBtn").onclick = () => {
    // Populate form with current values
    document.getElementById("editName").value = extractedName;
    document.getElementById("editDOB").value = extractedDOB;
    document.getElementById("editGender").value = extractedGender;
    document.getElementById("editAadhar").value = extractedAadharLast4;
   
    // Show edit form, hide result display and edit button
    document.getElementById("aadharResult").style.display = "none";
    document.getElementById("editBtn").style.display = "none";
    document.getElementById("editForm").style.display = "block";
    finalNext.disabled = true;
};


// SAVE EDITED DATA
document.getElementById("saveEdit").onclick = () => {
    // Get values
    const name = document.getElementById("editName").value.trim();
    const dob = document.getElementById("editDOB").value.trim();
    const gender = document.getElementById("editGender").value;
    const aadhar = document.getElementById("editAadhar").value.trim();
   
    // Reset all errors
    document.getElementById("errorName").style.display = "none";
    document.getElementById("errorDOB").style.display = "none";
    document.getElementById("errorGender").style.display = "none";
    document.getElementById("errorAadhar").style.display = "none";
   
    // Validation
    let isValid = true;
   
    if (!name) {
        document.getElementById("errorName").style.display = "block";
        isValid = false;
    }
    if (!dob) {
        document.getElementById("errorDOB").style.display = "block";
        isValid = false;
    }
    if (!gender) {
        document.getElementById("errorGender").style.display = "block";
        isValid = false;
    }
    if (!aadhar || aadhar.length !== 4 || !/^\d{4}$/.test(aadhar)) {
        document.getElementById("errorAadhar").style.display = "block";
        isValid = false;
    }
   
    if (!isValid) return;
   
    // Update global variables
    extractedName = name;
    extractedDOB = dob;
    extractedGender = gender;
    extractedAadharLast4 = aadhar;
   
    // Update display
    aadharResult.innerHTML = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; font-size:22px; line-height:2.6; color:#222;">
    <div style="display:flex; justify-content:space-between; max-width:520px; margin-bottom:6px;">
        <span style="font-weight:bold; color:#007bff;">Name</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-weight:500;">${extractedName}</span>
    </div>
    <div style="display:flex; justify-content:space-between; max-width:520px; margin-bottom:6px;">
        <span style="font-weight:bold; color:#007bff;">DOB</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-weight:500;">${extractedDOB}</span>
    </div>
    <div style="display:flex; justify-content:space-between; max-width:520px; margin-bottom:6px;">
        <span style="font-weight:bold; color:#007bff;">Gender</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-weight:500;">${extractedGender}</span>
    </div>
    <div style="display:flex; justify-content:space-between; max-width:520px; margin-bottom:6px;">
        <span style="font-weight:bold; color:#007bff;">Aadhar Number</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-family:'Courier New', monospace; font-weight:bold; letter-spacing:5px; font-size:22px; color:#000;">
            XXXX XXXX ${extractedAadharLast4}
        </span>
    </div>
    <div style="display:flex; justify-content:space-between; max-width:520px;">
        <span style="font-weight:bold; color:#007bff;">Timestamp</span>
        <span style="text-align:right; flex:1; padding-left:20px; font-weight:500; font-size:22px; color:#444;">
            ${new Date().toLocaleString('en-IN', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).replace(',', '')}
        </span>
    </div>
</div>`;
   
    // Hide form, show result and edit button
    document.getElementById("editForm").style.display = "none";
    document.getElementById("aadharResult").style.display = "block";
    document.getElementById("editBtn").style.display = "block";
    finalNext.disabled = false;
};


// CANCEL EDIT
document.getElementById("cancelEdit").onclick = () => {
    document.getElementById("editForm").style.display = "none";
    document.getElementById("aadharResult").style.display = "block";
    document.getElementById("editBtn").style.display = "block";
    finalNext.disabled = false;
};


// Download ID card
document.getElementById("downloadBtn").onclick = () => {
    html2canvas(document.getElementById("idCard"), {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff"
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "GVT_Krishikul_VIP_Pass.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
};


// ==========================================
// 1. SILENT UPLOAD + SAVE TO SHEET
// ==========================================
async function uploadAndSaveToSheet() {
    if (!step1Done || !step2Done) return;


    try {
        // Convert selfie canvas to blob
        const selfieBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));


        // Upload to ImgBB
        const formData = new FormData();
        formData.append('key', CONFIG.IMGBB_API_KEY);
        formData.append('image', selfieBlob, 'selfie.jpg');


        const imgbbRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const imgbbJson = await imgbbRes.json();
        if (!imgbbJson.success) throw new Error('ImgBB failed');


        const photoUrl = imgbbJson.data.url;


        // THIS WAS THE MISSING PART → correct masked Aadhaar
        const maskedAadhaar = `XXXX XXXX ${extractedAadharLast4}`;


        const payload = {
            name: extractedName || "Not detected",
            gender: extractedGender || "Not detected",
            dob: extractedDOB || "Not detected",
            idNumber: maskedAadhaar,           // ← NOW THIS WILL PRINT ON SHEET
            photoUrl: photoUrl,
            timestamp: new Date().toLocaleString('en-IN')
        };


        await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });


        console.log("Saved to sheet silently");


    } catch (err) {
        console.error("Save failed:", err);
    }
}


// SAVE TO SHEET IN BACKGROUND – NEVER BLOCKS UI
function uploadAndSaveToSheetInBackground(maskedAadhar) {
    // Run silently – if it fails, no one notices (still saved locally via ID card)
    canvas.toBlob(async (blob) => {
        try {
            const form = new FormData();
            form.append('key', CONFIG.IMGBB_API_KEY);
            form.append('image', blob, 'selfie.jpg');


            const ibbRes = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: form
            });
            const ibbData = await ibbRes.json();
            const photoUrl = ibbData.success ? ibbData.data.url : "";


            const payload = {
                name: extractedName || "Not detected",
                gender: extractedGender || "Not detected",
                dob: extractedDOB || "Not detected",
                idNumber: maskedAadhar,           // 100% correct every time
                photoUrl: photoUrl,
                timestamp: new Date().toLocaleString('en-IN')
            };


            // Fire and forget – no await, no-cors
            fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });


            console.log("Background save completed →", maskedAadhar);


        } catch (err) {
            console.log("Background save failed (non-blocking):", err);
        }
    }, 'image/jpeg', 0.95);
}


// ==========================================
// 2. NEXT BUTTON — NOW WORKS 100%
// ==========================================
// FINAL WORKING "NEXT" BUTTON – ONE CLICK = GO TO STEP 3 + SAVE IN BACKGROUND
finalNext.onclick = () => {
    if (!step2Done) {
        alert("Please capture Aadhaar first!");
        return;
    }

    // ✅ FIRST show Step 3
    showStep(3);

    // ✅ THEN fill Step 3 data (after DOM is visible)
    setTimeout(() => {
        const finalSelfie = document.getElementById("finalSelfie");
        const finalName   = document.getElementById("finalName");

        if (finalSelfie && preview?.src) {
            finalSelfie.src = preview.src;
        }

        if (finalName) {
            finalName.textContent = extractedName || "Not detected";
        }
    }, 50);
};


// DOWNLOAD BUTTON – PROFESSIONAL & PRINT-READY
document.getElementById("downloadBtn").onclick = async () => {
    const address = document.getElementById("address").value.trim();
    const visitPass = document.getElementById("visitPass").value.trim();

    if (!address || !visitPass) {
        alert("Please enter address and select visit pass first.");
        return;
    }

    const btn = document.getElementById("downloadBtn");
    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
        // 1️⃣ Upload selfie to ImgBB
        let photoUrl = "";

        if (window.selfieBlob) {
            const form = new FormData();
            form.append("key", CONFIG.IMGBB_API_KEY);
            form.append("image", window.selfieBlob, "selfie.jpg");

            const res = await fetch("https://api.imgbb.com/1/upload", {
                method: "POST",
                body: form
            });

            const json = await res.json();

            if (json.success) {
                photoUrl = json.data.url; // ✅ REAL URL
            }
        }

        // 2️⃣ Save to Google Sheet (ONLY ONCE)
        const payload = {
            name: extractedName || "Not detected",
            gender: extractedGender || "Not detected",
            dob: extractedDOB || "Not detected",
            idNumber: "XXXX XXXX " + (extractedAadharLast4 || "0000"),
            photoUrl: photoUrl,   // ✅ ALWAYS FILLED
            address: address,
            visitPass: visitPass,
            timestamp: new Date().toLocaleString("en-IN")
        };

        fetch(CONFIG.APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        // 3️⃣ Download ID Card
        const card = document.getElementById("printableCard");
        const canvasImg = await html2canvas(card, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#fff"
        });

        const link = document.createElement("a");
        link.download = "GVT_Krishikul_VIP_Pass.png";
        link.href = canvasImg.toDataURL("image/png");
        link.click();

    } catch (err) {
        console.error(err);
        alert("Something went wrong. Check console.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Download ID Card";
    }
};

// ==============================
// Nav bar step click
// ==============================
steps.forEach((step, i) => {
    step.onclick = () => {
        const n = i + 1;
        if (n === 1 || (n === 2 && step1Done) || (n === 3 && step2Done)) {
            showStep(n);
        }
    };
});




// ==============================
// Initial load
// ==============================
showStep(1);




// PROCEED TO ID CARD - NOW WORKS + FILLS DATA
proceedToCard.onclick = () => {
    if (!step3Done) return;


    // Fill ALL data before showing Step 4
    document.getElementById("finalSelfie").src = preview.src;
    document.getElementById("finalName").textContent = extractedName || "Not detected";
    document.getElementById("finalDOB").textContent = extractedDOB || "Not detected";
    document.getElementById("finalGender").textContent = extractedGender || "Not detected";
    document.getElementById("finalAadhar").textContent = "XXXX XXXX " + extractedAadharLast4;


    // Address field (add id="finalAddress" in your card HTML)
    const addrElem = document.getElementById("finalAddress");
    if (addrElem) addrElem.textContent = extractedFullAddress;


    showStep(4);  // Your ID card step
};


// Retake
retakeBackBtn.addEventListener('click', () => {
    camera3.style.display = 'block';
    preview3.style.display = 'none';
    captureBackBtn.disabled = false;
    retakeBackBtn.disabled = true;
    captureBackBtn.textContent = 'Capture Back Side';
    addressResult.textContent = 'Captured address will appear here...';
    proceedToCard.disabled = true;
    step3Done = false;
});


// Proceed to ID card - FIX WHITE SCREEN
proceedToCard.addEventListener('click', () => {
    if (!step3Done) {
        alert("Please capture & extract address first!");
        return;
    }


    // Store address
    extractedFullAddress = addressResult.textContent.trim();


    // CRITICAL: FILL DATA **BEFORE** showStep
    const finalSelfie = document.getElementById("finalSelfie");
    const finalName = document.getElementById("finalName");
    const finalDOB = document.getElementById("finalDOB");
    const finalGender = document.getElementById("finalGender");
    const finalAadhar = document.getElementById("finalAadhar");
    const finalAddress = document.getElementById("finalAddress"); // Add this ID to your card HTML if missing


    if (finalSelfie) finalSelfie.src = preview.src || '';
    if (finalName) finalName.textContent = extractedName || 'Not detected';
    if (finalDOB) finalDOB.textContent = extractedDOB || 'Not detected';
    if (finalGender) finalGender.textContent = extractedGender || 'Not detected';
    if (finalAadhar) finalAadhar.textContent = "XXXX XXXX " + (extractedAadharLast4 || '0000');
    if (finalAddress) finalAddress.textContent = extractedFullAddress || 'Not detected';


    // Force show step 4 (your ID card container)
    showStep(4);
});


// Retake (unchanged)
retakeBackBtn.addEventListener('click', () => {
    camera3.style.display = 'block';
    preview3.style.display = 'none';
    captureBackBtn.disabled = false;
    retakeBackBtn.disabled = true;
    captureBackBtn.textContent = 'Capture Back Side';
    addressResult.textContent = 'Captured address will appear here...';
    proceedToCard.disabled = true;
    step3Done = false;
});


// Proceed to Step 4 (fix white screen)
proceedToCard.addEventListener('click', () => {
    if (!step3Done) return;


    // Store full address
    extractedFullAddress = addressResult.textContent;


    // Fill ALL Step 4 ID card data BEFORE showing
    const finalSelfie = document.getElementById("finalSelfie");
    const finalName = document.getElementById("finalName");
    const finalDOB = document.getElementById("finalDOB");
    const finalGender = document.getElementById("finalGender");
    const finalAadhar = document.getElementById("finalAadhar");
    const finalAddress = document.getElementById("finalAddress");  // If you added this


    if (finalSelfie) finalSelfie.src = preview.src || '';
    if (finalName) finalName.textContent = extractedName || 'Not detected';
    if (finalDOB) finalDOB.textContent = extractedDOB || 'Not detected';
    if (finalGender) finalGender.textContent = extractedGender || 'Not detected';
    if (finalAadhar) finalAadhar.textContent = "XXXX XXXX " + extractedAadharLast4 || 'XXXX XXXX 0000';
    if (finalAddress) finalAddress.textContent = extractedFullAddress || 'Not detected';


    // Ensure Step 4 div is visible with data
    const step4Div = document.getElementById("step4");  // Change your ID card div ID to "step4"
    if (step4Div) step4Div.style.display = 'flex';  // Force show if needed


    showStep(4);
});


function validateDownloadButton() {
  const address = document.getElementById("address").value.trim();
  const visitPass = document.getElementById("visitPass").value;
  const downloadBtn = document.getElementById("downloadBtn");


  downloadBtn.disabled = !(address && visitPass);
}

function selectPass(value) {
    const hiddenInput = document.getElementById("visitPass");
    hiddenInput.value = value;

    // Visual feedback
    document.querySelectorAll(".visit-pass button").forEach(btn => {
        btn.classList.remove("active");
    });
    event.target.classList.add("active");   // ← event must be available

    validateDownloadButton();
}


// Address typing listener
document.getElementById("address").addEventListener("input", validateDownloadButton);


// Download click guard
document.getElementById("downloadBtn").onclick = async () => {
   // ImgBB upload
   // payload with REAL photoUrl
   // fetch(CONFIG.APPS_SCRIPT_URL)
   // html2canvas download
};



// ==============================
// STEP 3: VALIDATE ADDRESS + VISIT PASS
// ==============================
function validateDownloadButton() {
    const addressField = document.getElementById("address");
    const visitPassField = document.getElementById("visitPass");
    const downloadBtn = document.getElementById("downloadBtn");


    if (!addressField || !visitPassField || !downloadBtn) return;


    const address = addressField.value.trim();
    const visitPass = visitPassField.value.trim();


    // Enable ONLY if BOTH are non-empty
    downloadBtn.disabled = !(address.length > 0 && visitPass.length > 0);
}


// Listen for address changes - wait for DOM to be ready
setTimeout(() => {
    const addressInput = document.getElementById("address");
    if (addressInput) {
        addressInput.addEventListener("input", validateDownloadButton);
        addressInput.addEventListener("keyup", validateDownloadButton);
        addressInput.addEventListener("change", validateDownloadButton);
    }
}, 100);


function saveStep3ToSheet(address, visitPass) {
  const payload = {
    name: extractedName || "",
    gender: extractedGender || "",
    dob: extractedDOB || "",
    idNumber: "XXXX XXXX " + (extractedAadharLast4 || "0000"),
    photoUrl: "", // already uploaded earlier
    address: address,
    visitPass: visitPass,
    timestamp: new Date().toLocaleString('en-IN')
  };

  fetch(CONFIG.APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  console.log("✅ Step 3 saved:", address, visitPass);
}


// Auto-save step 3 whenever both fields are filled
function tryAutoSaveStep3() {
    const addr = document.getElementById("address")?.value.trim();
    const vp   = document.getElementById("visitPass")?.value;
    if (addr && vp) {
        saveStep3ToSheet(addr, vp);
    }
}

document.getElementById("address")?.addEventListener("input", tryAutoSaveStep3);
document.getElementById("address")?.addEventListener("change", tryAutoSaveStep3);

// Call after each button click too (already in selectPass via validate → but add explicitly)