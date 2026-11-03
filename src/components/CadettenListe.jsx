import React, { useState, useMemo } from 'react';
import { COLORS, getSollKategorienFuerCadett } from '../constants/config';

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
  const [formationsFilter, setFormationsFilter] = useState('Alle');
  const [suchBegriff, setSuchBegriff] = useState('');

  // 1. PERFORMANCE-OPTIMIERUNG: Zähler für unvollständige Ausrüstung
  const unvollstaendigAnzahl = useMemo(() => {
    return cadetten.filter(c => {
      const ausgegeben = allAusgaben.filter(a => a.cadetten_id === c.id).length;
      return ausgegeben < getSollKategorienFuerCadett(c).length;
    }).length;
  }, [cadetten, allAusgaben]);

  // 2. NEU: Dynamische Zähler für die einzelnen Gruppen berechnen
  // Berücksichtigt auch Mehrfacheinträge (z.B. "Pänz, Cadetten")
  const gruppenZaehler = useMemo(() => {
    let floehe = 0;
    let paenz = 0;
    let cadettenAnzahl = 0;

    cadetten.forEach(c => {
      const gruppenText = (c.gruppen || '').toLowerCase();
      if (gruppenText.includes('flöhe')) floehe++;
      if (gruppenText.includes('pänz')) paenz++;
      if (gruppenText.includes('cadetten')) cadettenAnzahl++;
    });

    return { floehe, paenz, cadettenAnzahl };
  }, [cadetten]);

  // 3. COMBINED FILTERING & SORTIERUNG (NACH VORNAME)
  const gefilterteCadetten = useMemo(() => {
    const suche = suchBegriff.toLowerCase().trim();

    return cadetten
      .filter(c => {
        // A. Live-Textsuche
        const matchSuche = 
          c.vorname.toLowerCase().includes(suche) ||
          c.nachname.toLowerCase().includes(suche);
        if (!matchSuche) return false;

        // B. Ausrüstungs-Filter
        if (ausruestungsFilter === 'Unvollständig') {
          const anzahlAusgegeben = allAusgaben.filter(a => a.cadetten_id === c.id).length;
          const sollAnzahl = getSollKategorienFuerCadett(c).length;
          if (anzahlAusgegeben >= sollAnzahl) return false;
        }

        // C. Formations-Filter (Unterstützt Mehrfachgruppen wie "Pänz, Cadetten")
        if (formationsFilter !== 'Alle') {
          const gruppenEintrag = (c.gruppen || '').toLowerCase();
          const suchGruppe = formationsFilter.toLowerCase();
          
          if (!gruppenEintrag.includes(suchGruppe)) {
            return false;
          }
        }

        return true;
      })
      // Alphabetisch nach Vornamen sortieren
      .sort((a, b) => a.vorname.localeCompare(b.vorname, 'de'));
  }, [cadetten, allAusgaben, suchBegriff, ausruestungsFilter, formationsFilter]);

  // Hilfsfunktion zum Aktivieren/Abwählen einer Formation
  function handleFormationClick(formation) {
    if (formationsFilter === formation) {
      // Wenn bereits aktiv -> abwählen (zurück auf Alle)
      setFormationsFilter('Alle');
    } else {
      // Ansonsten neue Formation aktivieren
      setFormationsFilter(formation);
    }
  }

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

        {/* Live-Suchfeld - Wichtig: fontSize 16px verhindert iOS-Auto-Zoom */}
        <div style={{ marginBottom: '12px' }}>
          <input 
            type="text" 
            placeholder="🔍 Cadetten suchen..." 
            value={suchBegriff} 
            onChange={e => setSuchBegriff(e.target.value)} 
            autoComplete="off"
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              borderRadius: '6px', 
              border: `1px solid ${COLORS.borderLight}`, 
              fontSize: '16px', 
              boxSizing: 'border-box',
              background: COLORS.pureWhite
            }} 
          />
        </div>

        {/* Filter-Leiste */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Reihe 1: Ausrüstungs-Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, width: '75px', flexShrink: 0 }}>Ausrüstung:</span>
            <div style={{ display: 'flex', background: COLORS.borderLight, padding: '2px', borderRadius: '6px', width: '100%' }}>
              <button 
                type="button"
                onClick={() => setAusruestungsFilter('Alle')}
                style={{ 
                  flex: 1, 
                  padding: '6px 4px', 
                  background: ausruestungsFilter === 'Alle' ? COLORS.pureWhite : 'transparent', 
                  color: ausruestungsFilter === 'Alle' ? COLORS.primaryRed : COLORS.textDark,
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
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
                  padding: '6px 4px', 
                  background: ausruestungsFilter === 'Unvollständig' ? COLORS.pureWhite : 'transparent', 
                  color: ausruestungsFilter === 'Unvollständig' ? COLORS.primaryRed : COLORS.textDark,
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ⚠️ Offen ({unvollstaendigAnzahl})
              </button>
            </div>
          </div>

          {/* Reihe 2: Klickbare Formations-Buttons mit Live-Zahlen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, width: '75px', flexShrink: 0 }}>Gruppe:</span>
            <div style={{ display: 'flex', background: COLORS.borderLight, padding: '2px', borderRadius: '6px', width: '100%', gap: '2px' }}>
              
              {/* Button: Alle */}
              <button 
                type="button"
                onClick={() => setFormationsFilter('Alle')}
                style={{ 
                  flex: 1, 
                  padding: '6px 2px', 
                  background: formationsFilter === 'Alle' ? COLORS.pureWhite : 'transparent', 
                  color: formationsFilter === 'Alle' ? COLORS.primaryRed : COLORS.textDark,
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Alle ({cadetten.length})
              </button>

              {/* Button: Flöhe */}
              <button 
                type="button"
                onClick={() => handleFormationClick('Flöhe')}
                style={{ 
                  flex: 1, 
                  padding: '6px 2px', 
                  background: formationsFilter === 'Flöhe' ? COLORS.pureWhite : 'transparent', 
                  color: formationsFilter === 'Flöhe' ? COLORS.primaryRed : COLORS.textDark,
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Flöhe ({gruppenZaehler.floehe})
              </button>

              {/* Button: Pänz */}
              <button 
                type="button"
                onClick={() => handleFormationClick('Pänz')}
                style={{ 
                  flex: 1, 
                  padding: '6px 2px', 
                  background: formationsFilter === 'Pänz' ? COLORS.pureWhite : 'transparent', 
                  color: formationsFilter === 'Pänz' ? COLORS.primaryRed : COLORS.textDark,
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Pänz ({gruppenZaehler.paenz})
              </button>

              {/* Button: Cadetten */}
              <button 
                type="button"
                onClick={() => handleFormationClick('Cadetten')}
                style={{ 
                  flex: 1, 
                  padding: '6px 2px', 
                  background: formationsFilter === 'Cadetten' ? COLORS.pureWhite : 'transparent', 
                  color: formationsFilter === 'Cadetten' ? COLORS.primaryRed : COLORS.textDark,
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cadetten ({gruppenZaehler.cadettenAnzahl})
              </button>

            </div>
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
                borderLeft: `4px solid ${istVollstaendig ? COLORS.statusGreen : COLORS.primaryRed}`, 
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
                
                {/* Gruppen-Anzeige */}
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
            Keine Cadetten mit den gewählten Filtern gefunden.
          </div>
        )}
      </div>
    </div>
  );
}