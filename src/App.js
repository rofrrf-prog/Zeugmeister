import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Package, FileText, Check, X, Plus, Trash2, Download, History, User } from 'lucide-react';
import { jsPDF } from 'jspdf';

// --- SYSTEMKONFIGURATION ---
// Diese Kategorien MUSS jeder Cadett standardmäßig erhalten
const SOLL_KATEGORIEN = ['Barret', 'Koppel', 'Uniformjacke', 'Mantel', 'Rock'];
// Liste der Betreuer, die sich im System anmelden können
const BETREUER_LISTE = ['Anja', 'Claudia', 'Ronny', 'Simone', 'Tina']; 

// Einheitliche Farbpalette für die Benutzeroberfläche (Ehrengarde Bonn Style)
const COLORS = {
  primaryRed: '#C41230',        // Hauptfarbe für Buttons und Akzente
  primaryRedHover: '#A00F26',   // Hover-Effekt für rote Buttons
  softRedBg: '#FDF2F4',         // Sanfter roter Hintergrund für Fehlermeldungen/Hinweise
  pureWhite: '#FFFFFF',         // Reines Weiß für Karten und Modals
  appBackground: '#F7FAFC',     // Heller Grauton für den App-Hintergrund
  textDark: '#1A202C',          // Dunkles Anthrazit für beste Lesbarkeit von Texten
  textMuted: '#718096',         // Dezentes Grau für Beschreibungen und IDs
  borderLight: '#E2E8F0',       // Helle Trennlinien
  statusGreen: '#319795',       // Grün für erfolgreiche Bestätigungen (DSGVO/Quittung)
  statusGreenBg: '#E6FFFA',     // Sanfter grüner Hintergrund für Badges
  warningOrange: '#DD6B20',     // Orange für Warnungen (z.B. fehlende Haken beim PDF)
  warningOrangeBg: '#FFFAF0'    // Sanfter oranger Hintergrund
};

export default function App() {
  // --- STATE-MANAGEMENT (Zustandsverwaltung der App) ---
  const [view, setView] = useState('cadetten'); // Steuert die aktuelle Ansicht ('cadetten', 'inventar', 'logs')
  // Holt den aktiven Betreuer aus dem Speicher des Browsers, falls bereits angemeldet
  const [currentBetreuer, setCurrentBetreuer] = useState(localStorage.getItem('active_betreuer') || '');
  
  const [cadetten, setCadetten] = useState([]);         // Liste aller Kinder aus der Datenbank
  const [selectedCadett, setSelectedCadett] = useState(null); // Das aktuell ausgewählte Kind in der Detailansicht
  const [inventar, setInventar] = useState([]);         // Gesamter Lagerbestand an Kleidung
  const [allAusgaben, setAllAusgaben] = useState([]);   // Alle Ausgaben aller Kinder (für den Zähler in der Übersicht)
  const [ausgaben, setAusgaben] = useState([]);         // Die Ausgaben des *aktuell ausgewählten* Kindes
  const [logs, setLogs] = useState([]);                 // Die letzten Aktionen im System (Protokoll)
  
  const [showAusgabeModal, setShowAusgabeModal] = useState(false); // Steuert das Pop-up-Fenster für die Kleidervergabe
  const [activeKategorie, setActiveKategorie] = useState('');     // Merkt sich, für welches Teil das Modal geöffnet wurde
  const [selectedTeilId, setSelectedTeilId] = useState('');       // Die ausgewählte Lager-ID im Dropdown-Menü

  const [newVorname, setNewVorname] = useState('');     // Input-Feld für neuen Vornamen
  const [newNachname, setNewNachname] = useState('');   // Input-Feld für neuen Nachnamen

  // --- EFFECT-HOOKS (Automatisches Laden von Daten) ---
  // Sobald ein Betreuer angemeldet ist, werden alle Grunddaten aus Supabase geladen
  useEffect(() => {
    if (currentBetreuer) {
      fetchCadetten();
      fetchInventar();
      fetchAllAusgaben();
      fetchLogs();
    }
  }, [currentBetreuer]);

  // Sobald ein Kind ausgewählt wird, laden wir dessen spezifische Kleidungsstücke nach
  useEffect(() => {
    if (selectedCadett) {
      fetchAusgaben(selectedCadett.id);
    }
  }, [selectedCadett]);

  // --- REVISIONS-LOGGING (Protokollierung) ---
  // Schreibt jede Aktion (wer hat wann was gemacht) direkt in die 'audit_log'-Tabelle bei Supabase
  async function logAction(aktion, details) {
    await supabase.from('audit_log').insert([{
      betreuer: currentBetreuer,
      aktion: aktion,
      details: details
    }]);
    fetchLogs(); // Aktualisiert das Protokoll direkt in der Ansicht
  }

  // --- DATENBANK-ABFRAGEN (FETCH FUNCTIONS) ---
  // Holt alle Cadetten und sortiert sie alphabetisch nach Vorname
  async function fetchCadetten() {
    const { data } = await supabase.from('cadetten').select('*').order('vorname', { ascending: true });
    if (data) setCadetten(data);
  }

  // Holt den gesamten Lagerbestand
  async function fetchInventar() {
    const { data } = await supabase.from('inventar').select('*');
    if (data) setInventar(data);
  }

  // Holt global alle Ausgaben (wichtig für die "X / 5"-Anzeige in der Liste)
  async function fetchAllAusgaben() {
    const { data } = await supabase.from('ausgaben').select('*');
    if (data) setAllAusgaben(data);
  }

  // Holt die Kleidungsstücke für ein ganz bestimmtes Kind anhand der ID
  async function fetchAusgaben(cadettId) {
    const { data } = await supabase.from('ausgaben').select('*').eq('cadetten_id', cadettId);
    if (data) setAusgaben(data);
  }

  // Lädt die letzten 50 Aktionen für das Revisionsprotokoll (neueste zuerst)
  async function fetchLogs() {
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setLogs(data);
  }

  // --- BETREUER FUNKTIONEN ---
  // Setzt den Betreuer im State und speichert ihn dauerhaft im Browser (übersteht Seite neu laden)
  function handleBetreuerLogin(name) {
    localStorage.setItem('active_betreuer', name);
    setCurrentBetreuer(name);
  }

  // Erstellt ein neues Kind in der Datenbank (Startet standardmäßig mit 'false' bei den Rechten)
  async function handleAddCadett(e) {
    e.preventDefault(); // Verhindert, dass die Seite neu lädt
    if (!newVorname || !newNachname) return; // Abbrechen, falls Felder leer sind
    
    const { error } = await supabase.from('cadetten').insert([{ 
      vorname: newVorname, 
      nachname: newNachname, 
      dsgvo_bestaetigt: false, 
      empfang_bestaetigt: false 
    }]);

    if (!error) {
      logAction("Cadett angelegt", `Hat ${newVorname} ${newNachname} im Register hinzugefügt.`);
      setNewVorname('');
      setNewNachname('');
      fetchCadetten(); // Liste neu laden
    }
  }

  // --- RECHTLICHE BESTÄTIGUNGEN (DSGVO & QUITTUNG) ---
  // Schaltet den DSGVO-Status um. Verhindert versehentliches Löschen durch eine Sicherheitsabfrage.
  async function toggleDSGVO(cadett) {
    // Falls der Haken gesetzt ist und entfernt werden soll -> Warnung vorschalten!
    if (cadett.dsgvo_bestaetigt) {
      const sicheresEntfernen = window.confirm(`WARNUNG:\nDu entfernst gerade die Datenschutz-Genehmigung für ${cadett.vorname}.\nBist du sicher?`);
      if (!sicheresEntfernen) return; // Aktion abbrechen, falls der Nutzer "Abbrechen" klickt
    }

    const neuerStatus = !cadett.dsgvo_bestaetigt;
    const { error } = await supabase.from('cadetten').update({ dsgvo_bestaetigt: neuerStatus }).eq('id', cadett.id);
    if (!error) {
      logAction("DSGVO geändert", `Status für ${cadett.vorname} ${cadett.nachname} auf ${neuerStatus ? 'JA' : 'NEIN'} gesetzt.`);
      fetchCadetten(); // Benutzeroberfläche aktualisieren
      setSelectedCadett({ ...cadett, dsgvo_bestaetigt: neuerStatus }); // Detailansicht aktualisieren
    }
  }

  // Schaltet den Übergabe-Quittungs-Status um (Eltern haben den Erhalt bestätigt)
  async function toggleEmpfang(cadett) {
    if (cadett.empfang_bestaetigt) {
      const cancel = window.confirm("Möchtest du die Empfangsbestätigung wirklich zurücksetzen?");
      if (!cancel) return;
    }

    const neuerStatus = !cadett.empfang_bestaetigt;
    const { error } = await supabase.from('cadetten').update({ empfang_bestaetigt: neuerStatus }).eq('id', cadett.id);
    if (!error) {
      logAction(neuerStatus ? "Empfang quittiert" : "Empfang storniert", `Erziehungsberechtigte von ${cadett.vorname} ${cadett.nachname} haben den Erhalt digital bestätigt.`);
      fetchCadetten();
      setSelectedCadett({ ...cadett, empfang_bestaetigt: neuerStatus });
    }
  }

  // --- ABSOLUT SICHERES LÖSCHEN (DOPPELTE RÜCKFRAGE) ---
  // Löscht ein Kind komplett. Ein Trigger in der Datenbank setzt geliehene Stücke automatisch auf 'Frei'.
  async function handleDeletetCadett(cadett) {
    // 1. Sicherheitsstufe: Allgemeine Nachfrage
    const ersteAbfrage = window.confirm(`Kind löschen?\nMöchtest du ${cadett.vorname} ${cadett.nachname} wirklich aus dem System entfernen?`);
    if (!ersteAbfrage) return;

    // 2. Sicherheitsstufe: Explizite Warnung vor den Konsequenzen (Verhindert blindes Klicken)
    const zweiteAbfrage = window.confirm(`LETZTE WARNUNG:\nDadurch werden ALLE aktuellen Ausgaben gelöscht und die Kleidung (z.B. Jacken, Röcke) automatisch wieder auf 'Frei' ins Lager gebucht!\n\nDrücke OK zum unwiderruflichen Löschen.`);
    if (!zweiteAbfrage) return;

    // Zuerst die Verknüpfungen in der Ausgabetabelle löschen (schont die Datenbank)
    const { error: ausgabenError } = await supabase.from('ausgaben').delete().eq('cadetten_id', cadett.id);
    
    if (!ausgabenError) {
      // Danach das Kind aus dem Hauptregister löschen
      const { error: cadettError } = await supabase.from('cadetten').delete().eq('id', cadett.id);
      if (!cadettError) {
        logAction("Cadett gelöscht", `${cadett.vorname} ${cadett.nachname} wurde vollständig entfernt.`);
        setSelectedCadett(null); // Detailansicht schließen
        fetchCadetten(); // Listen neu laden
        fetchInventar();
        fetchAllAusgaben();
      }
    }
  }

  // --- AUSGABE & RÜCKGABE VON KLEIDUNG ---
  // Speichert die Zuweisung eines Kleidungsstücks (Lager, Selbst beschafft oder Nicht benötigt)
  async function handleAusgabeSpeichern(kategorie, typ) {
    if (typ === 'lager' && !selectedTeilId) return; // Validierung: Ohne ID kein Lagerteil buchbar

    const { error } = await supabase.from('ausgaben').insert([{
      cadetten_id: selectedCadett.id,
      inventar_id: typ === 'lager' ? selectedTeilId : null,
      kategorie_soll: kategorie,
      selbst_beschafft: typ === 'selbst',
      anmerkung_ausgabe: typ === 'nicht_benoetigt' ? 'Nicht benötigt' : null
    }]);

    if (!error) {
      let logDetail = `Zuweisung für ${selectedCadett.vorname}: ${kategorie}`;
      if (typ === 'lager') logDetail += ` (Lager-ID: ${selectedTeilId})`;
      
      logAction("Teil ausgegeben", logDetail);
      setShowAusgabeModal(false); // Modal schließen
      setSelectedTeilId('');     // ID-Auswahl zurücksetzen
      fetchAusgaben(selectedCadett.id); // Daten neu laden
      fetchInventar();
      fetchAllAusgaben();
    }
  }

  // Nimmt ein Kleidungsstück zurück und löscht den Ausgabeeintrag (Lagerstatus springt per DB-Trigger zurück auf 'Frei')
  async function handleRueckgabe(ausgabeId, kategorie, inventarId) {
    const bestaetigung = window.confirm(`Möchtest du das Teil für "${kategorie}" wirklich als zurückgegeben markieren?`);
    if (!bestaetigung) return;

    const { error } = await supabase.from('ausgaben').delete().eq('id', ausgabeId);
    if (!error) {
      logAction("Teil zurückgegeben", `Rückgabe von ${selectedCadett.vorname}: ${kategorie}`);
      fetchAusgaben(selectedCadett.id);
      fetchInventar();
      fetchAllAusgaben();
    }
  }

  // --- PDF GENERIERUNG (Beleg für die Eltern) ---
  // Erzeugt ein strukturiertes Dokument im Corporate Design und öffnet es in einem neuen Tab
  function generatePDF(cadett, aktuelleAusgaben) {
    const doc = new jsPDF();
    
    // Roter Design-Balken oben (Ehrengarde Bonn)
    doc.setFillColor(196, 18, 48); 
    doc.rect(20, 15, 170, 3, 'F');
    
    // Dokument-Header
    doc.setFont("Helvetica", "bold"); doc.setFontSize(22); doc.text("Beleg: Uniformen-Ausgabe", 20, 30);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Cadett: ${cadett.vorname} ${cadett.nachname}`, 20, 45);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 52);
    doc.setLineWidth(0.5); doc.line(20, 58, 190, 58); // Trennlinie
    
    // Auflistung der Kleidungsstücke
    doc.setFont("Helvetica", "bold"); doc.text("Aktueller Ausstattungs-Status:", 20, 68);
    doc.setFont("Helvetica", "normal"); let yPos = 78; // Startposition für die Schleife
    
    SOLL_KATEGORIEN.forEach((kat) => {
      const geliehen = aktuelleAusgaben.find(a => a.kategorie_soll === kat);
      if (geliehen) {
        if (geliehen.anmerkung_ausgabe === 'Nicht benötigt') doc.text(`[-] ${kat}: Wird nicht benötigt`, 25, yPos);
        else if (geliehen.selbst_beschafft) doc.text(`[X] ${kat}: Selbst beschafft (Eigentum)`, 25, yPos);
        else {
          const info = inventar.find(i => i.id === geliehen.inventar_id);
          doc.text(`[X] ${kat}: Vereinslager ID: ${geliehen.inventar_id}${info?.groesse ? ` (Größe: ${info.groesse})` : ''}`, 25, yPos);
        }
      } else doc.text(`[ ] ${kat}: Offen / Noch nicht ausgegeben`, 25, yPos);
      yPos += 9; // Abstand zur nächsten Zeile
    });
    
    // Rechtlicher Infotext & Mietvereinbarung
    yPos += 8; doc.setFont("Helvetica", "bold"); doc.text("Rechtliche Einverständniserklärung & Miete:", 20, yPos);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(9);
    const rechtstext = "Die Uniformen-Miete beträgt pauschal 150,00 € pro Saison. Die Datenhaltung wurde elektronisch bewilligt.";
    doc.text(doc.splitTextToSize(rechtstext, 170), 20, yPos + 6);
    
    // Revisionssichere Statusanzeige direkt auf dem PDF integriert
    doc.setFontSize(10); 
    doc.text(`🔒 Datenschutz (DSGVO): ${cadett.dsgvo_bestaetigt ? 'ERTEILT (Digital hinterlegt)' : 'OFFEN / AUSSTEHEND'}`, 20, yPos + 25);
    doc.text(`✍️ Übergabe-Quittung Eltern: ${cadett.empfang_bestaetigt ? 'BESTÄTIGT (Vor Ort digital autorisiert)' : 'OFFEN / AUSSTEHEND'}`, 20, yPos + 32);
    
    logAction("PDF generiert", `Beleg-PDF für ${cadett.vorname} ${cadett.nachname} aufgerufen.`);
    doc.output('dataurlnewwindow'); // Öffnet das fertige PDF im Browser-Druckfenster
  }

  // Hilfsfunktion: Berechnet, wie viele der 5 Teile ein Kind bereits zugewiesen bekommen hat
  function getAusstattungsStatus(cadettId) {
    return `${allAusgaben.filter(a => a.cadetten_id === cadettId).length} / ${SOLL_KATEGORIEN.length}`;
  }

  // --- ANSICHT: LOCK-SCREEN (Falls kein Betreuer eingeloggt ist) ---
  if (!currentBetreuer) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: '40px 20px', maxWidth: '400px', margin: '100px auto', backgroundColor: COLORS.pureWhite, borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', borderTop: `6px solid ${COLORS.primaryRed}` }}>
        <h2 style={{ color: COLORS.primaryRed, marginBottom: '5px', fontSize: '24px' }}>🛡️ Zeugmeister Login</h2>
        <p style={{ fontSize: '12.5px', color: COLORS.textMuted, marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ehrengarde der Stadt Bonn e.V.</p>
        {BETREUER_LISTE.map(name => (
          <button key={name} onClick={() => handleBetreuerLogin(name)} style={{ width: '100%', padding: '13px', marginBottom: '12px', background: COLORS.pureWhite, border: `2px solid ${COLORS.borderLight}`, borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', color: COLORS.textDark, cursor: 'pointer' }}>{name}</button>
        ))}
      </div>
    );
  }

  // Filtert alle Teile aus dem Inventar, die zur aktuell gewählten Kategorie passen und den Status 'Frei' haben
  const freieTeileFuerKategorie = inventar.filter(i => i.artikel === activeKategorie && i.status === 'Frei');
  
  // Überprüfung für das dynamische Design des PDF-Buttons (Dunkelgrau wenn alles okay, Orange wenn Haken fehlen)
  const istVollstaendigBestaetigt = selectedCadett?.dsgvo_bestaetigt && selectedCadett?.empfang_bestaetigt;

  // --- HAUPT-LAYOUT DER APP ---
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '480px', margin: '0 auto', backgroundColor: COLORS.appBackground, minHeight: '100vh', color: COLORS.textDark }}>
      
      {/* Mini-Header mit Betreuername und Logout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px', padding: '0 5px' }}>
        <span>👤 Zeugmeister: <strong style={{ color: COLORS.textDark }}>{currentBetreuer}</strong></span>
        <button onClick={() => setCurrentBetreuer('')} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Wechseln</button>
      </div>

      {/* Haupt-Navigation (Tab Bar) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: COLORS.primaryRed, padding: '6px', borderRadius: '10px' }}>
        <button onClick={() => { setView('cadetten'); setSelectedCadett(null); }} style={{ flex: 1, padding: '10px', background: view === 'cadetten' ? COLORS.pureWhite : 'transparent', color: view === 'cadetten' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ flex: 1, padding: '10px', background: view === 'inventar' ? COLORS.pureWhite : 'transparent', color: view === 'inventar' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Lagerbestand</button>
        <button onClick={() => setView('logs')} style={{ flex: 1, padding: '10px', background: view === 'logs' ? COLORS.pureWhite : 'transparent', color: view === 'logs' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>📋 Protokoll</button>
      </div>

      {/* --- REITER 1: CADETTEN-ÜBERSICHTSLISTE --- */}
      {view === 'cadetten' && !selectedCadett && (
        <div>
          {/* Formular zum Hinzufügen eines neuen Kindes */}
          <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px' }}>Neuen Cadetten eintragen</h3>
          <form onSubmit={handleAddCadett} style={{ display: 'flex', gap: '8px', marginBottom: '25px', marginTop: '10px' }}>
            <input type="text" placeholder="Vorname" value={newVorname} onChange={e => setNewVorname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` }} />
            <input type="text" placeholder="Nachname" value={newNachname} onChange={e => setNewNachname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` }} />
            <button type="submit" style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold' }}>+</button>
          </form>

          {/* Render-Schleife für die Liste der Kinder */}
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Aktive Cadetten</h3>
          {cadetten.map(c => (
            <div key={c.id} onClick={() => setSelectedCadett(c)} style={{ background: COLORS.pureWhite, padding: '14px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', borderLeft: `4px solid ${COLORS.primaryRed}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px' }}>{c.vorname} {c.nachname}</strong>
                <div style={{ fontSize: '12px', color: COLORS.textMuted }}>Ausrüstung: <span style={{ fontWeight: 'bold', color: COLORS.primaryRed }}>{getAusstattungsStatus(c.id)}</span></div>
              </div>
              {/* Visuelle Status-Indikatoren auf der Karte (Rechts) */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', background: c.dsgvo_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.dsgvo_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>DSGVO</span>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', background: c.empfang_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.empfang_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>Quittung</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- REITER 1.2: CADETTEN-DETAILANSICHT (Wenn ein Kind angeklickt wurde) --- */}
      {view === 'cadetten' && selectedCadett && (
        <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {/* Header der Detailansicht mit Zurück-Link und doppelt gesichertem Löschen */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>← Übersicht</button>
            <button onClick={() => handleDeletetCadett(selectedCadett)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} onMouseOver={e => e.target.style.color = COLORS.primaryRed} onMouseOut={e => e.target.style.color = COLORS.textMuted}>🗑️ Kind löschen</button>
          </div>
          
          <h2 style={{ margin: '15px 0 4px 0', color: COLORS.primaryRed }}>{selectedCadett.vorname} {selectedCadett.nachname}</h2>

          {/* Bereich für die rechtlichen Checkboxen */}
          <div style={{ background: '#F7FAFC', padding: '12px', borderRadius: '8px', margin: '15px 0', border: `1px solid ${COLORS.borderLight}` }}>
            
            {/* HAKEN 1: DSGVO mit integriertem Klick-Schutz */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', marginBottom: '10px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>1. Datenschutz (DSGVO)</span>
                <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Speicherung für Kleiderkammer erlaubt</div>
              </div>
              <input type="checkbox" checked={selectedCadett.dsgvo_bestaetigt || false} onChange={() => toggleDSGVO(selectedCadett)} style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: COLORS.statusGreen }} />
            </div>

            {/* HAKEN 2: Empfangsbestätigung durch die Eltern vor Ort */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>2. Übergabe-Quittung</span>
                <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Eltern bestätigen Erhalt der geliehenen Teile</div>
              </div>
              <input type="checkbox" checked={selectedCadett.empfang_bestaetigt || false} onChange={() => toggleEmpfang(selectedCadett)} style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: COLORS.statusGreen }} />
            </div>

          </div>

          {/* Liste der Kleidungsstücke (Soll-Ausstattung) */}
          <h3 style={{ fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', color: COLORS.textMuted }}>Soll-Ausstattung</h3>
          {SOLL_KATEGORIEN.map(kat => {
            const geliehen = ausgaben.find(a => a.kategorie_soll === kat);
            return (
              <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <div>
                  <span style={{ marginRight: '10px' }}>{geliehen ? '🔴' : '⚪'}</span>
                  <strong style={{ fontSize: '14px' }}>{kat}</strong>
                  {geliehen && !geliehen.selbst_beschafft && !geliehen.anmerkung_ausgabe && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px' }}>[ID: {geliehen.inventar_id}]</span>}
                </div>
                <div>
                  {geliehen ? (
                    <button onClick={() => handleRueckgabe(geliehen.id, kat, geliehen.inventar_id)} style={{ background: '#FFF5F5', color: COLORS.primaryRed, border: `1px solid ${COLORS.primaryRed}`, padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Rückgabe</button>
                  ) : (
                    <button onClick={() => { setActiveKategorie(kat); setShowAusgabeModal(true); }} style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Ausgeben</button>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* DYNAMISCHER PDF-BUTTON: Immer klickbar, warnt farblich (Orange), wenn Bestätigungen ausstehen */}
          <button 
            onClick={() => generatePDF(selectedCadett, ausgaben)} 
            style={{ 
              width: '100%', 
              marginTop: '25px', 
              background: istVollstaendigBestaetigt ? COLORS.textDark : COLORS.warningOrange, 
              color: COLORS.pureWhite, 
              border: 'none', 
              padding: '12px', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'background 0.2s'
            }}
          >
            {istVollstaendigBestaetigt ? '📄 PDF Beleg erzeugen (Alles OK)' : '⚠️ PDF erzeugen (Haken fehlen noch!)'}
          </button>
        </div>
      )}

      {/* --- REITER 2: LAGERBESTAND --- */}
      {view === 'inventar' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Lagerbestand ({inventar.length} Teile)</h3>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px' }}>
            {inventar.map(item => (
              <div key={item.id} style={{ padding: '10px', borderBottom: `1px solid ${COLORS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <div><span style={{ fontSize: '11px', background: COLORS.appBackground, padding: '2px 6px', marginRight: '8px' }}>{item.id}</span><strong>{item.artikel}</strong></div>
                <span style={{ color: item.status === 'Frei' ? COLORS.statusGreen : COLORS.primaryRed, fontWeight: 'bold', fontSize: '12px' }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- REITER 3: REVISIONSPROTOKOLL (AUDIT LOG) --- */}
      {view === 'logs' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>📋 Revisionsprotokoll</h3>
          <div style={{ maxHeight: '73vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px' }}>
            {logs.map(log => (
              <div key={log.id} style={{ padding: '8px 5px', borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 'bold', color: COLORS.primaryRed }}>{log.betreuer}</span><span style={{ fontSize: '10px', color: COLORS.textMuted }}>{new Date(log.created_at).toLocaleString('de-DE')}</span></div>
                <div style={{ fontWeight: '600' }}>{log.aktion}</div>
                <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>{log.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- POP-UP MODAL: KLEIDUNGSSTÜCK ZUWEISEN --- */}
      {showAusgabeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '350px' }}>
            <h3 style={{ marginTop: 0, color: COLORS.primaryRed }}>{activeKategorie} ausgeben</h3>
            
            {/* Dropdown-Menü: Listet dynamisch nur freie Teile dieser spezifischen Kategorie auf */}
            <select value={selectedTeilId} onChange={e => setSelectedTeilId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '18px' }}>
              <option value="">-- Lagerstück wählen --</option>
              {freieTeileFuerKategorie.map(i => <option key={i.id} value={i.id}>ID: {i.id} {i.groesse ? `(Gr. ${i.groesse})` : ''}</option>)}
            </select>
            
            {/* Option A: Aus dem Vereinslager zuweisen */}
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'lager')} disabled={!selectedTeilId} style={{ width: '100%', padding: '11px', background: selectedTeilId ? COLORS.primaryRed : COLORS.textMuted, color: COLORS.pureWhite, border: 'none', borderRadius: '6px', marginBottom: '8px', fontWeight: 'bold' }}>Aus Lager zuweisen</button>
            {/* Option B: Kind bringt eigenes Teil mit */}
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'selbst')} style={{ width: '100%', padding: '11px', background: COLORS.pureWhite, color: COLORS.statusGreen, border: `1px solid ${COLORS.statusGreen}`, borderRadius: '6px', marginBottom: '8px', fontWeight: 'bold' }}>"Selbst beschafft"</button>
            {/* Option C: Teil wird für diese Saison nicht benötigt */}
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'nicht_benoetigt')} style={{ width: '100%', padding: '11px', background: COLORS.appBackground, color: COLORS.textDark, border: 'none', borderRadius: '6px', marginBottom: '18px', fontWeight: 'bold' }}>Wird nicht benötigt</button>
            {/* Abbrechen-Button */}
            <button onClick={() => setShowAusgabeModal(false)} style={{ width: '100%', padding: '10px', background: COLORS.pureWhite, color: COLORS.textMuted, border: `1px solid ${COLORS.borderLight}`, borderRadius: '6px' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}