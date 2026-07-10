import React from 'react';
import { COLORS, SOLL_KATEGORIEN } from '../constants/config';

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
  generateAndSharePDF
}) {
  const istVollstaendigBestaetigt = selectedCadett?.dsgvo_bestaetigt && selectedCadett?.empfang_bestaetigt;

  return (
    <div style={{ background: COLORS.pureWhite, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      
      {/* REPARIERTER STICKY HEADER */}
      <div style={{ 
        position: '-webkit-sticky',
        position: 'sticky', 
        top: 0, 
        backgroundColor: COLORS.pureWhite, 
        borderBottom: `1px solid ${COLORS.borderLight}`, 
        padding: '15px 20px', 
        zIndex: 999, 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>← Übersicht</button>
          
          <div style={{ display: 'flex', gap: '5px', background: COLORS.appBackground, padding: '2px', borderRadius: '6px' }}>
            <button onClick={() => handleNavigateCadett(-1)} style={{ background: COLORS.pureWhite, border: `1px solid ${COLORS.borderLight}`, borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>◀</button>
            <button onClick={() => handleNavigateCadett(1)} style={{ background: COLORS.pureWhite, border: `1px solid ${COLORS.borderLight}`, borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>▶</button>
          </div>

          <button onClick={() => handleDeletetCadett(selectedCadett)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: '12px' }}>🗑️ Löschen</button>
        </div>
        
        {!isEditingName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: COLORS.primaryRed, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCadett.vorname} {selectedCadett.nachname}</h2>
            <button onClick={() => { setEditVorname(selectedCadett.vorname); setEditNachname(selectedCadett.nachname); setIsEditingName(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
          </div>
        ) : (
          <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '5px', background: COLORS.appBackground, borderRadius: '6px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" value={editVorname} onChange={e => setEditVorname(e.target.value)} style={{ flex: 1, padding: '5px', fontSize: '12px' }} />
              <input type="text" value={editNachname} onChange={e => setEditNachname(e.target.value)} style={{ flex: 1, padding: '5px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsEditingName(false)} style={{ padding: '2px 8px', fontSize: '11px' }}>Abbrechen</button>
              <button type="submit" style={{ padding: '2px 8px', fontSize: '11px', background: COLORS.statusGreen, color: COLORS.pureWhite, border: 'none', fontWeight: 'bold' }}>Speichern</button>
            </div>
          </form>
        )}
      </div>

      {/* INHALT */}
      <div style={{ padding: '20px' }}>
        {/* DSGVO & Quittung */}
        <div style={{ background: '#F7FAFC', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: `1px solid ${COLORS.borderLight}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', marginBottom: '10px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>1. Datenschutz (DSGVO)</span>
              <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Speicherung erlaubt</div>
            </div>
            <input type="checkbox" checked={selectedCadett.dsgvo_bestaetigt || false} onChange={() => toggleDSGVO(selectedCadett)} style={{ width: '22px', height: '22px', accentColor: COLORS.statusGreen }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>2. Übergabe-Quittung</span>
              <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Eltern digital bestätigt</div>
            </div>
            <input type="checkbox" checked={selectedCadett.empfang_bestaetigt || false} onChange={() => toggleEmpfang(selectedCadett)} style={{ width: '22px', height: '22px', accentColor: COLORS.statusGreen }} />
          </div>
        </div>

        {/* Notizen */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted }}>✍️ Interne Notizen:</label>
          <textarea 
            value={kommentarText} 
            onChange={e => { setKommentarText(e.target.value); setKommentarGespeichert(false); }} 
            placeholder="Besonderheiten..."
            style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '6px', border: `1px solid ${kommentarGespeichert ? COLORS.borderLight : COLORS.warningOrange}`, fontSize: '13px' }}
          />
          {!kommentarGespeichert && (
            <button onClick={handleSaveKommentar} style={{ alignSelf: 'flex-end', background: COLORS.warningOrange, color: COLORS.pureWhite, border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Notiz speichern</button>
          )}
        </div>

        {/* Kleiderliste */}
        <h3 style={{ fontSize: '13px', marginBottom: '10px', color: COLORS.textMuted }}>Soll-Ausstattung</h3>
        {SOLL_KATEGORIEN.map(kat => {
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
                  <button onClick={() => handleRueckgabe(geliehen.id, kat, geliehen.inventar_id)} style={{ background: '#FFF5F5', color: COLORS.primaryRed, border: `1px solid ${COLORS.primaryRed}`, padding: '5px 10px', borderRadius: '4px', fontSize: '11px' }}>
                    {geliehen.status_nicht_benoetigt || geliehen.selbst_beschafft ? 'Ändern' : 'Rückgabe'}
                  </button>
                ) : (
                  <button onClick={() => { setActiveKategorie(kat); setShowAusgabeModal(true); }} style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px' }}>Ausgeben</button>
                )}
              </div>
            </div>
          );
        })}
        
        <button onClick={() => generateAndSharePDF(selectedCadett, ausgaben)} style={{ width: '100%', marginTop: '25px', background: istVollstaendigBestaetigt ? COLORS.textDark : COLORS.warningOrange, color: COLORS.pureWhite, border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold' }}>
          <span>{istVollstaendigBestaetigt ? '🟢 Beleg via WhatsApp senden' : '⚠️ Beleg senden (Haken fehlen!)'}</span>
        </button>
      </div>
    </div>
  );
}