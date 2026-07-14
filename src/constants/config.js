export const SOLL_KATEGORIEN = ['Hut', 'Barret', 'Uniformjacke', 'Schulterstücke', 'Koppel', 'Mantel', 'Rock', 'Stiefel'];
export const BETREUER_LISTE = ['Anja', 'Claudia', 'Ronny', 'Simone', 'Tina']; 

export const COLORS = {
  primaryRed: '#C41230',        
  primaryRedHover: '#A00F26',   
  softRedBg: '#FDF2F4',         
  pureWhite: '#FFFFFF',         
  appBackground: '#F7FAFC',     
  textDark: '#1A202C',          
  textMuted: '#718096',         
  borderLight: '#E2E8F0',       
  statusGreen: '#319795',       
  statusGreenBg: '#E6FFFA',     
  warningOrange: '#DD6B20',     
  warningOrangeBg: '#FFFAF0'    
};

/**
 * Berechnet die exakte Soll-Ausrüstungsliste für einen Cadetten
 * und sortiert sie nach einer fest vorgegebenen Wunsch-Reihenfolge.
 */
export function getSollKategorienFuerCadett(cadett) {
  if (!cadett) return [];

  // --- 1. DEINE WUNSCH-REIHENFOLGE ---
  // Ändere einfach die Sortierung in diesem Array, um die Anzeige in der App zu steuern!
  const WUNSCH_REIHENFOLGE = [
    'Hut',
    'Barett',
    'Uniformjacke',
    'Schulterstücke',
    'Koppel',
    'Mantel',
    'Rock',
    'Stiefel'
  ];

  // 2. Unsortierte Sammlung aller benötigten Gegenstände
  let benoetigteTeile = ['Uniformjacke', 'Schulterstücke', 'Mantel', 'Stiefel'];

  // Geschlechtsspezifische Teile hinzufügen
  if (cadett.geschlecht === 'w') {
    benoetigteTeile.push('Hut', 'Barett', 'Rock');
  } else {
    benoetigteTeile.push('Hut');
  }

  // Koppel-Logik (nur für Pänz oder Cadetten)
  const gruppenArray = cadett.gruppen 
    ? cadett.gruppen.split(',').map(g => g.trim()).filter(Boolean) 
    : [];
  if (gruppenArray.includes('Pänz') || gruppenArray.includes('Cadetten')) {
    benoetigteTeile.push('Koppel');
  }

  // --- 3. DIE SORTIERUNG ---
  // Wir filtern die Wunsch-Reihenfolge so, dass nur die Teile übrig bleiben,
  // die das Kind heute auch wirklich erhalten soll.
  return WUNSCH_REIHENFOLGE.filter(teil => benoetigteTeile.includes(teil));
}