import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Package, FileText, Check, X, Plus, Trash2, Download, History, User } from 'lucide-react';
import { jsPDF } from 'jspdf';

// --- SYSTEMKONFIGURATION ---
// Kleidungsstücke, die standardmäßig jedem Cadetten zustehen (Soll-Ausstattung)
const SOLL_KATEGORIEN = ['Barret', 'Koppel', 'Uniformjacke', 'Mantel', 'Rock'];

// Autorisierte Betreuer für das Login-System der App
const BETREUER_LISTE = ['Anja', 'Claudia', 'Ronny', 'Simone', 'Tina']; 

// --- DESIGN-TOKENS (Stil der Ehrengarde der Stadt Bonn: Rot & Weiß) ---
const COLORS = {
  primaryRed: '#C41230',       // Offizielles, kräftiges Ehrengarde-Rot für Header & Buttons
  primaryRedHover: '#A00F26',  // Dunkleres Rot für interaktive Hover-Effekte
  softRedBg: '#FDF2F4',        // Sanfter, hellroter Hintergrund für Statusmeldungen
  pureWhite: '#FFFFFF',        // Klares Weiß für Formulare und Karten-Elemente
  appBackground: '#F7FAFC',    // Minimalistisches, helles Grau für den App-Hintergrund
  textDark: '#1A202C',         // Dunkles Anthrazit für hervorragende Text-Lesbarkeit (Barrierefrei)
  textMuted: '#718096',        // Gedämpftes Grau für Sekundärtexte und IDs
  borderLight: '#E2E8F0',      // Diskrete Trennlinien
  statusGreen: '#319795',      // Petrol/Grün für positive Bestätigungen (z.B. DSGVO OK)
  statusGreenBg: '#E6FFFA'     // Helles Grün für Bestätigungskarten
};

export default function App() {
  // --- STATE-MANAGEMENT (Zustandsverwaltung) ---
  // view: Steuert die aktive Registerkarte ('cadetten', 'inventar', 'logs')
  const [view, setView] = useState('cadetten'); 
  // currentBetreuer: Holt den angemeldeten Namen aus dem lokalen Browser-Speicher
  const [currentBetreuer, setCurrentBetreuer] = useState(localStorage.getItem('active_betreuer') || '');
  
  // Datenspeicher für die Ansichten (Synchronisiert mit Supabase Cloud)
  const [cadetten, setCadetten] = useState([]);
  const [selectedCadett, setSelectedCadett] = useState(null); // Aktuell ausgewählter Cadett in der Detailansicht
  const [inventar, setInventar] = useState([]);
  const [allAusgaben, setAllAusgaben] = useState([]);
  const [ausgaben, setAusgaben] = useState([]); // Ausgaben spezifisch für den selektierten Cadetten
  const [logs, setLogs] = useState([]);
  
  // Modal-Zustände für das Zuweisungs-Fenster
  const [showAusgabeModal, setShowAusgabeModal] = useState(false);
  const [activeKategorie, setActiveKategorie] = useState(''); // Z.B. 'Uniformjacke'
  const [selectedTeilId, setSelectedTeilId] = useState(''); // Ausgewählte Lager-ID im Dropdown

  // Formular-Zustände für die Neuanlage eines Cadetten
  const [newVorname, setNewVorname] = useState('');
  const [newNachname, setNewNachname] = useState('');

  // --- EFFECT HOOKS (Automatische Datenbeschaffung) ---
  // Sobald ein Betreuer eingeloggt ist, werden alle Stammdaten initial geladen
  useEffect(() => {
    if (currentBetreuer) {
      fetchCadetten();
      fetchInventar();
      fetchAllAusgaben();
      fetchLogs();
    }
  }, [currentBetreuer]);

  // Sobald ein spezifischer Cadett angeklickt wird, laden wir dessen individuelle Kleidungsstücke
  useEffect(() => {
    if (selectedCadett) {
      fetchAusgaben(selectedCadett.id);
    }
  }, [selectedCadett]);

  // --- DATABASE & AUDIT FUNCTIONS (Supabase Kommunikation) ---
  
  /**
   * Protokolliert jede kritische Betreuer-Aktion revisionssicher in der Cloud
   */
  async function logAction(aktion, details) {
    await supabase.from('audit_log').insert([{
      betreuer: currentBetreuer,
      aktion: aktion,
      details: details
    }]);
    fetchLogs(); // Aktualisiert die Historie-Ansicht sofort
  }

  // Ruft alle Cadetten ab und sortiert sie alphabetisch nach Vornamen
  async function fetchCadetten() {
    const { data } = await supabase.from('cadetten').select('*').order('vorname', { ascending: true });
    if (data) setCadetten(data);
  }

  // Ruft das gesamte physische Vereinslager ab
  async function fetchInventar() {
    const { data } = await supabase.from('inventar').select('*');
    if (data) setInventar(data);
  }

  // Ruft die globale Beziehungs-Tabelle ab, um Ausstattungszahlen (z.B. 3/5) zu berechnen
  async function fetchAllAusgaben() {
    const { data } = await supabase.from('ausgaben').select('*');
    if (data) setAllAusgaben(data);
  }

  // Ruft die geliehenen Sachen eines einzelnen Cadetten ab
  async function fetchAusgaben(cadettId) {
    const { data } = await supabase.from('ausgaben').select('*').eq('cadetten_id', cadettId);
    if (data) setAusgaben(data);
  }

  // Lädt die letzten 50 Aktionen für das Audit-Protokoll herunter
  async function fetchLogs() {
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setLogs(data);
  }

  // Setzt die Session permanent im Browser-Cache fest
  function handleBetreuerLogin(name) {
    localStorage.setItem('active_betreuer', name);
    setCurrentBetreuer(name);
  }

  /**
   * Fügt einen neuen Cadetten hinzu und triggert den automatischen Log
   */
  async function handleAddCadett(e) {
    e.preventDefault();
    if (!newVorname || !newNachname) return;
    const { error } = await supabase.from('cadetten').insert([{ vorname: newVorname, nachname: newNachname }]);
    if (!error) {
      logAction("Cadett angelegt", `Hat ${newVorname} ${newNachname} im Register hinzugefügt.`);
      setNewVorname('');
      setNewNachname('');
      fetchCadetten();
    }
  }

  /**
   * Schaltet den DSGVO- & Mietvertrag-Status zwischen Ja und Nein um
   */
  async function toggleDSGVO(cadett) {
    const { error } = await supabase.from('cadetten').update({ dsgvo_bestaetigt: !cadett.dsgvo_bestaetigt }).eq('id', cadett.id);
    if (!error) {
      logAction("DSGVO geändert", `Status für ${cadett.vorname} ${cadett.nachname} auf ${!cadett.dsgvo_bestaetigt ? 'JA' : 'NEIN'} gesetzt.`);
      fetchCadetten();
      // Zustand im UI spiegeln
      setSelectedCadett({ ...cadett, dsgvo_bestaetigt: !cadett.dsgvo_bestaetigt });
    }
  }

  /**
   * Speichert die Uniform-Ausgabe ab. Unterscheidet zwischen Zuweisung aus dem Lager,
   * Eigenanschaffung der Eltern oder "Nicht benötigt".
   */
  async function handleAusgabeSpeichern(kategorie, typ) {
    if (typ === 'lager' && !selectedTeilId) return;

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
      if (typ === 'selbst') logDetail += ` (Selbst beschafft)`;
      if (typ === 'nicht_benoetigt') logDetail += ` (Als nicht benötigt markiert)`;
      
      logAction("Teil ausgegeben", logDetail);

      // Reset und UI-Refresh
      setShowAusgabeModal(false);
      setSelectedTeilId('');
      fetchAusgaben(selectedCadett.id);
      fetchInventar();
      fetchAllAusgaben();
    }
  }

  /**
   * Entfernt eine Zuweisung und gibt den Lagerartikel automatisch wieder frei
   */
  async function handleRueckgabe(ausgabeId, kategorie, inventarId) {
    const bestaetigung = window.confirm(`Möchtest du das Teil für "${kategorie}" wirklich als zurückgegeben markieren?`);
    if (!bestaetigung) return;

    const { error } = await supabase.from('ausgaben').delete().eq('id', ausgabeId);

    if (!error) {
      logAction("Teil zurückgegeben", `Rückgabe von ${selectedCadett.vorname}: ${kategorie} ${inventarId ? `(Lager-ID: ${inventarId})` : ''}`);
      fetchAusgaben(selectedCadett.id);
      fetchInventar();
      fetchAllAusgaben();
    }
  }

  /**
   * Generiert ein rechtssicheres Übergabe-PDF im neuen Fenster zum Direktdruck vor Ort
   */
  function generatePDF(cadett, aktuelleAusgaben) {
    const doc = new jsPDF();
    
    // Header & Design (Rot/Schwarz Akzente für das PDF)
    doc.setFillColor(196, 18, 48); // Ehrengarde-Rot
    doc.rect(20, 15, 170, 3, 'F');
    
    doc.setFont("Helvetica", "bold"); doc.setFontSize(22); doc.text("Beleg: Uniformen-Ausgabe", 20, 30);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Cadett: ${cadett.vorname} ${cadett.nachname}`, 20, 45);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 52);
    doc.setLineWidth(0.5); doc.line(20, 58, 190, 58);
    
    doc.setFont("Helvetica", "bold"); doc.text("Aktueller Ausstattungs-Status:", 20, 68);
    doc.setFont("Helvetica", "normal"); let yPos = 78;
    
    // Iteration über alle Soll-Kategorien zur Dokumentation
    SOLL_KATEGORIEN.forEach((kat) => {
      const geliehen = aktuelleAusgaben.find(a => a.kategorie_soll === kat);
      if (geliehen) {
        if (geliehen.anmerkung_ausgabe === 'Nicht benötigt') doc.text(`[-] ${kat}: Wird für dieses Kind nicht benötigt`, 25, yPos);
        else if (geliehen.selbst_beschafft) doc.text(`[X] ${kat}: Selbst beschafft (Eigentum der Familie)`, 25, yPos);
        else {
          const info = inventar.find(i => i.id === geliehen.inventar_id);
          doc.text(`[X] ${kat}: Vereinslager ID: ${geliehen.inventar_id}${info?.groesse ? ` (Größe: ${info.groesse})` : ''}`, 25, yPos);
        }
      } else doc.text(`[ ] ${kat}: Offen / Noch nicht ausgegeben`, 25, yPos);
      yPos += 9;
    });
    
    // Rechtstext & DSGVO
    yPos += 8; doc.setFont("Helvetica", "bold"); doc.text("Rechtliche Einverständniserklärung & Miete:", 20, yPos);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(9);
    const rechtstext = "Mit der Bestätigung im System (DSGVO OK) willigen die Erziehungsberechtigten ein, dass die personenbezogenen Daten des Kindes intern zur Uniformverwaltung digital gespeichert werden. Die Uniformen-Miete beträgt pauschal 150,00 € pro Saison.";
    doc.text(doc.splitTextToSize(rechtstext, 170), 20, yPos + 6);
    
    doc.setFontSize(11); 
    doc.text(`Sammelbestätigung durch Eltern erteilt: ${cadett.dsgvo_bestaetigt ? 'JA (Im System digital hinterlegt)' : 'NEIN (Bitte zügig nachholen!)'}`, 20, yPos + 32);
    
    logAction("PDF generiert", `Beleg-PDF für ${cadett.vorname} ${cadett.nachname} aufgerufen.`);
    doc.output('dataurlnewwindow');
  }

  // Hilfsfunktion: Berechnet das Verhältnis ausgegebener zu benötigten Sachen
  function getAusstattungsStatus(cadettId) {
    return `${allAusgaben.filter(a => a.cadetten_id === cadettId).length} / ${SOLL_KATEGORIEN.length}`;
  }

  // --- SCREEN 1: LOGIN ERZWINGEN ---
  if (!currentBetreuer) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: '40px 20px', maxWidth: '400px', margin: '100px auto', backgroundColor: COLORS.pureWhite, borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', borderTop: `6px solid ${COLORS.primaryRed}` }}>
        <h2 style={{ color: COLORS.primaryRed, marginBottom: '5px', fontSize: '24px' }}>🛡️ Zeugmeister Login</h2>
        <p style={{ fontSize: '12.5px', color: COLORS.textMuted, marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ehrengarde der Stadt Bonn e.V.</p>
        <p style={{ fontSize: '14px', color: COLORS.textDark, marginBottom: '25px' }}>Bitte wähle deinen Namen aus, um die Verwaltung freizuschalten.</p>
        {BETREUER_LISTE.map(name => (
          <button key={name} onClick={() => handleBetreuerLogin(name)} style={{ width: '100%', padding: '13px', marginBottom: '12px', background: COLORS.pureWhite, border: `2px solid ${COLORS.borderLight}`, borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', color: COLORS.textDark, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.borderColor = COLORS.primaryRed} onMouseOut={e => e.target.style.borderColor = COLORS.borderLight}>{name}</button>
        ))}
      </div>
    );
  }

  // Filtert alle verfügbaren Teile für das Zuweisungs-Dropdown
  const freieTeileFuerKategorie = inventar.filter(i => i.artikel === activeKategorie && i.status === 'Frei');

  // --- MAIN APP RENDER (Hauptanwendung) ---
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '480px', margin: '0 auto', backgroundColor: COLORS.appBackground, minHeight: '100vh', color: COLORS.textDark }}>
      
      {/* Top Bar: Aktiver Nutzer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px', padding: '0 5px' }}>
        <span>👤 Zeugmeister: <strong style={{ color: COLORS.textDark }}>{currentBetreuer}</strong></span>
        <button onClick={() => setCurrentBetreuer('')} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Nutzer wechseln</button>
      </div>

      {/* Haupt-Navigation im Ehrengarde-Rot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: COLORS.primaryRed, padding: '6px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(196,18,48,0.2)' }}>
        <button onClick={() => { setView('cadetten'); setSelectedCadett(null); }} style={{ flex: 1, padding: '10px', background: view === 'cadetten' ? COLORS.pureWhite : 'transparent', color: view === 'cadetten' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s' }}>Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ flex: 1, padding: '10px', background: view === 'inventar' ? COLORS.pureWhite : 'transparent', color: view === 'inventar' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s' }}>Lagerbestand</button>
        <button onClick={() => setView('logs')} style={{ flex: 1, padding: '10px', background: view === 'logs' ? COLORS.pureWhite : 'transparent', color: view === 'logs' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s' }}>📋 Protokoll</button>
      </div>

      {/* VIEW A: CADETTEN REGISTER */}
      {view === 'cadetten' && !selectedCadett && (
        <div>
          <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px' }}>Neuen Cadetten eintragen</h3>
          <form onSubmit={handleAddCadett} style={{ display: 'flex', gap: '8px', marginBottom: '25px', marginTop: '10px' }}>
            <input type="text" placeholder="Vorname" value={newVorname} onChange={e => setNewVorname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, outline: 'none' }} />
            <input type="text" placeholder="Nachname" value={newNachname} onChange={e => setNewNachname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, outline: 'none' }} />
            <button type="submit" style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
          </form>

          <h3 style={{ fontSize: '16px', color: COLORS.textDark, marginBottom: '10px' }}>Aktive Cadetten (A-Z)</h3>
          {cadetten.map(c => (
            <div key={c.id} onClick={() => setSelectedCadett(c)} style={{ background: COLORS.pureWhite, padding: '14px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderLeft: `4px solid ${COLORS.primaryRed}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.15s' }}>
              <div>
                <strong style={{ fontSize: '15px', color: COLORS.textDark }}>{c.vorname} {c.nachname}</strong>
                <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '3px' }}>Ausstattung: <span style={{ fontWeight: 'bold', color: COLORS.primaryRed }}>{getAusstattungsStatus(c.id)}</span> Teile</div>
              </div>
              <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', background: c.dsgvo_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.dsgvo_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>
                {c.dsgvo_bestaetigt ? 'Vertrag OK' : 'Eltern offen'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* VIEW B: DETAILANSICHT CADETT */}
      {view === 'cadetten' && selectedCadett && (
        <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', marginBottom: '15px', fontWeight: 'bold', fontSize: '13px' }}>← Zurück zur Übersicht</button>
          <h2 style={{ margin: '0 0 4px 0', color: COLORS.primaryRed }}>{selectedCadett.vorname} {selectedCadett.nachname}</h2>
          {/* <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: COLORS.textMuted }}>Mitglieds-ID: {selectedCadett.id}</p> */}

          {/* DSGVO & Miete Karte */}
          <div style={{ background: selectedCadett.dsgvo_bestaetigt ? COLORS.statusGreenBg : COLORS.softRedBg, padding: '12px', borderRadius: '8px', border: `1px solid ${selectedCadett.dsgvo_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed}`, marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', color: COLORS.textDark, margin: '0 0 10px 0', lineHeight: '1.4' }}>
              <strong>Sammelerklärung & Miete (150€):</strong> Bestätigt das Einverständnis der Eltern zur Datenhaltung und den Erhalt der Ausrüstung.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${COLORS.borderLight}` }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: selectedCadett.dsgvo_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>
                {selectedCadett.dsgvo_bestaetigt ? '✅ Erklärung liegt vor' : '⚠️ Genehmigung fehlt!'}
              </span>
              <input type="checkbox" checked={selectedCadett.dsgvo_bestaetigt} onChange={() => toggleDSGVO(selectedCadett)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: COLORS.primaryRed }} />
            </div>
          </div>

          <h3 style={{ fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', color: COLORS.textMuted, letterSpacing: '0.5px' }}>Soll-Ausstattung Checkliste</h3>
          {SOLL_KATEGORIEN.map(kat => {
            const geliehen = ausgaben.find(a => a.kategorie_soll === kat);
            return (
              <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <div>
                  <span style={{ marginRight: '10px' }}>{geliehen ? (geliehen.anmerkung_ausgabe === 'Nicht benötigt' ? '➖' : '🔴') : '⚪'}</span>
                  <strong style={{ fontSize: '14px' }}>{kat}</strong>
                  {geliehen && !geliehen.selbst_beschafft && !geliehen.anmerkung_ausgabe && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '12px', fontFamily: 'monospace' }}>[ID: {geliehen.inventar_id}]</span>}
                  {geliehen && geliehen.selbst_beschafft && <span style={{ marginLeft: '6px', color: COLORS.statusGreen, fontSize: '12px', fontWeight: 'bold' }}>(Eigentum)</span>}
                </div>
                <div>
                  {geliehen ? (
                    <button onClick={() => handleRueckgabe(geliehen.id, kat, geliehen.inventar_id)} style={{ background: '#FFF5F5', color: COLORS.primaryRed, border: `1px solid ${COLORS.primaryRed}`, padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Rückgabe</button>
                  ) : (
                    <button onClick={() => { setActiveKategorie(kat); setShowAusgabeModal(true); }} style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Ausgeben</button>
                  )}
                </div>
              </div>
            );
          })}
          <button onClick={() => generatePDF(selectedCadett, ausgaben)} style={{ width: '100%', marginTop: '25px', background: COLORS.textDark, color: COLORS.pureWhite, border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>📄 PDF Beleg drucken / öffnen</button>
        </div>
      )}

      {/* VIEW C: LAGERBESTAND */}
      {view === 'inventar' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Lagerbestand ({inventar.length} Teile registriert)</h3>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {inventar.map(item => (
              <div key={item.id} style={{ padding: '10px', borderBottom: `1px solid ${COLORS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
                <div>
                  <span style={{ fontFamily: 'monospace', background: COLORS.appBackground, padding: '2px 6px', borderRadius: '4px', marginRight: '8px', fontWeight: 'bold', fontSize: '11px' }}>{item.id}</span>
                  <strong>{item.artikel}</strong>
                  {item.groesse && <span style={{ color: COLORS.textMuted, marginLeft: '5px' }}>Gr. {item.groesse}</span>}
                </div>
                <span style={{ color: item.status === 'Frei' ? COLORS.statusGreen : COLORS.primaryRed, fontWeight: 'bold', fontSize: '12px', background: item.status === 'Frei' ? COLORS.statusGreenBg : COLORS.softRedBg, padding: '2px 8px', borderRadius: '10px' }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW D: REVISIONS-LOGS */}
      {view === 'logs' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>📋 Revisionsprotokoll (Letzte 50 Aktionen)</h3>
          <div style={{ maxHeight: '73vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {logs.length === 0 ? <p style={{ fontSize: '14px', color: COLORS.textMuted, textAlign: 'center' }}>Bisher keine Logeinträge gefunden.</p> : 
              logs.map(log => (
                <div key={log.id} style={{ padding: '10px 5px', borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', color: COLORS.primaryRed }}>👤 {log.betreuer}</span>
                    <span style={{ fontSize: '11px', color: COLORS.textMuted }}>{new Date(log.created_at).toLocaleString('de-DE')}</span>
                  </div>
                  <div style={{ fontWeight: '600', color: COLORS.textDark }}>🔹 {log.aktion}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: '11.5px', marginTop: '1px' }}>{log.details}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* DIALOG-MODAL FÜR KLASSISCHE UNIFORM-AUSGABE */}
      {showAusgabeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', borderTop: `4px solid ${COLORS.primaryRed}` }}>
            <h3 style={{ marginTop: 0, borderBottom: `2px solid ${COLORS.borderLight}`, paddingBottom: '8px', color: COLORS.primaryRed }}>{activeKategorie} ausgeben</h3>
            
            <p style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>Verfügbare Stücke im Vereinslager:</p>
            <select value={selectedTeilId} onChange={e => setSelectedTeilId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, marginBottom: '18px', outline: 'none' }}>
              <option value="">-- Stück aus Liste wählen --</option>
              {freieTeileFuerKategorie.map(i => <option key={i.id} value={i.id}>ID: {i.id} {i.groesse ? `(Größe: ${i.groesse})` : ''}</option>)}
            </select>
            
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'lager')} disabled={!selectedTeilId} style={{ width: '100%', padding: '11px', background: selectedTeilId ? COLORS.primaryRed : COLORS.textMuted, color: COLORS.pureWhite, border: 'none', borderRadius: '6px', marginBottom: '8px', fontWeight: 'bold', cursor: selectedTeilId ? 'pointer' : 'not-allowed' }}>Aus Vereinslager zuweisen</button>
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'selbst')} style={{ width: '100%', padding: '11px', background: COLORS.pureWhite, color: COLORS.statusGreen, border: `1px solid ${COLORS.statusGreen}`, borderRadius: '6px', marginBottom: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Als "Selbst beschafft" eintragen</button>
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'nicht_benoetigt')} style={{ width: '100%', padding: '11px', background: COLORS.appBackground, color: COLORS.textDark, border: 'none', borderRadius: '6px', marginBottom: '18px', fontWeight: 'bold', cursor: 'pointer' }}>Wird nicht benötigt</button>
            <button onClick={() => setShowAusgabeModal(false)} style={{ width: '100%', padding: '10px', background: COLORS.pureWhite, color: COLORS.textMuted, border: `1px solid ${COLORS.borderLight}`, borderRadius: '6px', cursor: 'pointer' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}