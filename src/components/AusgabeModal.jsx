import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants/config';

export default function AusgabeModal({
  showAusgabeModal,
  setShowAusgabeModal,
  activeKategorie,
  selectedTeilId,
  setSelectedTeilId,
  freieTeileFuerKategorie = [],
  handleAusgabeSpeichern
}) {
  // Lokaler State für den Ausgabetyp: 'inventar' (Lager), 'selbst' (Selbst beschafft), 'nicht_benoetigt'
  const [ausgabeTyp, setAusgabeTyp] = useState('inventar');

  // Reset beim Öffnen des Modals
  useEffect(() => {
    if (showAusgabeModal) {
      setAusgabeTyp('inventar');
      setSelectedTeilId(''); // ID-Auswahl zurücksetzen
    }
  }, [showAusgabeModal, setSelectedTeilId]);

  if (!showAusgabeModal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    let finaleTeilId = null;
    let istSelbst = false;
    let istNichtBenoetigt = false;

    if (ausgabeTyp === 'inventar') {
      finaleTeilId = selectedTeilId; // ID aus dem Dropdown
    } else if (ausgabeTyp === 'selbst') {
      istSelbst = true;
    } else if (ausgabeTyp === 'nicht_benoetigt') {
      istNichtBenoetigt = true;
    }

    // Übergibt die Parameter exakt so, wie deine App.js sie erwartet!
    handleAusgabeSpeichern(finaleTeilId, istSelbst, istNichtBenoetigt);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '15px'
    }}>
      <div style={{
        background: COLORS.pureWhite,
        borderRadius: '12px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          background: COLORS.primaryRed,
          color: COLORS.pureWhite,
          padding: '15px 20px',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          Ausrüstung ausgeben
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          
          <div style={{ marginBottom: '15px' }}>
            <span style={{ fontSize: '12px', color: COLORS.textMuted, display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>
              Kategorie:
            </span>
            <strong style={{ fontSize: '18px', color: COLORS.textDark }}>
              {activeKategorie}
            </strong>
          </div>

          {/* Auswahl-Buttons für den Bereitstellungs-Typ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted }}>
              Wie wird das Teil bereitgestellt?
            </span>
            
            <button
              type="button"
              onClick={() => setAusgabeTyp('inventar')}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `2px solid ${ausgabeTyp === 'inventar' ? COLORS.primaryRed : COLORS.borderLight}`,
                background: ausgabeTyp === 'inventar' ? '#FFF5F5' : COLORS.pureWhite,
                color: COLORS.textDark,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: ausgabeTyp === 'inventar' ? 'bold' : 'normal'
              }}
            >
              📦 Aus dem Vereinsbestand
            </button>

            <button
              type="button"
              onClick={() => setAusgabeTyp('selbst')}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `2px solid ${ausgabeTyp === 'selbst' ? COLORS.primaryRed : COLORS.borderLight}`,
                background: ausgabeTyp === 'selbst' ? '#FFF5F5' : COLORS.pureWhite,
                color: COLORS.textDark,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: ausgabeTyp === 'selbst' ? 'bold' : 'normal'
              }}
            >
              🛍️ Selbst beschafft
            </button>

            <button
              type="button"
              onClick={() => setAusgabeTyp('nicht_benoetigt')}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `2px solid ${ausgabeTyp === 'nicht_benoetigt' ? COLORS.primaryRed : COLORS.borderLight}`,
                background: ausgabeTyp === 'nicht_benoetigt' ? '#FFF5F5' : COLORS.pureWhite,
                color: COLORS.textDark,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: ausgabeTyp === 'nicht_benoetigt' ? 'bold' : 'normal'
              }}
            >
              ❌ Wird nicht benötigt
            </button>
          </div>

          {/* Dropdown für freie Teile (NUR sichtbar, wenn 'inventar' aktiv ist) */}
          {ausgabeTyp === 'inventar' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '6px' }}>
                Verfügbares Teil aus dem Lager auswählen:
              </label>
              <select
                value={selectedTeilId}
                onChange={e => setSelectedTeilId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.borderLight}`,
                  fontSize: '16px', // Verhindert iOS Auto-Zoom
                  background: COLORS.pureWhite,
                  boxSizing: 'border-box',
                  color: COLORS.textDark
                }}
              >
                <option value="">-- Bitte wählen --</option>
                {freieTeileFuerKategorie.map(teil => (
                  <option key={teil.id} value={teil.id}>
                    ID: {teil.id} {teil.groesse ? `(Größe: ${teil.groesse})` : ''}
                  </option>
                ))}
              </select>

              {freieTeileFuerKategorie.length === 0 && (
                <div style={{ color: COLORS.primaryRed, fontSize: '12px', marginTop: '8px', fontWeight: 'bold' }}>
                  ⚠️ Keine freien Teile in dieser Kategorie auf Lager!
                </div>
              )}
            </div>
          )}

          {/* Modal Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowAusgabeModal(false)}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                background: COLORS.pureWhite,
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: '6px',
                cursor: 'pointer',
                color: COLORS.textMuted
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={ausgabeTyp === 'inventar' && !selectedTeilId}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                background: (ausgabeTyp === 'inventar' && !selectedTeilId) ? COLORS.borderLight : COLORS.statusGreen,
                color: COLORS.pureWhite,
                border: 'none',
                borderRadius: '6px',
                cursor: (ausgabeTyp === 'inventar' && !selectedTeilId) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              Speichern
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}