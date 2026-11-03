/**
 * Globale Kategorien für alle theoretisch existierenden Ausrüstungsteile.
 * Wichtig: Hier muss die Schreibweise exakt mit der Datenbank und der Wunsch-Reihenfolge übereinstimmen!
 */
export const SOLL_KATEGORIEN = [
  'Hut', 
  'Barett', // Korrigiert von 'Barret' auf 'Barett'
  'Uniformjacke', 
  'Schulterstücke', 
  'Koppel', 
  'Mantel', 
  'Rock', 
  'Stiefel'
];

/**
 * Liste der autorisierten Betreuer, die Aktionen in der App durchführen dürfen.
 */
export const BETREUER_LISTE = ['Anja', 'Claudia', 'Ronny', 'Simone', 'Tina']; 

/**
 * Zentrales Farb-Schema für das Design der App (Corporate Identity).
 */
export const COLORS = {
  primaryRed: '#C41230',        // Hauptfarbe der Ehrengarde
  primaryRedHover: '#A00F26',   // Hover-Effekt für rote Buttons
  softRedBg: '#FDF2F4',         // Sanfter roter Hintergrund für Badges/Meldungen
  pureWhite: '#FFFFFF',         // Kontrastweiß
  appBackground: '#F7FAFC',     // Heller, augenfreundlicher Seitenhintergrund
  textDark: '#1A202C',          // Gut lesbarer, dunkler Text (nahezu Schwarz)
  textMuted: '#718096',         // Dezenter Grauton für sekundäre Texte
  borderLight: '#E2E8F0',       // Rahmen und Trennlinien
  statusGreen: '#319795',       // Erfolg / Vollständig / DSGVO erteilt
  statusGreenBg: '#E6FFFA',     // Hintergrund für grüne Badges
  warningOrange: '#DD6B20',     // Warnungen / Unvollständige Quittungen
  warningOrangeBg: '#FFFAF0'    // Hintergrund für orangefarbene Badges
};

/**
 * Berechnet die exakte Soll-Ausrüstungsliste für einen Cadetten
 * basierend auf Geschlecht und zugeordneten Gruppen (Formationen)
 * und sortiert diese nach einer fest vorgegebenen Wunsch-Reihenfolge.
 * * @param {Object} cadett - Das Cadetten-Objekt aus der Datenbank
 * @returns {Array<string>} - Array der benötigten Ausrüstungskategorien in korrekter Sortierung
 */
export function getSollKategorienFuerCadett(cadett) {
  if (!cadett) return [];

  // --- 1. DIE GEWÜNSCHTE ANZEIGE-REIHENFOLGE ---
  // Diese Reihenfolge bestimmt, wie die Teile im UI und auf dem PDF-Beleg sortiert werden.
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

  // --- 2. BASIS-AUSRÜSTUNG (Für jeden Cadetten identisch) ---
  let benoetigteTeile = ['Uniformjacke', 'Schulterstücke', 'Mantel', 'Stiefel'];

  // --- 3. GESCHLECHTSSPEZIFISCHE TEILE ---
  if (cadett.geschlecht === 'w') {
    // Mädchen erhalten zusätzlich Hut, Barett und Rock
    benoetigteTeile.push('Hut', 'Barett', 'Rock');
  } else {
    // Jungs erhalten standardmäßig nur den Hut als Kopfbedeckung
    benoetigteTeile.push('Hut');
  }

  // --- 4. KOPPEL-LOGIK ---
  // Nur Mitglieder der 'Pänz' oder 'Cadetten' benötigen eine Koppel.
  // Das Feld 'gruppen' in der DB ist ein kommagetrennter String.
  const gruppenArray = cadett.gruppen 
    ? cadett.gruppen.split(',').map(g => g.trim()).filter(Boolean) 
    : [];
    
  if (gruppenArray.includes('Pänz') || gruppenArray.includes('Cadetten')) {
    benoetigteTeile.push('Koppel');
  }

  // --- 5. SORTIERUNG & FILTERUNG ---
  // Wir filtern die globale Wunsch-Reihenfolge, sodass nur die Teile übrig bleiben,
  // die der Cadett laut obigen Regeln tatsächlich benötigt.
  return WUNSCH_REIHENFOLGE.filter(teil => benoetigteTeile.includes(teil));
}