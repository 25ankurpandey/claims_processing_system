'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function ClaimDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => { loadClaim(); }, [id]);

  async function loadClaim() {
    try {
      const res = await api.getClaim(id);
      setClaim(res.data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleTransition(status: string) {
    try {
      await api.transitionClaim(id, status);
      setActionMsg(`Claim transitioned to ${status}`);
      loadClaim();
    } catch (e: any) { setActionMsg(`Error: ${e.message}`); }
  }

  async function handleDispute() {
    try {
      await api.disputeClaim(id);
      setActionMsg('Claim disputed. It will be re-reviewed.');
      loadClaim();
    } catch (e: any) { setActionMsg(`Error: ${e.message}`); }
  }

  async function handleReAdjudicate() {
    try {
      await api.adjudicateClaim(id);
      setActionMsg('Claim re-adjudicated.');
      loadClaim();
    } catch (e: any) { setActionMsg(`Error: ${e.message}`); }
  }

  if (loading) return <div className="loading">Loading claim...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!claim) return <div className="alert alert-error">Claim not found</div>;

  const lineItems = claim.lineItems || [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Claim {claim.claim_number}</h1>
          <p className="page-subtitle">
            {claim.member ? `${claim.member.first_name} ${claim.member.last_name}` : ''} •
            {claim.provider_name} •
            {new Date(claim.date_of_service).toLocaleDateString()}
          </p>
        </div>
        <span className={`badge badge-${claim.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
          {claim.status.replace('_', ' ')}
        </span>
      </div>

      {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

      <div className="card-grid">
        <div className="card">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value amount">${Number(claim.total_amount).toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Approved</div>
          <div className="stat-value amount amount-approved">${Number(claim.approved_amount).toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Paid</div>
          <div className="stat-value amount" style={{ color: 'var(--purple)' }}>${Number(claim.paid_amount).toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Diagnosis Code</div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}><code>{claim.diagnosis_code}</code></div>
        </div>
      </div>

      {/* Coverage Rules from Policy */}
      {claim.policy?.coverageRules && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Policy Coverage Rules</h3>
          <table>
            <thead>
              <tr><th>Service Type</th><th>Covered</th><th>%</th><th>Max</th><th>Period</th><th>Pre-Auth</th></tr>
            </thead>
            <tbody>
              {claim.policy.coverageRules.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.service_type.replace('_', ' ')}</td>
                  <td>{r.is_covered ? '✅' : '❌'}</td>
                  <td>{r.coverage_percentage}%</td>
                  <td className="amount">${Number(r.max_amount).toFixed(2)}</td>
                  <td>{r.limit_period.replace('_', ' ')}</td>
                  <td>{r.requires_pre_auth ? '⚠️ Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Line Items with Explanations */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Line Items & Adjudication Results</h3>
        {lineItems.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No line items</p>
        ) : (
          lineItems.map((li: any) => (
            <div key={li.id} className="line-item-card">
              <div className="line-item-row">
                <div>
                  <strong>{li.service_type.replace('_', ' ')}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>— {li.description}</span>
                </div>
                <span className={`badge badge-${li.status.toLowerCase()}`}>{li.status}</span>
              </div>
              <div className="line-item-row" style={{ marginTop: '0.5rem' }}>
                <div>
                  <span className="amount amount-billed">Billed: ${Number(li.billed_amount).toFixed(2)}</span>
                  <span style={{ margin: '0 0.75rem', color: 'var(--border)' }}>→</span>
                  <span className={`amount ${li.status === 'APPROVED' ? 'amount-approved' : 'amount-denied'}`}>
                    Approved: ${Number(li.approved_amount).toFixed(2)}
                  </span>
                  {li.denial_reason && (
                    <span className="badge badge-denied" style={{ marginLeft: '0.75rem' }}>{li.denial_reason.replace('_', ' ')}</span>
                  )}
                </div>
              </div>
              {li.explanation && (
                <div className="explanation">
                  💡 {li.explanation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Actions</h3>
        <div className="btn-group">
          {claim.status === 'UNDER_REVIEW' && (
            <button className="btn btn-primary" onClick={handleReAdjudicate}>🔄 Re-Adjudicate</button>
          )}
          {(claim.status === 'APPROVED' || claim.status === 'PARTIALLY_APPROVED') && (
            <>
              <button className="btn btn-success" onClick={() => handleTransition('PAID')}>💰 Mark as Paid</button>
              <button className="btn btn-danger" onClick={handleDispute}>⚠️ Dispute</button>
            </>
          )}
          {claim.status === 'DENIED' && (
            <button className="btn btn-danger" onClick={handleDispute}>⚠️ Dispute Decision</button>
          )}
          {claim.status === 'DISPUTED' && (
            <button className="btn btn-primary" onClick={() => handleTransition('UNDER_REVIEW')}>🔄 Return to Review</button>
          )}
          {claim.status === 'PAID' && (
            <button className="btn btn-outline" onClick={() => handleTransition('CLOSED')}>✅ Close Claim</button>
          )}
        </div>
      </div>
    </>
  );
}
