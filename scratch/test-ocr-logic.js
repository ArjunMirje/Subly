// Mock service keyword mapping (from CouponScanner.js)
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

function extractDiscount(text) {
  let m = text.match(/(\d+)\s*%\s*(?:off|discount|cashback)?/i);
  if (m) return `${m[1]}% OFF`;
  m = text.match(/(?:flat\s+)?(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)?)\s*(?:off|discount)?/i);
  if (m) return `₹${m[1].replace(/,/g, "")} OFF`;
  m = text.match(/save\s+(?:₹|rs\.?)?\s*(\d+)\s*(?:off|discount)?/i);
  if (m) return `₹${m[1]} OFF`;
  
  m = text.match(/(\d+)\s*%/);
  if (m) return `${m[1]}% OFF`;
  
  m = text.match(/(?:₹|rs\.?)\s*(\d+)/i);
  if (m) return `₹${m[1]} OFF`;
  
  return "";
}

function extractExpiryDate(text) {
  const months = {
    jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
    january:1,february:2,march:3,april:4,june:6,july:7,august:8,
    september:9,october:10,november:11,december:12,
  };

  let m = text.match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/i);
  if (m) {
    const mon = months[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
  }

  m = text.match(/\b([a-z]+)\s+(\d{1,2})\s+(\d{4})\b/i);
  if (m) {
    const mon = months[m[1].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`;
  }

  m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;

  m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  m = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;

  return "";
}

function extractService(text) {
  const lower = text.toLowerCase();
  for (const { keywords, label } of SERVICE_MAP) {
    if (keywords.some(k => lower.includes(k))) return label;
  }
  return "Other";
}

function parseCouponText(rawText) {
  const cleaned = cleanOcrText(rawText);
  return {
    code:       extractCode(cleaned),
    discount:   extractDiscount(cleaned),
    expiryDate: extractExpiryDate(cleaned),
    service:    extractService(cleaned),
  };
}

// Test cases
const tests = [
  {
    input: `Use code NETFLIX20\n20% OFF\nApplicable on Netflix`,
    expected: { code: 'NETFLIX20', discount: '20% OFF', expiryDate: '', service: 'Netflix' }
  },
  {
    input: `GET 50% off on Spotify\nCode: SPOTIFY50\nExpires: 31 Dec 2026\nClick to COPY code`,
    expected: { code: 'SPOTIFY50', discount: '50% OFF', expiryDate: '2026-12-31', service: 'Spotify' }
  },
  {
    input: `Flat ₹100 discount on Amazon Prime\nUse code: FLAT100AMZN\nExpiry: 15 July 2026`,
    expected: { code: 'FLAT100AMZN', discount: '₹100 OFF', expiryDate: '2026-07-15', service: 'Amazon Prime' }
  }
];

let failed = false;
for (let i = 0; i < tests.length; i++) {
  const result = parseCouponText(tests[i].input);
  console.log(`\nTest #${i + 1}:`);
  console.log("Input text:\n" + tests[i].input);
  console.log("Expected:", tests[i].expected);
  console.log("Actual:  ", result);
  
  const matches = JSON.stringify(result) === JSON.stringify(tests[i].expected);
  console.log("Matches: ", matches ? "✅ PASS" : "❌ FAIL");
  if (!matches) failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log("\nAll logic tests PASSED!");
}
