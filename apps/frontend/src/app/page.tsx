'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function Dashboard() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedMsg, setSeedMsg] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await api.getClaims();
      setClaims(res.data || []);
    } catch { /* empty initial state is fine */ }
    setLoading(false);
  }

  async function handleSeed() {
    try {
      await api.seed();
      setSeedMsg('Database seeded! Refresh to see demo data.');
      loadData();
    } catch (e: any) { setSeedMsg(`Seed failed: ${e.message}`); }
  }

  const statusCounts: Record<string, number> = {};
  claims.forEach((c: any) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
  const totalBilled = claims.reduce((s: number, c: any) => s + Number(c.total_amount || 0), 0);
  const totalApproved = claims.reduce((s: number, c: any) => s + Number(c.approved_amount || 0), 0);

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Claims processing overview</p>

      {seedMsg && <div className="alert alert-success">{seedMsg}</div>}

      <div className="card-grid">
        <div className="card">
          <div className="stat-value">{claims.length}</div>
          <div className="stat-label">Total Claims</div>
        </div>
        <div className="card">
          <div className="stat-value amount amount-billed">${totalBilled.toFixed(2)}</div>
          <div className="stat-label">Total Billed</div>
        </div>
        <div className="card">
          <div className="stat-value amount amount-approved">${totalApproved.toFixed(2)}</div>
          <div className="stat-label">Total Approved</div>
        </div>
        <div className="card">
          <div className="stat-value">{statusCounts['DENIED'] || 0}</div>
          <div className="stat-label">Denied Claims</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Claims by Status</h3>
        {Object.entries(statusCounts).length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No claims yet. Seed the database to get started.</p>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge badge-${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>
                <span style={{ fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {claims.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Recent Claims</h3>
          <table>
            <thead>
              <tr><th>Claim #</th><th>Member</th><th>Status</th><th>Billed</th><th>Approved</th><th>Date</th></tr>
            </thead>
            <tbody>
              {claims.slice(0, 10).map((c: any) => (
                <tr key={c.id}>
                  <td><a href={`/claims/${c.id}`}>{c.claim_number}</a></td>
                  <td>{c.member ? `${c.member.first_name} ${c.member.last_name}` : `Member #${c.member_id}`}</td>
                  <td><span className={`badge badge-${c.status.toLowerCase()}`}>{c.status.replace('_', ' ')}</span></td>
                  <td className="amount">${Number(c.total_amount).toFixed(2)}</td>
                  <td className="amount amount-approved">${Number(c.approved_amount).toFixed(2)}</td>
                  <td>{new Date(c.date_of_service).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      <div style={{ marginTop: '2rem' }}>
        <button className="btn btn-outline" onClick={handleSeed}>🌱 Seed Demo Data</button>
      </div>
    </>
  );
}
