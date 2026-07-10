import React from 'react';
import { COLORS, SOLL_KATEGORIEN } from '../constants/config';

export default function InventarTab({
  inventar,
  newArtikelKat,
  setNewArtikelKat,
  newGroesse,
  setNewGroesse,
  newZustand,
  setNewZustand,
  handleAddInventar,
  lagerFilter,
  setLagerFilter,
  groessenFilter,
  setGroessenFilter,
  zustandFilter,
  setZustandFilter,
  existierendeGroessen,
  existierendeZustaende
}) {
  const gefiltertesInventar = inventar.filter(item => {
    const passtKategorie = lagerFilter === 'Alle' || item.artikel === lagerFilter;
    const passtGroesse = groessenFilter === 'Alle' || (item.groesse && item.groesse.toUpperCase() === groessenFilter.toUpperCase());
    const passtZustand = zustandFilter === 'Alle' || item.zustand === zustandFilter;
    return passtKategorie && passtGroesse && passtZustand;
  });

  return (
    <div>
      <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px' }}>Neues Uniformteil erfassen</h3>
      <form onSubmit={handleAddInventar} style={{ background: COLORS.pureWhite, padding: '12px', borderRadius: '8px', marginBottom: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select value={newArtikelKat} onChange={e => setNewArtikelKat(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px' }}>
            {SOLL_KATEGORIEN.map(kat => <option key={kat} value={kat}>{kat}</option>)}
          </select>
          <input type="text" placeholder="Größe (z.B. M)" value={newGroesse} onChange={e => setNewGroesse(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select value={newZustand} onChange={e => setNewZustand(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px' }}>
            <option value="Neu">Zustand: Neu</option>
            <option value="Sehr Gut">Zustand: Sehr Gut</option>
            <option value="Gebraucht">Zustand: Gebraucht</option>
          </select>
          <button type="submit" style={{ background: COLORS.statusGreen, color: COLORS.pureWhite, border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>Teil einbuchen</button>
        </div>
      </form>

      <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Lagerbestand ({inventar.length} Teile)</h3>
      
      {/* Filterbox */}
      <div style={{ background: COLORS.pureWhite, padding: '12px', borderRadius: '8px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Kategorie</label>
          <select value={lagerFilter} onChange={e => setLagerFilter(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px', fontWeight: 'bold' }}>
            <option value="Alle">Alle Kategorien</option>
            {SOLL_KATEGORIEN.map(kat => <option key={kat} value={kat}>{kat}n</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Größe</label>
          <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '3px' }}>
            {existierendeGroessen.map(g => {
              const istAktiv = groessenFilter === g;
              return (
                <button key={g} type="button" onClick={() => setGroessenFilter(g)} style={{ padding: '5px 12px', borderRadius: '4px', border: istAktiv ? 'none' : `1px solid ${COLORS.borderLight}`, background: istAktiv ? COLORS.primaryRed : COLORS.appBackground, color: istAktiv ? COLORS.pureWhite : COLORS.textDark, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {g === 'Alle' ? 'Alle' : g}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Zustand</label>
          <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '3px' }}>
            {existierendeZustaende.map(z => {
              const istAktiv = zustandFilter === z;
              return (
                <button key={z} type="button" onClick={() => setZustandFilter(z)} style={{ flex: 1, minWidth: '60px', padding: '5px 8px', borderRadius: '4px', border: istAktiv ? 'none' : `1px solid ${COLORS.borderLight}`, background: istAktiv ? COLORS.textDark : COLORS.appBackground, color: istAktiv ? COLORS.pureWhite : COLORS.textDark, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {z === 'Alle' ? 'Alle' : z}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ergebnisliste */}
      <div style={{ maxHeight: '45vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px' }}>
        {gefiltertesInventar.map(item => (
          <div key={item.id} style={{ padding: '10px 5px', borderBottom: `1px solid ${COLORS.borderLight}`, display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', background: COLORS.appBackground, padding: '2px 6px', marginRight: '8px', borderRadius: '4px' }}>{item.id}</span>
                <strong>{item.artikel}</strong>
              </div>
              <span style={{ color: item.status === 'Frei' || item.status === 'Free' ? COLORS.statusGreen : COLORS.primaryRed, fontWeight: 'bold', fontSize: '12px' }}>
                {item.status}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginLeft: '45px' }}>
              {item.groesse && <span style={{ marginRight: '10px' }}>📏 Gr: {item.groesse}</span>}
              {item.zustand && <span>✨ {item.zustand}</span>}
            </div>
          </div>
        ))}

        {gefiltertesInventar.length === 0 && (
          <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '20px', fontSize: '12px', fontStyle: 'italic' }}>
            Keine Uniformteile mit dieser Filter-Kombination im Lager.
          </div>
        )}
      </div>
    </div>
  );
}