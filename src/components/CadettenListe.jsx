import React, { useState } from 'react';
import { COLORS } from '../constants/config';
import { getSollKategorienFuerCadett } from '../constants/config'; // Pfad anpassen, falls nötig

export default function CadettenListe({
  cadetten,
  allAusgaben,
  setSelectedCadett,
  newVorname,
  setNewVorname,
  newNachname,
  setNewNachname,
  handleAddCadett
}) {
  const [ausruestungsFilter, setAusruestungsFilter] = useState('Alle');
  const [suchBegriff, setSuchBegriff] = useState('');

  // Live-Filter & Suche anwenden
  const gefilterteCadetten = cadetten.filter(c => {
    // 1. Suche nach Namen
    const matchSuche = 
      c.vorname.toLowerCase().includes(suchBegriff.toLowerCase()) ||
      c.nachname.toLowerCase().includes(suchBegriff.toLowerCase());

    if (!matchSuche) return false;

    // 2. Filter nach Ausrüstung
    if (ausruestungsFilter === 'Unvollständig') {
      const anzahlAusgegeben = allAusgaben.filter(a => a.cadetten_id === c.id).length;
      const sollAnzahl = getSollKategorienFuerCadett(c).length;
      return anzahlAusgegeben < sollAnzahl;
    }

    return true;
  });

  return (
    <div>
      {/* FIXED/STICKY HEADER-BEREICH */}
      <div style={{ 
        position: '-webkit-sticky',
        position: 'sticky', 
        top: '-15px', 
        backgroundColor: COLORS.appBackground, 
        padding: '15px 5px 10px 5px', 
        zIndex: 99, 
        borderBottom: `1px solid ${COLORS.borderLight}`,
        marginBottom: '15px'
      }}>
        {/* Formular: Neuen Cadetten eintragen */}
        <h3 style={{ 
          fontSize: '16px', 
          color: COLORS.primaryRed, 
          borderBottom: `2px solid ${COLORS.primaryRed}`, 
          paddingBottom: '5px',
          margin: '0 0 10px 0'
        }}>
          Neuen Cadetten eintragen
        </h3>
        
        <form onSubmit={handleAddCadett} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input 
            type="text" 
            placeholder="Vorname" 
            value={newVorname} 
            onChange={e => setNewVorname(e.target.value)} 
            autoCapitalize="words" 
            autoComplete="off"     
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '14px', background: COLORS.pureWhite }} 
          />
          <input 
            type="text" 
            placeholder="Nachname" 
            value={newNachname} 
            onChange={e => setNewNachname(e.target.value)} 
            autoCapitalize="words" 
            autoComplete="off" 
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '14px', background: COLORS.pureWhite }} 
          />
          <button type="submit" style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
        </form>

        {/* Live-Suchfeld */}
        <div style={{ marginBottom: '12px' }}>
          <input 
            type="text" 
            placeholder="🔍 Cadetten suchen..." 
            value={suchBegriff} 
            onChange={e => setSuchBegriff(e.target.value)} 
            autoComplete="off"
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: `1px solid ${COLORS.borderLight}`, 
              fontSize: '13px', 
              boxSizing: 'border-box',
              background: COLORS.pureWhite
            }} 
          />
        </div>

        {/* Filter-Leiste */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted }}>Filter:</span>
          <div style={{ display: 'flex', background: COLORS.borderLight, padding: '2px', borderRadius: '6px', width: '100%' }}>
            <button 
              type="button"
              onClick={() => setAusruestungsFilter('Alle')}
              style={{ 
                flex: 1, 
                padding: '6px 12px', 
                background: ausruestungsFilter === 'Alle' ? COLORS.pureWhite : 'transparent', 
                color: ausruestungsFilter === 'Alle' ? COLORS.primaryRed : COLORS.textDark,
                border: 'none', 
                borderRadius: '4px', 
                fontSize: '12px', 
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Alle ({cadetten.length})
            </button>
            <button 
              type="button"
              onClick={() => setAusruestungsFilter('Unvollständig')}
              style={{ 
                flex: 1, 
                padding: '6px 12px', 
                background: ausruestungsFilter === 'Unvollständig' ? COLORS.pureWhite : 'transparent', 
                color: ausruestungsFilter === 'Unvollständig' ? COLORS.primaryRed : COLORS.textDark,
                border: 'none', 
                borderRadius: '4px', 
                fontSize: '12px', 
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ⚠️ Unvollständig ({
                cadetten.filter(c => {
                  const ausgegeben = allAusgaben.filter(a => a.cadetten_id === c.id).length;
                  return ausgegeben < getSollKategorienFuerCadett(c).length;
                }).length
              })
            </button>
          </div>
        </div>
      </div>

      {/* LISTEN-BEREICH */}
      <div style={{ padding: '2px' }}>
        {gefilterteCadetten.map(c => {
          const anzahlAusgegeben = allAusgaben.filter(a => a.cadetten_id === c.id).length;
          const sollAnzahl = getSollKategorienFuerCadett(c).length;
          const istVollstaendig = anzahlAusgegeben === sollAnzahl;
          
          return (
            <div 
              key={c.id} 
              onClick={() => setSelectedCadett(c)} 
              style={{ 
                background: COLORS.pureWhite, 
                padding: '14px', 
                borderRadius: '8px', 
                marginBottom: '10px', 
                cursor: 'pointer', 
                borderLeft: `4px solid ${COLORS.primaryRed}`, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
              }}
            >
              {/* Linker Bereich: Name, Gruppen & Zähler */}
<div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
  <strong style={{ fontSize: '15px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {c.vorname} {c.nachname}
  </strong>
  
  {/* NEU: Gruppen-Anzeige direkt in der Liste */}
  <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    Formation: <span style={{ fontStyle: c.gruppen ? 'normal' : 'italic', color: c.gruppen ? COLORS.textDark : COLORS.textMuted }}>
      {c.gruppen || 'Keine Gruppe'}
    </span>
  </div>

  <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '2px' }}>
    Ausrüstung: <span style={{ fontWeight: 'bold', color: istVollstaendig ? COLORS.statusGreen : COLORS.primaryRed }}>{`${anzahlAusgegeben} / ${sollAnzahl}`}</span>
  </div>
</div>
              
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '10px', background: c.dsgvo_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.dsgvo_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed, fontWeight: 'bold' }}>DSGVO</span>
                <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '10px', background: c.empfang_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.empfang_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed, fontWeight: 'bold' }}>Quittung</span>
              </div>
            </div>
          );
        })}

        {gefilterteCadetten.length === 0 && (
          <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '30px 10px', fontSize: '13px', fontStyle: 'italic' }}>
            Keine Cadetten gefunden oder Auswahl ist leer.
          </div>
        )}
      </div>
    </div>
  );
}