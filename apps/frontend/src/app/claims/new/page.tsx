'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ALL_SERVICE_TYPES } from '@/lib/types';

const SERVICE_TYPES = ALL_SERVICE_TYPES;

export default function SubmitClaim() {
  const [members, setMembers] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [memberId, setMemberId] = useState('');
  const [policyId, setPolicyId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [dateOfService, setDateOfService] = useState('');
  const [lineItems, setLineItems] = useState([{ service_type: 'CONSULTATION', description: '', billed_amount: '' }]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getMembers().then((r) => setMembers(r.data || [])).catch(() => {});
    api.getPolicies().then((r) => setPolicies(r.data || [])).catch(() => {});
  }, []);

  function addLineItem() {
    setLineItems([...lineItems, { service_type: 'CONSULTATION', description: '', billed_amount: '' }]);
  }

  function removeLineItem(idx: number) {
    if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx: number, field: string, value: string) {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = value;
    setLineItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      const data = {
        member_id: parseInt(memberId),
        policy_id: parseInt(policyId),
        provider_name: providerName,
        diagnosis_code: diagnosisCode,
        date_of_service: dateOfService,
        line_items: lineItems.map((li) => ({
          ...li,
          billed_amount: parseFloat(li.billed_amount),
        })),
      };
      const res = await api.submitClaim(data);
      setResult(res.data);
    } catch (e: any) {
      setError(e.message);
    }
    setSubmitting(false);
  }

  return (
    <>
      <h1 className="page-title">Submit Claim</h1>
      <p className="page-subtitle">Create a new insurance claim with line items</p>

      {error && <div className="alert alert-error">{error}</div>}

      {result ? (
        <div>
          <div className="alert alert-success">
            Claim {result.claim?.claim_number} submitted and adjudicated!
            Status: <strong>{result.adjudication?.claimStatus}</strong> |
            Approved: <strong>${result.adjudication?.totalApproved?.toFixed(2)}</strong>
          </div>
          <a href={`/claims/${result.claim?.id}`}><button className="btn btn-primary">View Claim Details</button></a>
          <button className="btn btn-outline" style={{ marginLeft: '0.5rem' }} onClick={() => { setResult(null); setLineItems([{ service_type: 'CONSULTATION', description: '', billed_amount: '' }]); }}>Submit Another</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Claim Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Member</label>
                <select className="form-select" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
                  <option value="">Select member...</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Policy</label>
                <select className="form-select" value={policyId} onChange={(e) => setPolicyId(e.target.value)} required>
                  <option value="">Select policy...</option>
                  {policies.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.policy_number} — {p.member?.first_name} {p.member?.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Provider Name</label>
                <input className="form-input" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Dr. Jane Smith" required />
              </div>
              <div className="form-group">
                <label className="form-label">Diagnosis Code</label>
                <input className="form-input" value={diagnosisCode} onChange={(e) => setDiagnosisCode(e.target.value)} placeholder="J06.9" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Service</label>
              <input className="form-input" type="date" value={dateOfService} onChange={(e) => setDateOfService(e.target.value)} required />
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="line-items-header">
              <h3 style={{ fontWeight: 700 }}>Line Items</h3>
              <button type="button" className="btn btn-outline btn-sm" onClick={addLineItem}>+ Add Item</button>
            </div>
            {lineItems.map((li, idx) => (
              <div key={idx} className="line-item-card">
                <div className="form-row" style={{ gridTemplateColumns: '1fr 2fr 1fr auto' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Service Type</label>
                    <select className="form-select" value={li.service_type} onChange={(e) => updateLineItem(idx, 'service_type', e.target.value)}>
                      {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description</label>
                    <input className="form-input" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Office visit for..." required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Amount ($)</label>
                    <input className="form-input" type="number" step="0.01" min="0.01" value={li.billed_amount} onChange={(e) => updateLineItem(idx, 'billed_amount', e.target.value)} placeholder="150.00" required />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.1rem' }}>
                    {lineItems.length > 1 && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLineItem(idx)}>✕</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting & Adjudicating...' : 'Submit Claim'}
          </button>
        </form>
      )}
    </>
  );
}
