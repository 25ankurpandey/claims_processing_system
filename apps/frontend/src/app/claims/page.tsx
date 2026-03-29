'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ALL_CLAIM_STATUSES } from '@/lib/types';

const STATUSES = ['', ...ALL_CLAIM_STATUSES];

export default function ClaimsList() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadClaims(); }, [filterStatus]);

  async function loadClaims() {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : undefined;
      const res = await api.getClaims(params);
      setClaims(res.data || []);
    } catch { setClaims([]); }
    setLoading(false);
  }

  return (
    <>
      <h1 className="page-title">Claims</h1>
      <p className="page-subtitle">All submitted insurance claims</p>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <label className="form-label" style={{ margin: 0 }}>Filter by status:</label>
        <select className="form-select" style={{ width: '200px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
        </select>
        <a href="/claims/new"><button className="btn btn-primary">+ Submit Claim</button></a>
      </div>

      {loading ? (
        <div className="loading">Loading claims...</div>
      ) : claims.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No claims found. <a href="/claims/new">Submit your first claim</a>.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Claim #</th><th>Member</th><th>Provider</th><th>Diagnosis</th><th>Status</th><th>Billed</th><th>Approved</th><th>Date</th></tr>
            </thead>
            <tbody>
              {claims.map((c: any) => (
                <tr key={c.id}>
                  <td><a href={`/claims/${c.id}`}>{c.claim_number}</a></td>
                  <td>{c.member ? `${c.member.first_name} ${c.member.last_name}` : `#${c.member_id}`}</td>
                  <td>{c.provider_name}</td>
                  <td><code>{c.diagnosis_code}</code></td>
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
    </>
  );
}
