import { describe, it, expect } from 'vitest';
import { parseLoadedDataFromJSON } from '@/services/api';

describe('parseLoadedDataFromJSON', () => {
  it('parses a valid JSON with known keys', () => {
    const json = JSON.stringify({
      abo: [{ NUM_TRN_ABO: '01', NUM_PNT_DRT_ABO: 'P001' }],
      trn: [{ NUM_TRN: '01' }],
    });
    const data = parseLoadedDataFromJSON(json);
    expect(data.abonnes).toHaveLength(1);
    expect(data.tournees).toHaveLength(1);
  });

  it('parses a flat array as abonnes', () => {
    const json = JSON.stringify([{ NUM_PNT_DRT_ABO: 'P001' }]);
    const data = parseLoadedDataFromJSON(json);
    expect(data.abonnes).toHaveLength(1);
    expect(data.tournees).toEqual([]);
  });

  it('handles BOM prefix', () => {
    const json = '\uFEFF' + JSON.stringify({ abo: [{ id: 1 }] });
    const data = parseLoadedDataFromJSON(json);
    expect(data.abonnes).toHaveLength(1);
  });

  it('falls back to positional mapping for unknown keys', () => {
    const json = JSON.stringify({ x: [{ a: 1 }], y: [{ b: 2 }] });
    const data = parseLoadedDataFromJSON(json);
    expect(data.abonnes).toHaveLength(1);
    expect(data.tournees).toHaveLength(1);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseLoadedDataFromJSON('not json')).toThrow();
  });
});
