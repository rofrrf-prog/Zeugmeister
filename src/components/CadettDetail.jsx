import React from 'react';
import { COLORS } from '../constants/config';
import { getSollKategorienFuerCadett } from '../constants/config'; // Pfad anpassen, falls nötig

const VERFUEGBARE_GRUPPEN = ['Flöhe', 'Pänz', 'Cadetten'];

export default function CadettDetail({ 
  selectedCadett, 
  setSelectedCadett, 
  handleNavigateCadett, 
  handleDeletetCadett,
  isEditingName,
  setIsEditingName,
  editVorname,
  setEditVorname,
  editNachname,
  setEditNachname,
  handleUpdateName,
  toggleDSGVO,
  toggleEmpfang,
  kommentarText,
  setKommentarText,
  kommentarGespeichert,
  setKommentarGespeichert,
  handleSaveKommentar,
  ausgaben,
  handleRueckgabe,
  setActiveKategorie,
  setShowAusgabeModal,
  generateAndSharePDF,
  onUpdateCadettField
}) {
  const istVollstaendigBestaetigt = selectedCadett?.dsgvo_bestaetigt && selectedCadett?.empfang_bestaetigt;

  // Berechne die dynamische Soll-Liste für DIESEN Cadetten
  const individuelleSollKategorien = getSollKategorienFuerCadett(selectedCadett);

  // Hilfsfunktion: Gruppen-Array aus dem Datenbank-String erzeugen
  const aktuelleGruppen = selectedCadett?.gruppen
    ? selectedCadett.gruppen.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  // Toggle-Logik für Doppel-Gruppenmitgliedschaften
  function handleGruppeToggle(gruppe) {
    let neueGruppen;
    if (aktuelleGruppen.includes(gruppe)) {
      neueGruppen = aktuelleGruppen.filter(g => g !== gruppe);
    } else {
      neueGruppen = [...aktuelleGruppen, gruppe];
    }
    const gruppenString = neueGruppen.join(', ');
    onUpdateCadettField(selectedCadett.id, 'gruppen', gruppenString);
  }

  return (
    <div style={{ background: COLORS.pureWhite, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      
      {/* FIXED/STICKY HEADER-BEREICH */}
      <div style={{ 
        position: '-webkit-sticky',
        position: 'sticky', 
        top: '-15px', 
        backgroundColor: COLORS.pureWhite, 
        borderBottom: `2px solid ${COLORS.primaryRed}`, 
        padding: '15px 20px', 
        zIndex: 99, 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>← Übersicht</button>
          
          <div style={{ display: 'flex', gap: '5px', background: COLORS.appBackground, padding: '2px', borderRadius: '6px' }}>
            <button onClick={() => handleNavigateCadett(-1)} style={{ background: COLORS.pureWhite, border: `1px solid ${COLORS.borderLight}`, borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>◀</button>
            <button onClick={() => handleNavigateCadett(1)} style={{ background: COLORS.pureWhite, border: `1px solid ${COLORS.borderLight}`, borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>▶</button>
          </div>

          <button onClick={() => handleDeletetCadett(selectedCadett)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: '12px' }}>🗑️ Löschen</button>
        </div>
        
        {!isEditingName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: COLORS.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedCadett.vorname} {selectedCadett.nachname}
            </h2>
            <button onClick={() => { setEditVorname(selectedCadett.vorname); setEditNachname(selectedCadett.nachname); setIsEditingName(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
          </div>
        ) : (
          <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '5px', background: COLORS.appBackground, borderRadius: '6px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" value={editVorname} onChange={e => setEditVorname(e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '13px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }} />
              <input type="text" value={editNachname} onChange={e => setEditNachname(e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '13px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsEditingName(false)} style={{ padding: '4px 10px', fontSize: '11px', background: COLORS.pureWhite, border: `1px solid ${COLORS.borderLight}`, borderRadius: '4px', cursor: 'pointer' }}>Abbrechen</button>
              <button type="submit" style={{ padding: '4px 10px', fontSize: '11px', background: COLORS.statusGreen, color: COLORS.pureWhite, border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Speichern</button>
            </div>
          </form>
        )}
      </div>

      {/* INHALT */}
      <div style={{ padding: '20px' }}>
        
        {/* ULTRAKOMPAKTE STAMMDATEN (Keine Checkboxen, keine Radios) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          background: COLORS.appBackground, 
          padding: '10px 12px', 
          borderRadius: '8px', 
          marginBottom: '15px', 
          border: `1px solid ${COLORS.borderLight}`,
          fontSize: '13px'
        }}>
          {/* Reihe 1: Geschlecht als Pill-Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold', color: COLORS.textMuted, fontSize: '12px' }}>Geschlecht:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => onUpdateCadettField(selectedCadett.id, 'geschlecht', 'w')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${selectedCadett.geschlecht === 'w' ? COLORS.primaryRed : COLORS.borderLight}`,
                  background: selectedCadett.geschlecht === 'w' ? COLORS.primaryRed : COLORS.pureWhite,
                  color: selectedCadett.geschlecht === 'w' ? COLORS.pureWhite : COLORS.textDark,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Mädchen
              </button>
              <button
                type="button"
                onClick={() => onUpdateCadettField(selectedCadett.id, 'geschlecht', 'm')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${selectedCadett.geschlecht === 'm' ? COLORS.primaryRed : COLORS.borderLight}`,
                  background: selectedCadett.geschlecht === 'm' ? COLORS.primaryRed : COLORS.pureWhite,
                  color: selectedCadett.geschlecht === 'm' ? COLORS.pureWhite : COLORS.textDark,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Junge
              </button>
            </div>
          </div>

          {/* Reihe 2: Gruppen als kompakte Auswahl-Chips */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: '8px', marginTop: '2px' }}>
            <span style={{ fontWeight: 'bold', color: COLORS.textMuted, fontSize: '12px' }}>Gruppen:</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {VERFUEGBARE_GRUPPEN.map(gruppe => {
                const istAktiv = aktuelleGruppen.includes(gruppe);
                return (
                  <button
                    key={gruppe}
                    type="button"
                    onClick={() => handleGruppeToggle(gruppe)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: `1px solid ${istAktiv ? COLORS.textDark : COLORS.borderLight}`,
                      background: istAktiv ? COLORS.textDark : COLORS.pureWhite,
                      color: istAktiv ? COLORS.pureWhite : COLORS.textDark,
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {gruppe}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status-Karten */}
        <div style={{ background: COLORS.appBackground, padding: '12px', borderRadius: '8px', marginBottom: '15px', border: `1px solid ${COLORS.borderLight}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', marginBottom: '10px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>1. Datenschutz (DSGVO)</span>
              <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Speicherung erlaubt</div>
            </div>
            <input type="checkbox" checked={selectedCadett.dsgvo_bestaetigt || false} onChange={() => toggleDSGVO(selectedCadett)} style={{ width: '22px', height: '22px', accentColor: COLORS.statusGreen, cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>2. Übergabe-Quittung</span>
              <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Eltern digital bestätigt</div>
            </div>
            <input type="checkbox" checked={selectedCadett.empfang_bestaetigt || false} onChange={() => toggleEmpfang(selectedCadett)} style={{ width: '22px', height: '22px', accentColor: COLORS.statusGreen, cursor: 'pointer' }} />
          </div>
        </div>

        {/* Notizen */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted }}>✍️ Interne Notizen / Änderungen:</label>
          <textarea 
            value={kommentarText} 
            onChange={e => { setKommentarText(e.target.value); setKommentarGespeichert(false); }} 
            placeholder="Besonderheiten eintragen (z.B. Hose gekürzt)..."
            style={{ width: '100%', minHeight: '70px', padding: '8px', borderRadius: '6px', border: `1px solid ${kommentarGespeichert ? COLORS.borderLight : COLORS.warningOrange}`, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
          />
          {!kommentarGespeichert && (
            <button onClick={handleSaveKommentar} style={{ alignSelf: 'flex-end', background: COLORS.warningOrange, color: COLORS.pureWhite, border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Notiz speichern</button>
          )}
        </div>

        {/* Dynamische Kleiderliste (Soll-Ausstattung) */}
        <h3 style={{ fontSize: '12px', marginBottom: '10px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Soll-Ausstattung</h3>
        {individuelleSollKategorien.map(kat => {
          const geliehen = ausgaben.find(a => a.kategorie_soll === kat);
          return (
            <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${COLORS.borderLight}` }}>
              <div>
                <span style={{ marginRight: '10px' }}>{geliehen ? '🔴' : '⚪'}</span>
                <strong style={{ fontSize: '14px' }}>{kat}</strong>
                {geliehen && !geliehen.selbst_beschafft && !geliehen.status_nicht_benoetigt && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px' }}>[ID: {geliehen.inventar_id}]</span>}
                {geliehen?.status_nicht_benoetigt && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px', fontStyle: 'italic' }}>(Nicht benötigt)</span>}
                {geliehen?.selbst_beschafft && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px', fontStyle: 'italic' }}>(Selbst beschafft)</span>}
              </div>
              <div>
                {geliehen ? (
                  <button onClick={() => handleRueckgabe(geliehen.id, kat)} style={{ background: '#FFF5F5', color: COLORS.primaryRed, border: `1px solid ${COLORS.primaryRed}`, padding: '5px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                    {geliehen.status_nicht_benoetigt || geliehen.selbst_beschafft ? 'Ändern' : 'Rückgabe'}
                  </button>
                ) : (
                  <button onClick={() => { setActiveKategorie(kat); setShowAusgabeModal(true); }} style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Ausgeben</button>
                )}
              </div>
            </div>
          );
        })}
        
        {/* PDF / WhatsApp Button */}
        <button onClick={() => generateAndSharePDF(selectedCadett, ausgaben)} style={{ width: '100%', marginTop: '25px', background: istVollstaendigBestaetigt ? COLORS.textDark : COLORS.warningOrange, color: COLORS.pureWhite, border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
          <span>{istVollstaendigBestaetigt ? '🟢 Beleg via WhatsApp senden' : '⚠️ Beleg senden (Haken fehlen!)'}</span>
        </button>
      </div>
    </div>
  );
}