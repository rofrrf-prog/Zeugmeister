import React from 'react';
import { COLORS } from '../constants/config';

export default function ProtokollTab({ logs }) {
  return (
    <div>
      <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>📋 Revisionsprotokoll</h3>
      <div style={{ maxHeight: '73vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px' }}>
        {logs.map(log => (
          <div key={log.id} style={{ padding: '8px 5px', borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: COLORS.primaryRed }}>{log.betreuer}</span>
              <span style={{ fontSize: '10px', color: COLORS.textMuted }}>{new Date(log.created_at).toLocaleString('de-DE')}</span>
            </div>
            <div style={{ fontWeight: '600' }}>{log.aktion}</div>
            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>{log.details}</div>
          </div>
        ))}
      </div>
    </div>
  );
}