import React from 'react';
import { COLORS } from '../constants/config';

export default function ProtokollTab({ logs }) {
  
  // Hilfsfunktion zur Formatierung des PostgreSQL-Zeitstempels
  function formatiereDatum(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  }

  // Hilfsfunktion für farbliche Akzente je nach Log-Typ
  function getLogFarbe(aktion) {
    const a = aktion?.toLowerCase() || '';
    if (a.includes('gelöscht') || a.includes('entfernt')) return COLORS.primaryRed;
    if (a.includes('ausgegeben') || a.includes('angelegt')) return COLORS.statusGreen;
    if (a.includes('geändert') || a.includes('status')) return COLORS.warningOrange;
    return COLORS.textDark;
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px', margin: '0 0 15px 0' }}>
        Aktivitätsprotokoll
      </h3>

      <div style={{ maxHeight: '70vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        {logs.map((log) => (
          <div key={log.id} style={{ padding: '10px 5px', borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            
            {/* Kopfzeile des Log-Eintrags: Aktion und Betreuer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', color: getLogFarbe(log.aktion) }}>
                {log.aktion}
              </span>
              <span style={{ fontSize: '11px', color: COLORS.textMuted, background: COLORS.appBackground, padding: '2px 6px', borderRadius: '4px' }}>
                👤 {log.betreuer || 'System'}
              </span>
            </div>

            {/* Log-Details */}
            {log.details && (
              <div style={{ color: COLORS.textDark, fontSize: '12px', marginTop: '2px', lineHeight: '1.4' }}>
                {log.details}
              </div>
            )}

            {/* Zeitstempel */}
            <div style={{ fontSize: '10px', color: COLORS.textMuted, textAlign: 'right', marginTop: '2px' }}>
              🕒 {formatiereDatum(log.created_at)}
            </div>
          </div>
        ))}

        {/* Fallback falls das Protokoll leer ist */}
        {logs.length === 0 && (
          <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '30px', fontSize: '12px', fontStyle: 'italic' }}>
            Noch keine Log-Einträge in audit_log vorhanden.
          </div>
        )}
      </div>
    </div>
  );
}