import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image, UploadCloud, AlertTriangle, AlertCircle, Focus } from 'lucide-react';
import styles from './CouponScannerModal.module.css';
import { parseJsonResponse } from '@/lib/api-client';

const SERVICE_KEYWORDS = [
  { keywords: ['netflix'], service: 'Netflix' },
  { keywords: ['spotify'], service: 'Spotify' },
  { keywords: ['amazon prime', 'amazonprime', 'prime video', 'primevideo'], service: 'Amazon Prime' },
  { keywords: ['disney+ hotstar', 'disney plus hotstar', 'hotstar'], service: 'Hotstar' },
  { keywords: ['zomato'], service: 'Zomato' },
  { keywords: ['swiggy'], service: 'Swiggy' },
  { keywords: ['canva'], service: 'Canva' },
  { keywords: ['adobe'], service: 'Adobe' },
  { keywords: ['google one', 'googleone'], service: 'Google One' },
  { keywords: ['youtube premium', 'youtube'], service: 'YouTube Premium' },
  { keywords: ['microsoft', 'office 365', 'office365'], service: 'Microsoft' }
];

// Parser Helpers
function detectCouponCode(text) {
  const words = text.split(/\s+/);
  const codeRegex = /^[A-Z0-9]{4,20}$/;
  const excludedWords = new Set([
    'COUPON', 'DISCOUNT', 'EXPIRES', 'EXPIRE', 'VALID', 'TILL', 'FLAT', 
    'FREE', 'DATE', 'YEAR', 'ONLY', 'OFFER', 'APPLY', 'CODE', 'WITH', 
    'FROM', 'YOUR', 'SAVE', 'OFF', 'LIMIT', 'UNTIL'
  ]);

  for (const word of words) {
    const cleaned = word.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (codeRegex.test(cleaned)) {
      // Ignore purely numeric values (like years or flat discounts) unless they are 6+ chars
      const isPureNumeric = /^\d+$/.test(cleaned);
      if (isPureNumeric && cleaned.length < 6) {
        continue;
      }
      if (!excludedWords.has(cleaned)) {
        return cleaned;
      }
    }
  }
  return "";
}

function detectDiscount(text) {
  // 1. Percentage off: e.g. "50% OFF", "20%"
  const percentRegex = /(\d+%\s*(?:off|OFF|Off)?)/i;
  const percentMatch = text.match(percentRegex);
  if (percentMatch) {
    return percentMatch[0].trim();
  }

  // 2. Currency/Fixed amount: e.g. "₹500 OFF", "Flat ₹100 Off", "$10 Off"
  const currencyRegex = /((?:Flat\s+)?(?:[₹$]|Rs\.?|INR)\s*\d+(?:\s*(?:off|OFF|Off))?)/i;
  const currencyMatch = text.match(currencyRegex);
  if (currencyMatch) {
    return currencyMatch[0].trim();
  }

  // 3. Fallback: "50 OFF", "100 OFF"
  const fallbackRegex = /(\d+\s*(?:off|OFF|Off))/i;
  const fallbackMatch = text.match(fallbackRegex);
  if (fallbackMatch) {
    return fallbackMatch[0].trim();
  }

  return "";
}

function detectExpiryDate(text) {
  const months = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };
  const pad = (num) => String(num).padStart(2, '0');

  // Format: 31 Dec 2026 or 31 December 2026
  const dayMonthYearRegex = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i;
  let match = text.match(dayMonthYearRegex);
  if (match) {
    const day = parseInt(match[1]);
    const month = months[match[2].toLowerCase()];
    const year = match[3];
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // Format: Dec 31, 2026 or December 31, 2026
  const monthDayYearRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})\b/i;
  match = text.match(monthDayYearRegex);
  if (match) {
    const month = months[match[1].toLowerCase()];
    const day = parseInt(match[2]);
    const year = match[3];
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // Format: DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY
  const numericDateRegex = /\b(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})\b/;
  match = text.match(numericDateRegex);
  if (match) {
    const val1 = parseInt(match[1]);
    const val2 = parseInt(match[2]);
    const year = match[3];
    let day, month;
    if (val1 > 12) {
      day = val1;
      month = val2;
    } else if (val2 > 12) {
      day = val2;
      month = val1;
    } else {
      day = val1;
      month = val2;
    }
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // Format: YYYY-MM-DD
  const yyyyMmDdRegex = /\b(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})\b/;
  match = text.match(yyyyMmDdRegex);
  if (match) {
    const year = match[1];
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return "";
}

function detectService(text) {
  const lowercaseText = text.toLowerCase();
  for (const item of SERVICE_KEYWORDS) {
    for (const keyword of item.keywords) {
      if (lowercaseText.includes(keyword)) {
        return item.service;
      }
    }
  }
  return "Other";
}

// Compress and Downscale Image before OCR
function compressAndResizeImage(fileOrDataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        if (width > height) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Image compression failed"));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error("Failed to load image"));

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

export default function CouponScannerModal({ onClose, onSave }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState('select'); // 'select', 'upload', 'camera', 'loading', 'review'
  const [loadingStep, setLoadingStep] = useState(1); // 1: Scanning, 2: Extracting, 3: Detecting
  const [cameraError, setCameraError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Review fields
  const [formData, setFormData] = useState({
    code: '',
    discount: '',
    service: '',
    expiryDate: ''
  });

  const [isIncomplete, setIsIncomplete] = useState(false);

  // References
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const codeInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setStep('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Could not access camera. Please make sure permissions are granted or upload a screenshot instead.");
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');

      stopCamera();
      await runOCR(dataUrl);
    } catch (err) {
      console.error("Capture error:", err);
      setCameraError("Failed to capture image. Please try again.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await runOCR(file);
  };

  const runOCR = async (imageInput) => {
    setStep('loading');
    setSaveError(null);
    setIsIncomplete(false);

    try {
      // 1. Initial Scanning phase
      setLoadingStep(1);
      const compressedBlob = await compressAndResizeImage(imageInput);

      // 2. Extracting text phase
      setLoadingStep(2);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(compressedBlob);
      const ocrText = ret.data.text;
      await worker.terminate();

      // 3. Detecting coupon details phase
      setLoadingStep(3);
      
      const code = detectCouponCode(ocrText);
      const discount = detectDiscount(ocrText);
      const expiryDate = detectExpiryDate(ocrText);
      const service = detectService(ocrText);

      setFormData({
        code,
        discount,
        service,
        expiryDate
      });

      // If key fields are missing, set incomplete flag
      if (!code || !discount || !expiryDate || service === 'Other') {
        setIsIncomplete(true);
      }

      setStep('review');
    } catch (err) {
      console.error("OCR process error:", err);
      // Even if OCR fails, direct user to review screen with empty values so they can fill it
      setFormData({
        code: '',
        discount: '',
        service: 'Other',
        expiryDate: ''
      });
      setIsIncomplete(true);
      setStep('review');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const focusCodeInput = () => {
    if (codeInputRef.current) {
      codeInputRef.current.focus();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError(null);

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      await parseJsonResponse(res, '/api/coupons');
      onSave();
      onClose();
    } catch (err) {
      console.error("Error saving scanned coupon:", err);
      setSaveError(err.message);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2>
            {step === 'select' && 'Scan Coupon'}
            {step === 'upload' && 'Upload Screenshot'}
            {step === 'camera' && 'Camera Scanner'}
            {step === 'loading' && 'OCR Processing'}
            {step === 'review' && 'Detected Coupon'}
          </h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* STEP 1: Select Option */}
          {step === 'select' && (
            <div className={styles.choiceContainer}>
              <p>Choose how you would like to scan your coupon.</p>
              <div className={styles.choiceGrid}>
                <div onClick={startCamera} className={styles.choiceCard}>
                  <Camera size={36} className={styles.choiceIcon} />
                  <h3>Use Camera</h3>
                  <p>Capture a photo of your coupon</p>
                </div>
                <div onClick={() => setStep('upload')} className={styles.choiceCard}>
                  <Image size={36} className={styles.choiceIcon} />
                  <h3>Upload Screenshot</h3>
                  <p>Choose an image file from device</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2A: Upload Screenshot */}
          {step === 'upload' && (
            <div onClick={() => fileInputRef.current?.click()} className={styles.uploadZone}>
              <UploadCloud size={48} className={styles.uploadIcon} />
              <p>Drag and drop or click to select image</p>
              <span className={styles.uploadSubtext}>Supports PNG, JPG, JPEG, WEBP</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className={styles.fileInput}
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* STEP 2B: Camera feed */}
          {step === 'camera' && (
            <div className={styles.cameraWrapper}>
              {cameraError ? (
                <div className={`${styles.banner} ${styles.errorBanner}`}>
                  <AlertCircle size={18} />
                  <span>{cameraError}</span>
                </div>
              ) : (
                <>
                  <div className={styles.videoContainer}>
                    <video ref={videoRef} autoPlay playsInline className={styles.videoFeed} />
                  </div>
                  <button onClick={capturePhoto} className={styles.shutterBtn} title="Capture Photo">
                    <Focus size={24} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Loading / OCR running */}
          {step === 'loading' && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <div className={styles.loadingSteps}>
                <p className={`${styles.loadingStep} ${loadingStep === 1 ? styles.loadingStepActive : ''}`}>
                  Scanning coupon...
                </p>
                <p className={`${styles.loadingStep} ${loadingStep === 2 ? styles.loadingStepActive : ''}`}>
                  Extracting text...
                </p>
                <p className={`${styles.loadingStep} ${loadingStep === 3 ? styles.loadingStepActive : ''}`}>
                  Detecting coupon details...
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Review Detected Information */}
          {step === 'review' && (
            <form onSubmit={handleSave} className={styles.form}>
              {isIncomplete && (
                <div className={`${styles.banner} ${styles.warningBanner}`}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>We could not fully detect this coupon. Please review and complete the missing fields.</span>
                </div>
              )}

              {saveError && (
                <div className={`${styles.banner} ${styles.errorBanner}`}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>⚠️ {saveError}</span>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Coupon Code</label>
                <input
                  ref={codeInputRef}
                  type="text"
                  name="code"
                  required
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="e.g. SAVE50"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Discount</label>
                <input
                  type="text"
                  name="discount"
                  required
                  value={formData.discount}
                  onChange={handleInputChange}
                  placeholder="e.g. 50% OFF or ₹100 Off"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Service</label>
                <input
                  type="text"
                  name="service"
                  required
                  value={formData.service}
                  onChange={handleInputChange}
                  placeholder="e.g. Netflix, Amazon Prime"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Expiry Date</label>
                <input
                  type="date"
                  name="expiryDate"
                  required
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {step !== 'select' && step !== 'loading' && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setStep('select');
              }}
              className={styles.cancelBtn}
            >
              Back
            </button>
          )}
          {step === 'select' && (
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
          )}

          {step === 'review' && (
            <>
              <button type="button" onClick={focusCodeInput} className={styles.editBtn}>
                Edit
              </button>
              <button type="submit" onClick={handleSave} className={styles.submitBtn}>
                Save
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
