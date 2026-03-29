'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function PoliciesList() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPolicies().then((r) => setPolicies(r.data || [])).catch(() => {});
    setLoading(false);
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      <h1 className="page-title">Policies</h1>
      <p className="page-subtitle">Insurance policies and their coverage rules</p>

      {policies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No policies found. Seed the database from the Dashboard.</p>
        </div>
      ) : (
        policies.map((p: any) => (
          <div key={p.id} className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.policy_number}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {p.member ? `${p.member.first_name} ${p.member.last_name}` : `Member #${p.member_id}`} •
                  {new Date(p.effective_date).toLocaleDateString()} → {new Date(p.expiration_date).toLocaleDateString()}
                </p>
              </div>
              <span className={`badge ${p.is_active ? 'badge-approved' : 'badge-denied'}`}>
                {p.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="card-grid" style={{ marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Annual Deductible</span>
                <div className="amount" style={{ fontSize: '1.2rem' }}>${Number(p.annual_deductible).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Annual Max Benefit</span>
                <div className="amount amount-approved" style={{ fontSize: '1.2rem' }}>${Number(p.annual_max_benefit).toFixed(2)}</div>
              </div>
            </div>
            {p.coverageRules?.length > 0 && (
              <>
                <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--accent-light)' }}>Coverage Rules</h4>
                <table>
                  <thead>
                    <tr><th>Service</th><th>Covered</th><th>%</th><th>Max Amount</th><th>Period</th><th>Pre-Auth</th></tr>
                  </thead>
                  <tbody>
                    {p.coverageRules.map((r: any) => (
                      <tr key={r.id}>
                        <td>{r.service_type.replace('_', ' ')}</td>
                        <td>{r.is_covered ? '✅' : '❌'}</td>
                        <td>{r.coverage_percentage}%</td>
                        <td className="amount">${Number(r.max_amount).toFixed(2)}</td>
                        <td>{r.limit_period.replace('_', ' ')}</td>
                        <td>{r.requires_pre_auth ? '⚠️' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        ))
      )}
    </>
  );
}
