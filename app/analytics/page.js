"use client";

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { parseJsonResponse } from '@/lib/api-client';

const COLORS = ['#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68', '#f7768e'];

export default function Analytics() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalyticsData = () => {
    setError(null);
    setLoading(true);
    fetch('/api/subscriptions')
      .then(res => parseJsonResponse(res, '/api/subscriptions'))
      .then(data => {
        const safeData = Array.isArray(data) ? data : [];
        setSubscriptions(safeData.filter(sub => sub.status !== 'expired' || sub.autopayEnabled));
        setLoading(false);
      })
      .catch(err => {
        console.error("Analytics fetch error:", err);
        setError(err.message);
        setSubscriptions([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  if (loading) return <div className={styles.loading}>Loading Analytics...</div>;

  // Data processing for charts
  const categoryCount = {};
  const categorySpend = {};
  
  subscriptions.forEach(sub => {
    let monthlyCost = sub.cost;
    if (sub.billingCycle === 'yearly') {
      monthlyCost = sub.cost / 12;
    } else if (sub.billingCycle === 'half-yearly') {
      monthlyCost = sub.cost / 6;
    }
    
    // Count per category
    categoryCount[sub.category] = (categoryCount[sub.category] || 0) + 1;
    // Spend per category
    categorySpend[sub.category] = (categorySpend[sub.category] || 0) + monthlyCost;
  });

  const pieChartData = Object.keys(categoryCount).map(key => ({
    name: key,
    value: categoryCount[key]
  }));

  const barChartData = Object.keys(categorySpend).map(key => ({
    name: key,
    spend: parseFloat(categorySpend[key].toFixed(2))
  }));

  const totalMonthly = barChartData.reduce((acc, item) => acc + item.spend, 0);

  const formatLabel = (value) => 
    typeof value === 'string' && value.length > 10 ? value.slice(0, 10) + "..." : value;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Analytics</h1>
          <p>Understand your spending habits.</p>
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
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => fetchAnalyticsData()} style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}>Retry</button>
        </div>
      )}

      <div className={styles.summaryStats}>
        <div className={`glass-panel ${styles.statBox}`}>
          <h3>Total Monthly Spend</h3>
          <div className={styles.statValue}>{totalMonthly.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div>
        </div>
        <div className={`glass-panel ${styles.statBox}`}>
          <h3>Total Yearly Projection</h3>
          <div className={styles.statValue}>{(totalMonthly * 12).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={`glass-panel ${styles.chartCard}`}>
          <h3>Spending by Category (Monthly)</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  angle={-30} 
                  textAnchor="end" 
                  interval={0}
                  tickFormatter={formatLabel}
                  height={50}
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${value}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }} 
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="spend" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`glass-panel ${styles.chartCard}`}>
          <h3>Subscriptions by Category</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
