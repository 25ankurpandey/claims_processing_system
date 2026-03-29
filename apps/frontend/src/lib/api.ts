const API_BASE = '/api/v1';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || data.message || 'API Error');
  return data;
}

export const api = {
  // Members
  getMembers: () => fetchApi<any>('/members'),
  getMember: (id: number) => fetchApi<any>(`/members/${id}`),
  createMember: (data: any) => fetchApi<any>('/members', { method: 'POST', body: JSON.stringify(data) }),

  // Policies
  getPolicies: () => fetchApi<any>('/policies'),
  getPolicy: (id: number) => fetchApi<any>(`/policies/${id}`),
  createPolicy: (data: any) => fetchApi<any>('/policies', { method: 'POST', body: JSON.stringify(data) }),

  // Claims
  getClaims: (params?: { status?: string; member_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.member_id) query.set('member_id', String(params.member_id));
    const qs = query.toString();
    return fetchApi<any>(`/claims${qs ? `?${qs}` : ''}`);
  },
  getClaim: (id: number) => fetchApi<any>(`/claims/${id}`),
  submitClaim: (data: any) => fetchApi<any>('/claims', { method: 'POST', body: JSON.stringify(data) }),
  adjudicateClaim: (id: number) => fetchApi<any>(`/claims/${id}/adjudicate`, { method: 'POST' }),
  transitionClaim: (id: number, status: string) =>
    fetchApi<any>(`/claims/${id}/transition`, { method: 'POST', body: JSON.stringify({ status }) }),
  disputeClaim: (id: number) => fetchApi<any>(`/claims/${id}/dispute`, { method: 'POST' }),

  // System
  seed: () => fetchApi<any>('/seed', { method: 'POST' }),
  health: () => fetchApi<any>('/health'),
};
