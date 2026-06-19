"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./CouponScanner.module.css";
import { parseJsonResponse } from "@/lib/api-client";

// ── Service keyword mapping ──────────────────────────────────────────────────
const SERVICE_MAP = [
  { keywords: ["netflix"], label: "Netflix" },
  { keywords: ["spotify"], label: "Spotify" },
  { keywords: ["amazon prime", "prime video", "primevideo", "amazon", "prime"], label: "Amazon Prime" },
  { keywords: ["hotstar", "disney+", "disney plus", "disney"], label: "Hotstar" },
  { keywords: ["zomato"], label: "Zomato" },
  { keywords: ["swiggy"], label: "Swiggy" },
  { keywords: ["canva"], label: "Canva" },
  { keywords: ["adobe"], label: "Adobe" },
  { keywords: ["google one", "google"], label: "Google One" },
  { keywords: ["youtube premium", "youtube"], label: "YouTube Premium" },
  { keywords: ["microsoft", "office 365", "microsoft 365", "office"], label: "Microsoft" },
  { keywords: ["apple"], label: "Apple" },
  { keywords: ["hulu"], label: "Hulu" },
];

// ── Canvas Preprocessing ──────────────────────────────────────────────────────
async function preprocessImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        let width = img.width;
        let height = img.height;
        
        // 1. Resolution scaling (Upscaling)
        const targetWidth = 1600;
        if (width < targetWidth && width > 0) {
          const scale = targetWidth / width;
          width = targetWidth;
          height = Math.round(height * scale);
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        
        // 2. Grayscale & 3. Contrast adjustment
        const contrast = 70; 
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          gray = factor * (gray - 128) + 128;
          gray = Math.max(0, Math.min(255, gray));
          
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        // 4. Sharpening filter (3x3 convolution)
        const sharpenKernel = [
           0, -1,  0,
          -1,  5, -1,
           0, -1,  0
        ];
        
        const sharpenedData = convolveGrayscale(imgData, sharpenKernel);
        ctx.putImageData(sharpenedData, 0, 0);
        
        // 5. Binarization (Thresholding)
        const finalImg = ctx.getImageData(0, 0, width, height);
        const finalData = finalImg.data;
        const threshold = 128;
        
        for (let i = 0; i < finalData.length; i += 4) {
          const v = finalData[i];
          const binarized = v < threshold ? 0 : 255;
          finalData[i] = binarized;
          finalData[i + 1] = binarized;
          finalData[i + 2] = binarized;
        }
        ctx.putImageData(finalImg, 0, 0);
        
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

function convolveGrayscale(imgData, kernel) {
  const width = imgData.width;
  const height = imgData.height;
  const src = imgData.data;
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const output = ctx.createImageData(width, height);
  const dst = output.data;
  
  const side = 3;
  const halfSide = 1;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      let val = 0;
      
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
          const srcIdx = (scy * width + scx) * 4;
          const wt = kernel[cy * side + cx];
          val += src[srcIdx] * wt;
        }
      }
      
      const v = Math.min(255, Math.max(0, val));
      dst[dstIdx] = v;
      dst[dstIdx + 1] = v;
      dst[dstIdx + 2] = v;
      dst[dstIdx + 3] = src[dstIdx + 3];
    }
  }
  return output;
}

// ── Clean OCR Text ────────────────────────────────────────────────────────────
function cleanOcrText(text) {
  if (!text) return "";
  
  let cleaned = text.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n\s*\n/g, "\n");
  
  const lines = cleaned.split("\n");
  const cleanedLines = lines.map(line => {
    const words = line.trim().split(" ");
    const uniqueWords = [];
    const seenWords = new Set();
    
    for (const word of words) {
      if (!word) continue;
      const wordKey = word.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      if (wordKey && /^[a-z]+$/.test(wordKey)) {
        if (!seenWords.has(wordKey)) {
          seenWords.add(wordKey);
          uniqueWords.push(word);
        }
      } else {
        uniqueWords.push(word);
      }
    }
    
    return uniqueWords.join(" ");
  }).filter(Boolean);
  
  return cleanedLines.join("\n");
}

// ── OCR text parsing helpers ──────────────────────────────────────────────────

/** Pick best coupon code candidate: 4–20 uppercase alphanumeric chars */
function extractCode(text) {
  const upper = text.toUpperCase();
  const matches = upper.match(/\b[A-Z0-9]{4,20}\b/g) || [];
  
  const stopWords = new Set([
    "VALID","TILL","UNTIL","EXPIRES","EXPIRY","DATE","CODE","COUPON","DISCOUNT",
    "OFFER","SAVE","FLAT","ONLY","FROM","THIS","SCAN","APPLY","CLICK","SHOP",
    "BRAND","ABOVE","FREE","DAYS","YOUR","HAVE","WITH","MORE","THAN","BEST",
    "LESS","JUST","THAT","YEAR","YEARS","MONTH","WEEK","ONCE","EACH","OPEN",
    "DEAR","HELLO","THANK","GREAT","SPECIAL","ENJOY","TERMS","APPLY",
    "JANUARY","FEBRUARY","MARCH","APRIL","JUNE","JULY","AUGUST",
    "SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER",
    "JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC",
    "COPY","LOGIN","SIGNUP","SIGN","REGISTER","GET","USE","NOW","SUBMIT",
    "CANCEL","CLOSE","OK","YES","NO","COUPONS","VAULT","SUBLY","STATUS",
    "ACTIVE","EXPIRED","VALID","INVALID","SELECT","ENTER","APPLIED","SUCCESS",
    "FAILED","ERROR","REDEEM","CHECKOUT","CART","ORDER","TOTAL","PAY","PAYMENT",
    "CARD","BILL"
  ]);
  
  const candidates = matches.filter(m => {
    if (stopWords.has(m)) return false;
    if (/^\d+$/.test(m)) return false;
    if (!/[A-Z]/.test(m)) return false;
    return true;
  });
  
  candidates.sort((a, b) => {
    const aHasNum = /\d/.test(a) ? 1 : 0;
    const bHasNum = /\d/.test(b) ? 1 : 0;
    if (aHasNum !== bHasNum) {
      return bHasNum - aHasNum;
    }
    return a.length - b.length;
  });
  return candidates[0] || "";
}

/** Extract discount: percentages and rupee amounts */
function extractDiscount(text) {
  // Percentage first
  let m = text.match(/(\d+)\s*%\s*(?:off|discount|cashback)?/i);
  if (m) return `${m[1]}% OFF`;
  // Rupee flat
  m = text.match(/(?:flat\s+)?(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)?)\s*(?:off|discount)?/i);
  if (m) return `₹${m[1].replace(/,/g, "")} OFF`;
  // "Save X" patterns
  m = text.match(/save\s+(?:₹|rs\.?)?\s*(\d+)\s*(?:off|discount)?/i);
  if (m) return `₹${m[1]} OFF`;
  
  // Generic currency/percentage check
  m = text.match(/(\d+)\s*%/);
  if (m) return `${m[1]}% OFF`;
  
  m = text.match(/(?:₹|rs\.?)\s*(\d+)/i);
  if (m) return `₹${m[1]} OFF`;
  
  return "";
}

/** Extract expiry date and normalize to YYYY-MM-DD */
function extractExpiryDate(text) {
  const months = {
    jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
    january:1,february:2,march:3,april:4,june:6,july:7,august:8,
    september:9,october:10,november:11,december:12,
  };

  // DD MMM YYYY or D MMM YYYY  e.g. "31 Dec 2026", "15 July 2026"
  let m = text.match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/i);
  if (m) {
    const mon = months[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
  }

  // MMM DD YYYY  e.g. "Dec 31 2026"
  m = text.match(/\b([a-z]+)\s+(\d{1,2})\s+(\d{4})\b/i);
  if (m) {
    const mon = months[m[1].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;

  // YYYY-MM-DD  (ISO)
  m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // MM/DD/YYYY
  m = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;

  return "";
}

/** Detect service name using keyword mapping */
function extractService(text) {
  const lower = text.toLowerCase();
  for (const { keywords, label } of SERVICE_MAP) {
    if (keywords.some(k => lower.includes(k))) return label;
  }
  return "Other";
}

/** Run all parsers and return a parsed coupon object */
function parseCouponText(rawText) {
  const cleaned = cleanOcrText(rawText);
  return {
    code:       extractCode(cleaned),
    discount:   extractDiscount(cleaned),
    expiryDate: extractExpiryDate(cleaned),
    service:    extractService(cleaned),
  };
}

/** Decide how "complete" the OCR result is — flags missing fields */
function isOcrIncomplete(parsed) {
  return !parsed.code || !parsed.discount || !parsed.expiryDate;
}

// ── Main component ──────────────────────────────────────────────────────────

const STEPS = {
  PICK:    "PICK",     // choose camera vs upload
  CAMERA:  "CAMERA",  // live camera feed
  PREVIEW: "PREVIEW", // image chosen, ready to OCR
  LOADING: "LOADING", // OCR in progress
  REVIEW:  "REVIEW",  // show parsed fields for editing
};

export default function CouponScanner({ onClose, onSave, existingCoupons = [] }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep]       = useState(STEPS.PICK);

  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [cameraError, setCameraError]   = useState(null);

  const [loadingMsg, setLoadingMsg]  = useState("");
  const [progress, setProgress]      = useState(0);

  const [parsed, setParsed]           = useState({ code:"", discount:"", expiryDate:"", service:"" });
  const [ocrIncomplete, setOcrIncomplete] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [saveError, setSaveError]     = useState(null);
  const [saving, setSaving]           = useState(false);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // Stop camera stream when closing or changing step away from CAMERA
  useEffect(() => {
    if (step !== STEPS.CAMERA) stopCamera();
  }, [step]);

  useEffect(() => {
    return () => stopCamera(); // cleanup on unmount
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  async function openCamera() {
    setStep(STEPS.CAMERA);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not access camera. Try uploading a screenshot instead."
      );
    }
  }

  function capturePhoto() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    setImageDataUrl(dataUrl);
    setStep(STEPS.PREVIEW);
  }

  // ── File upload ─────────────────────────────────────────────────────────────

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImageDataUrl(ev.target.result);
      setStep(STEPS.PREVIEW);
    };
    reader.readAsDataURL(file);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  // ── OCR ─────────────────────────────────────────────────────────────────────

  async function runOcr() {
    if (!imageDataUrl) return;
    setStep(STEPS.LOADING);
    setLoadingMsg("Preprocessing image...");
    setProgress(10);

    try {
      // 1. Run browser-side canvas preprocessing
      const preprocessedUrl = await preprocessImage(imageDataUrl);

      // Dynamically import tesseract.js to keep initial bundle small
      const Tesseract = (await import("tesseract.js")).default;

      setLoadingMsg("Extracting text...");
      setProgress(30);

      const { data: { text, confidence } } = await Tesseract.recognize(preprocessedUrl, "eng", {
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1",
        logger: m => {
          if (m.status === "recognizing text") {
            setProgress(30 + Math.round(m.progress * 60));
            setLoadingMsg("Detecting coupon details...");
          }
        },
      });

      setProgress(95);
      setLoadingMsg("Finalising...");

      const result = parseCouponText(text);
      setParsed(result);
      // Set incomplete if any core field is missing or confidence is low
      setOcrIncomplete(isOcrIncomplete(result) || confidence < 55);
      setDuplicateError(false);
      setSaveError(null);
      setProgress(100);
      setStep(STEPS.REVIEW);
    } catch (err) {
      console.error("[CouponScanner] OCR error:", err);
      // Fall back to review screen with empty fields and warning
      setParsed({ code:"", discount:"", expiryDate:"", service:"" });
      setOcrIncomplete(true);
      setDuplicateError(false);
      setSaveError(null);
      setStep(STEPS.REVIEW);
    }
  }

  // ── Field editing ────────────────────────────────────────────────────────────

  function handleFieldChange(e) {
    const { name, value } = e.target;
    setParsed(prev => ({ ...prev, [name]: value }));
    setDuplicateError(false);
    setSaveError(null);
  }

  function handleExpiryFocus(e) {
    if (!parsed.expiryDate || parsed.expiryDate === "Not Specified") {
      setParsed(prev => ({ ...prev, expiryDate: "" }));
    }
  }

  function handleExpiryBlur(e) {
    if (!parsed.expiryDate || parsed.expiryDate.trim() === "") {
      setParsed(prev => ({ ...prev, expiryDate: "" }));
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaveError(null);
    setDuplicateError(false);

    const normExpiry = (parsed.expiryDate === "Not Specified" || !parsed.expiryDate) ? null : parsed.expiryDate;

    // Duplicate check (client-side against existing coupons prop)
    const dup = existingCoupons.find(c => {
      const dbExp = c.expiryDate || null;
      return (
        c.code?.toLowerCase() === parsed.code?.toLowerCase() &&
        (c.service || "")?.toLowerCase() === (parsed.service || "")?.toLowerCase() &&
        dbExp === normExpiry
      );
    });
    if (dup) {
      setDuplicateError(true);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...parsed,
        expiryDate: normExpiry
      };

      const res = await fetch("/api/coupons", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      await parseJsonResponse(res, "/api/coupons");
      onSave();
      onClose();
    } catch (err) {
      console.error("[CouponScanner] Save error:", err);
      setSaveError(err.message || "Failed to save coupon. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay} style={{ zIndex: 9999 }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Scan Coupon">

        {/* ── Header ── */}
        <div className={styles.header}>
          <h2>🔍 Scan Coupon</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">×</button>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* STEP: PICK */}
          {step === STEPS.PICK && (
            <>
              <p className={styles.modeTitle}>
                Choose how to capture your coupon
              </p>
              <div className={styles.modeGrid}>
                <button className={styles.modeBtn} onClick={openCamera}>
                  <span className={styles.modeEmoji}>📷</span>
                  Use Camera
                </button>
                <button className={styles.modeBtn} onClick={openFilePicker}>
                  <span className={styles.modeEmoji}>🖼️</span>
                  Upload Screenshot
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className={styles.fileInput}
                onChange={handleFileSelect}
              />
            </>
          )}

          {/* STEP: CAMERA */}
          {step === STEPS.CAMERA && (
            <div className={styles.cameraContainer}>
              {cameraError ? (
                <p className={styles.cameraError}>{cameraError}</p>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className={styles.cameraVideo}
                    muted
                    playsInline
                    autoPlay
                  />
                  <canvas ref={canvasRef} className={styles.cameraCanvas} />
                  <button className={styles.captureBtn} onClick={capturePhoto}>
                    📸 Take Photo
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === STEPS.PREVIEW && imageDataUrl && (
            <div className={styles.previewContainer}>
              <img
                src={imageDataUrl}
                alt="Coupon preview"
                className={styles.previewImage}
              />
              <p className={styles.previewNote}>
                Image captured. Click "Scan" to extract coupon details.
              </p>
            </div>
          )}

          {/* STEP: LOADING */}
          {step === STEPS.LOADING && (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>{loadingMsg}</p>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* STEP: REVIEW */}
          {step === STEPS.REVIEW && (
            <>
              <p className={styles.reviewTitle}>Detected Coupon — review &amp; edit</p>

              {ocrIncomplete && (
                <p className={styles.ocrWarning}>
                  ⚠️ We could not fully detect this coupon. Please review and complete the missing fields.
                </p>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="scanner-code">Coupon Code</label>
                <input
                  id="scanner-code"
                  name="code"
                  value={parsed.code}
                  onChange={handleFieldChange}
                  placeholder="e.g. SAVE50"
                  autoComplete="off"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="scanner-discount">Discount</label>
                <input
                  id="scanner-discount"
                  name="discount"
                  value={parsed.discount}
                  onChange={handleFieldChange}
                  placeholder="e.g. 20% or ₹100"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="scanner-expiry">Expiry Date</label>
                <input
                  id="scanner-expiry"
                  type="text"
                  name="expiryDate"
                  value={parsed.expiryDate || "Not Specified"}
                  onChange={handleFieldChange}
                  onFocus={handleExpiryFocus}
                  onBlur={handleExpiryBlur}
                  placeholder="Not Specified (or YYYY-MM-DD)"
                  autoComplete="off"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="scanner-service">Service</label>
                <input
                  id="scanner-service"
                  name="service"
                  value={parsed.service}
                  onChange={handleFieldChange}
                  placeholder="e.g. Netflix, Spotify"
                />
              </div>

              {duplicateError && (
                <p className={styles.duplicateError}>
                  ⚠️ This coupon already exists in your Coupon Vault.
                </p>
              )}

              {saveError && (
                <p className={styles.duplicateError}>
                  ⚠️ {saveError}
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>

          {/* PICK step: just close */}
          {step === STEPS.PICK && (
            <button type="button" onClick={onClose} className={styles.backBtn}>Cancel</button>
          )}

          {/* CAMERA step: back to PICK */}
          {step === STEPS.CAMERA && (
            <button type="button" onClick={() => setStep(STEPS.PICK)} className={styles.backBtn}>← Back</button>
          )}

          {/* PREVIEW step: back + scan */}
          {step === STEPS.PREVIEW && (
            <>
              <button type="button" onClick={() => { setImageDataUrl(null); setStep(STEPS.PICK); }} className={styles.backBtn}>
                ← Back
              </button>
              <button type="button" onClick={runOcr} className={styles.saveBtn}>
                Scan
              </button>
            </>
          )}

          {/* REVIEW step: back + save */}
          {step === STEPS.REVIEW && (
            <>
              <button
                type="button"
                onClick={() => { setImageDataUrl(null); setParsed({ code:"", discount:"", expiryDate:"", service:"" }); setStep(STEPS.PICK); }}
                className={styles.backBtn}
              >
                ← Rescan
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={styles.saveBtn}
                disabled={saving || !parsed.code}
              >
                {saving ? "Saving…" : "Save Coupon"}
              </button>
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
