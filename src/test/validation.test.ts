import { describe, it, expect } from 'vitest';
import { loginSchema, loadedDataSchema } from '@/lib/validation';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ matricule: 'AGT001', password: 'pass123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty matricule', () => {
    const result = loginSchema.safeParse({ matricule: '', password: 'pass123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ matricule: 'AGT001', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects matricule over 50 chars', () => {
    const result = loginSchema.safeParse({ matricule: 'A'.repeat(51), password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from matricule', () => {
    const result = loginSchema.parse({ matricule: '  AGT001  ', password: 'pass' });
    expect(result.matricule).toBe('AGT001');
  });
});

describe('loadedDataSchema', () => {
  it('accepts valid loaded data structure', () => {
    const data = {
      abonnes: [{ NUM_TRN_ABO: '01', NUM_SEC_LIV_ABO: 'A', NUM_RUE_TRN_ABO: 'R1', NUM_TRC_RUE_TRN_ABO: 1, NO_RUE_LIV_ABO: 10, NO_ETG_LIV_ABO: 0, NUM_SEC_RGR_ABO: 'S1', NUM_PNT_DRT_ABO: 'P001', ORDRE: 1 }],
      tournees: [{ NUM_TRN: '01' }],
    };
    const result = loadedDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('defaults missing arrays to empty', () => {
    const result = loadedDataSchema.parse({ abonnes: [], tournees: [] });
    expect(result.compteurs).toEqual([]);
    expect(result.anomalies).toEqual([]);
  });

  it('rejects abonne missing required fields', () => {
    const data = {
      abonnes: [{ NUM_TRN_ABO: '01' }], // missing required fields
      tournees: [],
    };
    const result = loadedDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
