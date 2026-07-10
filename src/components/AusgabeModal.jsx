import React from 'react';
import { COLORS } from '../constants/config';

export default function AusgabeModal({
  showAusgabeModal,
  setShowAusgabeModal,
  activeKategorie,
  selectedTeilId,
  setSelectedTeilId,
  freieTeileFuerKategorie,
  handleAusgabeSpeichern
}) {
  if (!showAusgabeModal) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
      <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '350px' }}>
        <h3 style={{ marginTop: 0, color: COLORS.primaryRed }}>{activeKategorie} ausgeben</h3>
        
        <select value={selectedTeilId} onChange={e => setSelectedTeilId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '18px', border: `1px solid ${COLORS.borderLight}` }}>
          <option value="">-- Lagerstück wählen --</option>
          {freieTeileFuerKategorie.map(i => (
            <option key={i.id} value={i.id}>ID: {i.id} {i.groesse ? `(Gr. ${i.groesse})` : ''}</option>
          ))}
        </select>
        
        <button 
          onClick={() => handleAusgabeSpeichern(activeKategorie, 'lager')} 
          disabled={!selectedTeilId} 
          style={{ width: '100%', padding: '11px', background: selectedTeilId ? COLORS.primaryRed : COLORS.textMuted, color: COLORS.pureWhite, border: 'none', borderRadius: '6px', marginBottom: '8px', fontWeight: 'bold', cursor: selectedTeilId ? 'pointer' : 'not-allowed' }}
        >
          Aus Lager zuweisen
        </button>
        
        <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'selbst')} style={{ width: '100%', padding: '11px', background: COLORS.pureWhite, color: COLORS.statusGreen, border: `1px solid ${COLORS.statusGreen}`, borderRadius: '6px', marginBottom: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          "Selbst beschafft"
        </button>
        
        <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'nicht_benoetigt')} style={{ width: '100%', padding: '11px', background: COLORS.appBackground, color: COLORS.textDark, border: 'none', borderRadius: '6px', marginBottom: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
          Wird nicht benötigt
        </button>
        
        <button onClick={() => setShowAusgabeModal(false)} style={{ width: '100%', padding: '10px', background: COLORS.pureWhite, color: COLORS.textMuted, border: `1px solid ${COLORS.borderLight}`, borderRadius: '6px', cursor: 'pointer' }}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}