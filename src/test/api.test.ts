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
    const json = '\uFEFF' + JSON.stringify({ ABO: [{ NUM_PNT_DRT_ABO: '0123895' }] });
    const data = parseLoadedDataFromJSON(json);
    expect(data.abonnes).toHaveLength(1);
  });

  it('maps SDF table names strictly (CSO vs CSO_RLV)', () => {
    const json = JSON.stringify({
      ABO: [{ NUM_PNT_DRT_ABO: '0123895', NUM_CTA_ABO: '0194035', ORDRE: 1, NOM_COM: 'KHROUB' }],
      CSO: [{ NUM_PNT_DRT_CSO: '0123895', ANN_HIS_CSO: '2020', PER_HIS_CSO: 3, VAL_IDX_CSO: 2605 }],
      CSO_RLV: [{ NUM_PNT_DRT: '0123895', PER_HIS_RLV: 3, ANN_HIS_RLV: 2024, VAL_IDX_CSO_RLV: 103 }],
    });
    const data = parseLoadedDataFromJSON(json);
    expect(data.consommations).toHaveLength(1);
    expect(data.relevesExistants).toHaveLength(1);
    expect(data.relevesExistants?.[0].VAL_IDX_CSO_RLV).toBe(103);
    // PNT_DRT / APT dérivés de ABO quand absents
    expect(data.pointsDroit[0].NUM_PNT_DRT).toBe('0123895');
  });

  it('ignores rows without NUM_PNT_DRT_ABO', () => {
    const json = JSON.stringify({ ABO: [{ id: 1 }] });
    expect(parseLoadedDataFromJSON(json).abonnes).toHaveLength(0);
  });

  it('maps SOAP aliases to SDF field names', () => {
    const json = JSON.stringify({
      ABO: [{
        NUM_PNT_DRT_ABO: '0411218',
        NomCommune: 'KHROUB',
        NumeroCommune: 3,
        NumeroPhysiqueRegroupant: '12345',
        RPG_APT_PNT_DRT: 'NON RENSEIGNE',
        IND_ACB_APT_PNT_DRT: 'R',
        ANC_NUM_ORD_REL_PNT_DRT: 42,
      }],
    });
    const a = parseLoadedDataFromJSON(json).abonnes[0];
    expect(a.NOM_COM).toBe('KHROUB');
    expect(a.NUM_COM).toBe(3);
    expect(a.NUM_PHY_APT_RGR).toBe('12345');
    expect(a.RPG_APT_PNT_DRT_ABO).toBe('NON RENSEIGNE');
    expect(a.IND_ACB_APT_ABO).toBe('R');
    expect(a.ORDRE).toBe(42);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseLoadedDataFromJSON('not json')).toThrow();
  });
});
