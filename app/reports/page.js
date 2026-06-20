"use client";

import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './page.module.css';
import { parseJsonResponse } from '@/lib/api-client';

// ── Offscreen Canvas Pie Chart Generator ─────────────────────────────────────
function generatePieChartCanvas(categorySpend) {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 250;
  const ctx = canvas.getContext('2d');
  
  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = 125;
  const centerY = 125;
  const radius = 90;
  const keys = Object.keys(categorySpend).filter(key => categorySpend[key] > 0);

  if (keys.length === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#e0e6ff';
    ctx.fill();
    
    ctx.fillStyle = '#565f89';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No active subscriptions', centerX, centerY);
  } else {
    const total = keys.reduce((acc, key) => acc + categorySpend[key], 0);
    const colors = ['#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68', '#f7768e', '#73daca'];
    let currentAngle = 0;

    keys.forEach((key, index) => {
      const val = categorySpend[key];
      const sliceAngle = (val / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Draw Legend
    let legendY = 40;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    keys.forEach((key, index) => {
      const val = categorySpend[key];
      const pct = ((val / total) * 100).toFixed(0);
      const color = colors[index % colors.length];

      ctx.fillStyle = color;
      ctx.fillRect(270, legendY - 6, 12, 12);

      ctx.fillStyle = '#0d0e12';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${key}: ₹${val.toFixed(0)} (${pct}%)`, 292, legendY);
      legendY += 24;
    });
  }

  return canvas.toDataURL('image/png');
}

// ── Offscreen Canvas Bar Chart Generator ─────────────────────────────────────
function generateBarChartCanvas(subscriptions) {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 250;
  const ctx = canvas.getContext('2d');

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const subCosts = subscriptions.map(sub => {
    let monthlyCost = sub.cost;
    if (sub.billingCycle === 'yearly') monthlyCost = sub.cost / 12;
    else if (sub.billingCycle === 'half-yearly') monthlyCost = sub.cost / 6;
    return { name: sub.name, cost: monthlyCost };
  }).sort((a, b) => b.cost - a.cost);

  if (subCosts.length === 0) {
    ctx.fillStyle = '#565f89';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No subscription expense data available.', 250, 125);
  } else {
    // Limit to top 5 subscription bars for layout aesthetics
    const displaySubs = subCosts.slice(0, 5);
    const maxCost = Math.max(...displaySubs.map(s => s.cost), 1);
    const chartHeight = 150;
    const chartWidth = 380;
    const startX = 70;
    const startY = 190;

    // Draw Y and X axis borders
    ctx.strokeStyle = '#e0e6ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY - chartHeight);
    ctx.lineTo(startX, startY);
    ctx.lineTo(startX + chartWidth, startY);
    ctx.stroke();

    // Draw Y Ticks
    ctx.fillStyle = '#0d0e12';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('₹0', startX - 10, startY);
    ctx.fillText(`₹${(maxCost / 2).toFixed(0)}`, startX - 10, startY - chartHeight / 2);
    ctx.fillText(`₹${maxCost.toFixed(0)}`, startX - 10, startY - chartHeight);

    // Draw Bars
    const numBars = displaySubs.length;
    const barSpacing = chartWidth / numBars;
    const barWidth = barSpacing * 0.45;
    ctx.textAlign = 'center';

    displaySubs.forEach((sub, i) => {
      const barHeight = (sub.cost / maxCost) * chartHeight;
      const x = startX + (i * barSpacing) + (barSpacing - barWidth) / 2;
      const y = startY - barHeight;

      // Draw rounded/flat bar
      ctx.fillStyle = '#7aa2f7';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw value on top of bar
      ctx.fillStyle = '#0d0e12';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`₹${sub.cost.toFixed(0)}`, x + barWidth / 2, y - 8);

      // Label subscription name
      ctx.fillStyle = '#565f89';
      ctx.font = '11px sans-serif';
      const label = sub.name.length > 10 ? sub.name.slice(0, 9) + '..' : sub.name;
      ctx.fillText(label, x + barWidth / 2, startY + 18);
    });
  }

  return canvas.toDataURL('image/png');
}

export default function Reports() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleExportCSV = () => {
    window.location.href = '/api/export';
  };

  const handleGeneratePDF = async () => {
    try {
      setGenerating(true);
      setError(null);

      // Fetch actual Supabase user records & profiles
      const [userRes, subRes, couponRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/subscriptions'),
        fetch('/api/coupons')
      ]);

      if (!userRes.ok || !subRes.ok || !couponRes.ok) {
        throw new Error('Failed to retrieve user data. Please ensure you are logged in.');
      }

      const user = await parseJsonResponse(userRes, '/api/auth/me');
      const allSubscriptions = await parseJsonResponse(subRes, '/api/subscriptions');
      const coupons = await parseJsonResponse(couponRes, '/api/coupons');


      // Data Processing
      const activeSubs = allSubscriptions.filter(s => s.status !== 'expired' || s.autopayEnabled);
      const expiredSubs = allSubscriptions.filter(s => s.status === 'expired' && !s.autopayEnabled);

      const totalMonthly = activeSubs.reduce((acc, sub) => {
        if (sub.billingCycle === 'yearly') return acc + (sub.cost / 12);
        if (sub.billingCycle === 'half-yearly') return acc + (sub.cost / 6);
        return acc + sub.cost;
      }, 0);

      const totalYearly = totalMonthly * 12;

      // Category breakdown spending calculation
      const CATEGORIES = ["Entertainment", "Music", "Software", "Education", "Productivity"];
      const categorySpend = {
        "Entertainment": 0,
        "Music": 0,
        "Software": 0,
        "Education": 0,
        "Productivity": 0,
        "Others": 0
      };

      activeSubs.forEach(sub => {
        let monthly = sub.cost;
        if (sub.billingCycle === 'yearly') monthly = sub.cost / 12;
        else if (sub.billingCycle === 'half-yearly') monthly = sub.cost / 6;

        const matchedCategory = CATEGORIES.find(c => c.toLowerCase() === sub.category?.toLowerCase());
        if (matchedCategory) {
          categorySpend[matchedCategory] += monthly;
        } else {
          categorySpend["Others"] += monthly;
        }
      });

      // Renewals
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrowSubs = [];
      const in3DaysSubs = [];
      const in7DaysSubs = [];

      activeSubs.forEach(s => {
        if (!s.renewalDate) return;
        const [y, m, d] = s.renewalDate.split('-').map(Number);
        const renDate = new Date(y, m - 1, d);
        renDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.round((renDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tomorrowSubs.push(s);
        } else if (diffDays > 1 && diffDays <= 3) {
          in3DaysSubs.push(s);
        } else if (diffDays > 3 && diffDays <= 7) {
          in7DaysSubs.push(s);
        }
      });

      // Coupon Metrics
      let activeCoupons = 0;
      let expiringCoupons = 0;
      coupons.forEach(c => {
        if (!c.expiryDate) {
          activeCoupons++;
        } else {
          const expDate = new Date(c.expiryDate);
          expDate.setHours(0, 0, 0, 0);
          if (expDate >= today) {
            activeCoupons++;
            const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) {
              expiringCoupons++;
            }
          }
        }
      });

      // Initialize Document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

// Load Roboto fonts for proper ₹ rendering
const robotoRegular = await fetch('/Roboto-Regular.ttf')
  .then(r => r.arrayBuffer())
  .then(buf => {
    const binary = [];
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary.push(String.fromCharCode(bytes[i]));
    }
    return binary.join('');
  });

doc.addFileToVFS('Roboto-Regular.ttf', robotoRegular);

doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

const robotoBold = await fetch('/Roboto-Bold.ttf')
  .then(r => r.arrayBuffer())
  .then(buf => {
    const binary = [];
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary.push(String.fromCharCode(bytes[i]));
    }
    return binary.join('');
  });

doc.addFileToVFS('Roboto-Bold.ttf', robotoBold);

doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

// Set default font for the document
doc.setFont('Roboto', 'normal');

      // ── PAGE 1: COVER & SUMMARY ──
      // Header graphic background
      doc.setFillColor(122, 162, 247);
      doc.rect(0, 0, 210, 36, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('MONTHLY SUBSCRIPTION REPORT', 15, 22);

      // Sub-tag
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Smart insights on your recurring spending.', 15, 29);

      // Date stamp
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 155, 22);

      // Metadata area
      doc.setTextColor(13, 14, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ACCOUNT SUMMARY', 15, 48);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Username: ${user.name || 'N/A'}`, 15, 54);
      doc.text(`Email Address: ${user.email || 'N/A'}`, 15, 60);

      // Four grid boxes
      const stats = [
        { label: 'Monthly Spend', value: `₹${totalMonthly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Yearly Estimate', value: `₹${totalYearly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Active Services', value: `${activeSubs.length}` },
        { label: 'Expired Services', value: `${expiredSubs.length}` }
      ];

      let boxX = 15;
      stats.forEach((stat, index) => {
        doc.setDrawColor(224, 230, 255);
        doc.setFillColor(248, 249, 253);
        doc.rect(boxX, 68, 42, 20, 'FD');

        doc.setTextColor(122, 162, 247);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.text(stat.value, boxX + 4, 76);

        doc.setTextColor(86, 95, 137);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(stat.label, boxX + 4, 83);

        boxX += 46;
      });

      // Category breakdown table
      doc.setTextColor(13, 14, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Category Breakdown', 15, 98);

      const categoryRows = Object.keys(categorySpend).map(cat => [
        cat,
        `₹${categorySpend[cat].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: 102,
        margin: { left: 15, right: 15 },
        head: [['Category', 'Monthly Allocation']],
        body: categoryRows,
        theme: 'striped',
        headStyles: { fillColor: [122, 162, 247], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 2 }
      });

      // Render category distribution graph
      const nextY = doc.lastAutoTable.finalY + 8;
      doc.setTextColor(13, 14, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Category Spending Allocation (Pie Chart)', 15, nextY);

      const pieChartImg = generatePieChartCanvas(categorySpend);
      doc.addImage(pieChartImg, 'PNG', 15, nextY + 3, 180, 75);

      // ── PAGE 2: CHARTS & SUBSCRIPTIONS LIST ──
      doc.addPage();

      // Page header
      doc.setFillColor(122, 162, 247);
      doc.rect(0, 0, 210, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SUBLY MONTHLY SUBSCRIPTION REPORT', 15, 8);

      // Monthly expenses bar chart
      doc.setTextColor(13, 14, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Monthly Subscription Cost Analysis (Top 5)', 15, 22);

      const barChartImg = generateBarChartCanvas(activeSubs);
      doc.addImage(barChartImg, 'PNG', 15, 25, 180, 80);

      // Subscriptions summary table
      doc.setTextColor(13, 14, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Subscription Summary Detail', 15, 115);

      const subTableRows = activeSubs.map(s => [
        s.name,
        `₹${parseFloat(s.cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        s.billingCycle,
        s.renewalDate || 'N/A',
        s.autopayEnabled ? 'ON' : 'OFF'
      ]);

      if (subTableRows.length === 0) {
        subTableRows.push(['No subscriptions available.', '-', '-', '-', '-']);
      }

      autoTable(doc, {
        startY: 119,
        margin: { left: 15, right: 15 },
        head: [['Service', 'Cost', 'Billing Cycle', 'Next Renewal', 'AutoPay Status']],
        body: subTableRows,
        theme: 'grid',
        headStyles: { fillColor: [187, 154, 247], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 2 }
      });

      // ── PAGE 3: RENEWALS & COUPONS & AUTOPAY ──
      doc.addPage();

      // Page header
      doc.setFillColor(122, 162, 247);
      doc.rect(0, 0, 210, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SUBLY MONTHLY SUBSCRIPTION REPORT', 15, 8);

      // Upcoming renewals header
      doc.setTextColor(13, 14, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Upcoming Renewals Timeline', 15, 22);

      let renewY = 28;

      const drawPdfRenewList = (title, list, colorHex) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(colorHex);
        doc.text(title, 15, renewY);
        renewY += 5;

        if (list.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(120, 120, 120);
          doc.text('No renewals registered for this period.', 20, renewY);
          renewY += 7;
        } else {
          list.forEach(sub => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(13, 14, 18);
            doc.text(`• ${sub.name} - renewing on ${sub.renewalDate} (Cost: ₹${parseFloat(sub.cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, 20, renewY);
            renewY += 5.5;
          });
          renewY += 3;
        }
      };

      drawPdfRenewList('Renewing Tomorrow', tomorrowSubs, '#f7768e');
      drawPdfRenewList('Renewing Within 3 Days', in3DaysSubs, '#e0af68');
      drawPdfRenewList('Renewing Within 7 Days', in7DaysSubs, '#7aa2f7');

      // AutoPay Summary section
      renewY += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(13, 14, 18);
      doc.text('AutoPay Renewal Tracker', 15, renewY);
      renewY += 5.5;

      const autopaySubs = activeSubs.filter(s => s.autopayEnabled);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Active Auto-renewing Subscriptions: ${autopaySubs.length}`, 15, renewY);
      renewY += 4;

      const autopayRows = autopaySubs.map(s => [
        s.name,
        s.renewalDate || 'N/A',
        `₹${parseFloat(s.cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      if (autopayRows.length === 0) {
        autopayRows.push(['No subscriptions have auto-payment enabled.', '-', '-']);
      }

      autoTable(doc, {
        startY: renewY,
        margin: { left: 15, right: 15 },
        head: [['Service', 'Renewal Date', 'Cost']],
        body: autopayRows,
        theme: 'grid',
        headStyles: { fillColor: [158, 206, 106], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 2 }
      });

      // CouponSummary section
      const nextY2 = doc.lastAutoTable.finalY + 8;
      doc.setTextColor(13, 14, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Coupon Vault summary', 15, nextY2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Total Coupons: ${coupons.length}  |  Active: ${activeCoupons}  |  Expiring (7 days): ${expiringCoupons}`, 15, nextY2 + 5.5);

      const couponRows = coupons.map(c => {
        let discountStr = c.discount || '-';
        if (discountStr !== '-' && !discountStr.includes('%') && !discountStr.startsWith('₹') && !isNaN(parseFloat(discountStr))) {
          discountStr = `₹${parseFloat(discountStr).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return [
          c.code,
          discountStr,
          c.expiryDate || 'Global / Not Specified'
        ];
      });

      if (couponRows.length === 0) {
        couponRows.push(['No coupons registered.', '-', '-']);
      }

      autoTable(doc, {
        startY: nextY2 + 10,
        margin: { left: 15, right: 15 },
        head: [['Coupon Code', 'Discount', 'Expiry Date']],
        body: couponRows,
        theme: 'grid',
        headStyles: { fillColor: [86, 95, 137], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 2 }
      });

      doc.save('Subly_Monthly_Subscription_Report.pdf');
    } catch (err) {
      console.error('Error generating PDF report:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Reports</h1>
          <p>Export your subscription and spending data.</p>
        </div>
      </header>

      {error && (
        <div className="error-banner" style={{
          backgroundColor: 'rgba(247, 118, 142, 0.1)',
          border: '1px solid var(--danger, #f7768e)',
          color: 'var(--danger, #f7768e)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      <div className={styles.grid}>
        <div className={`glass-panel ${styles.reportCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <FileText size={32} color="var(--primary)" />
            </div>
            <h2>Complete Subscription Report</h2>
          </div>
          <p>Download a comprehensive CSV file containing all your active, expiring, and past subscriptions along with their costs and categories.</p>
          <button onClick={handleExportCSV} className={styles.downloadBtn}>
            <Download size={18} />
            Download to CSV
          </button>
        </div>

        <div className={`glass-panel ${styles.reportCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <FileText size={32} color="var(--secondary)" />
            </div>
            <h2>PDF Summary</h2>
          </div>
          <p>A beautifully formatted PDF document showing charts, spending breakdowns, and upcoming renewals.</p>
          <button 
            onClick={handleGeneratePDF} 
            disabled={generating} 
            className={styles.downloadBtn}
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Generating PDF...
              </>
            ) : (
              <>
                <Download size={18} />
                Generate PDF Summary
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
