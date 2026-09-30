import { describe, expect, it } from 'vitest';

const BASE_URL = process.env.TAKEMASTER_BASE_URL || 'https://takemaster.olfnetto.workers.dev';

describe('F5 production onboarding API', () => {
  it('serves health as JSON from the Worker', async () => {
    const response = await fetch(`${BASE_URL}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.dependencies?.supabase?.configured).toBe(true);
    expect(body.dependencies?.supabase?.connected).toBe(true);
  });

  it('requires authentication for the private RS Play catalog', async () => {
    const response = await fetch(`${BASE_URL}/api/catalog/programs`);

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await response.json();
    expect(body.code).toBe('AUTH_REQUIRED');
  });

  it('requires authentication before contracting a program', async () => {
    const response = await fetch(
      `${BASE_URL}/api/contract/program/00000000-0000-0000-0000-000000000000`,
      { method: 'POST' },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await response.json();
    expect(body.code).toBe('AUTH_REQUIRED');
  });
});
