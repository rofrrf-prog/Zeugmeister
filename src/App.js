import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Package, FileText, Check, X, Plus, Trash2, Download, History, User } from 'lucide-react';
import { jsPDF } from 'jspdf';

// =========================================================================
// GLOBAL SYSTEMKONFIGURATION & FARBSCHEMA
// =========================================================================

// Definition aller Ausrüstungsgegenstände, die ein Cadett standardmäßig erhalten soll.
// Jede Änderung hier wirkt sich automatisch auf die Zuweisung, die UI und das PDF aus.
const SOLL_KATEGORIEN = ['Hut', 'Barret', 'Uniformjacke', 'Schulterstücke', 'Koppel', 'Mantel', 'Rock', 'Stiefel'];

// Feste Liste der berechtigten Zeugmeister für das vereinfachte Login-System.
const BETREUER_LISTE = ['Anja', 'Claudia', 'Ronny', 'Simone', 'Tina']; 

// Zentrales Corporate Identity Farbschema (Ehrengarde Bonn e.V.) für konsistentes UI-Styling.
const COLORS = {
  primaryRed: '#C41230',        // Hauptfarbe für Buttons, Titel und CI-Elemente
  primaryRedHover: '#A00F26',   // Dunkleres Rot für Hover-Effekte
  softRedBg: '#FDF2F4',         // Sanfter roter Hintergrund für Warnzonen
  pureWhite: '#FFFFFF',         // Reines Weiß für Karten und Modals
  appBackground: '#F7FAFC',     // Neutraler, heller Hintergrund für die App
  textDark: '#1A202C',          // Gut lesbarer, fast schwarzer Text
  textMuted: '#718096',         // Grauton für sekundäre Texte und Beschriftungen
  borderLight: '#E2E8F0',       
  statusGreen: '#319795',       // Petrol-Grün für positive Bestätigungen (Haken)
  statusGreenBg: '#E6FFFA',     // Sanfter grüner Hintergrund für aktive Status-Badges
  warningOrange: '#DD6B20',     // Orange für unvollständige Belege / Warnungen
  warningOrangeBg: '#FFFAF0'    
};

export default function App() {
  // =========================================================================
  // STATE-MANAGEMENT (ZUSTANDSTEUERUNG DER APPLICATION)
  // =========================================================================
  
  // Navigations-State: Bestimmt, welche Hauptansicht aktiv ist ('cadetten', 'inventar', 'logs')
  const [view, setView] = useState('cadetten'); 
  
  // Authentifizierungs-State: Speichert den Namen des angemeldeten Zeugmeisters im RAM und LocalStorage
  const [currentBetreuer, setCurrentBetreuer] = useState(localStorage.getItem('active_betreuer') || '');
  
  // Daten-States: Halten die synchronisierten Tabelleninhalte direkt aus der Supabase-Datenbank
  const [cadetten, setCadetten] = useState([]);         // Alle registrierten Kinder
  const [selectedCadett, setSelectedCadett] = useState(null); // Das aktuell in der Detailansicht geöffnete Kind
  const [inventar, setInventar] = useState([]);         // Gesamter Lagerbestand an Uniformen
  const [allAusgaben, setAllAusgaben] = useState([]);   // Alle getätigten Ausgaben systemweit (für Zähler-Übersicht)
  const [ausgaben, setAusgaben] = useState([]);         // Nur die Ausgaben des aktuell ausgewählten Cadetten
  const [logs, setLogs] = useState([]);                 // Die letzten 50 Einträge des Revisionsprotokolls
  
  // Modal- & Zuweisungs-States: Steuern das Popup zur Kleiderausgabe
  const [showAusgabeModal, setShowAusgabeModal] = useState(false); // Sichtbarkeit des Ausgabe-Dialogs
  const [activeKategorie, setActiveKategorie] = useState('');     // Die Kategorie, die gerade vergeben wird (z.B. 'Mantel')
  const [selectedTeilId, setSelectedTeilId] = useState('');       // Die im Dropdown gewählte konkrete Lager-ID
  
  // Eingabe-States für Formulare: Zwischenspeicher für manuelle Tipp-Eingaben
  const [newVorname, setNewVorname] = useState('');     // Vorname für Neuanlage Kind
  const [newNachname, setNewNachname] = useState('');   // Nachname für Neuanlage Kind
  const [newGroesse, setNewGroesse] = useState('');     // Textfeld für Größe bei Lager-Neuanlage (z.B. 'M', '140')

  // Klick-Filter-States für das Lager: Ermöglichen Filtern ohne Tastatureingabe
  const [lagerFilter, setLagerFilter] = useState('Alle');       // Filtert nach Artikeltyp (Dropdown)
  const [groessenFilter, setGroessenFilter] = useState('Alle');  // Filtert nach fixer Größe (Button-Leiste)
  const [zustandFilter, setZustandFilter] = useState('Alle');    // Filtert nach Zustand (Button-Leiste)

  // Eingabe-States für Lager-Erfassung
  const [newArtikelKat, setNewArtikelKat] = useState(SOLL_KATEGORIEN[0]); // Vorausgewählte Kategorie im Formular
  const [newZustand, setNewZustand] = useState('Neu');                  // Vorausgewählter Zustand im Formular

  // =========================================================================
  // SIDE EFFECTS & DATEN-FETCH-LOGIK (EIGENTLICHE SUPABASE INTERAKTION)
  // =========================================================================

  // Sobald ein Zeugmeister eingeloggt ist, werden alle globalen Stammdaten geladen
  useEffect(() => {
    if (currentBetreuer) {
      fetchCadetten();
      fetchInventar();
      fetchAllAusgaben();
      fetchLogs();
    }
  }, [currentBetreuer]);

  // Sobald ein anderes Kind angeklickt wird, laden wir dessen spezifische Ausstattungsliste nach
  useEffect(() => {
    if (selectedCadett) {
      fetchAusgaben(selectedCadett.id);
    }
  }, [selectedCadett]);

  // Universelle Logging-Funktion: Schreibt jede Aktion manipulationssicher in das audit_log der DB
  async function logAction(aktion, details) {
    await supabase.from('audit_log').insert([{
      betreuer: currentBetreuer,
      aktion: aktion,
      details: details
    }]);
    fetchLogs(); // Aktualisiert das Protokoll-UI sofort im Hintergrund
  }

  // Holt alle Kinder alphabetisch sortiert nach Vorname aus der Datenbank
  async function fetchCadetten() {
    const { data } = await supabase.from('cadetten').select('*').order('vorname', { ascending: true });
    if (data) setCadetten(data);
  }

  // Lädt das gesamte Inventar für die Lagerübersicht
  async function fetchInventar() {
    const { data } = await supabase.from('inventar').select('*');
    if (data) setInventar(data);
  }

  // Lädt die globale Beziehungsliste (wer hat was), um die "X / 8 Teile" Zähler in der Hauptliste zu berechnen
  async function fetchAllAusgaben() {
    const { data } = await supabase.from('ausgaben').select('*');
    if (data) setAllAusgaben(data);
  }

  // Holt exakt die Ausrüstungs-Datensätze, die mit der ID des selektierten Kindes verknüpft sind
  async function fetchAusgaben(cadettId) {
    const { data } = await supabase.from('ausgaben').select('*').eq('cadetten_id', cadettId);
    if (data) setAusgaben(data);
  }

  // Ruft die letzten 50 System-Aktionen für das Revisionsprotokoll ab
  async function fetchLogs() {
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setLogs(data);
  }

  // =========================================================================
  // LOGIK FÜR AKTIONEN & BUTTONS (HANDLERS)
  // =========================================================================

  // Setzt die Session für den Zeugmeister aktiv und sichert sie permanent im Browser-Speicher
  function handleBetreuerLogin(name) {
    localStorage.setItem('active_betreuer', name);
    setCurrentBetreuer(name);
  }

  // Erstellt ein neues Kind in der Datenbank. Die Bestätigungs-Haken starten standardmäßig auf 'false'
  async function handleAddCadett(e) {
    e.preventDefault(); 
    if (!newVorname || !newNachname) return; 
    
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
      fetchCadetten(); 
    }
  }

  // Schreibt ein komplett neues, unbenutztes Ausrüstungsteil in den Lagerbestand der Datenbank
  async function handleAddInventar(e) {
    e.preventDefault();
    if (!newArtikelKat) return;

    const { error } = await supabase.from('inventar').insert([{
      artikel: newArtikelKat,
      groesse: newGroesse || null, // Wenn leer gelassen, wird NULL in der DB gespeichert (z.B. bei Koppel oft keine Größe nötig)
      zustand: newZustand,
      status: 'Frei' // Neue Teile stehen sofort zur Leihe im Kleiderkammer-Pool bereit
    }]);

    if (!error) {
      logAction("Teil ins Lager gebucht", `${newArtikelKat} (Größe: ${newGroesse || 'k.A.'}, Zustand: ${newZustand}) hinzugefügt.`);
      setNewGroesse(''); // Eingabefeld leeren für das nächste Teil
      fetchInventar();    // UI-Liste sofort erneuern
    } else {
      alert(`Fehler beim Hinzufügen: ${error.message}`);
    }
  }

  // Schaltet die datenschutzrechtliche Einwilligung im Profil des Kindes um (Checkbox 1)
  async function toggleDSGVO(cadett) {
    if (cadett.dsgvo_bestaetigt) {
      const sicheresEntfernen = window.confirm(`WARNUNG:\nDu entfernst gerade die Datenschutz-Genehmigung für ${cadett.vorname}.\nBist du sicher?`);
      if (!sicheresEntfernen) return; 
    }

    const neuerStatus = !cadett.dsgvo_bestaetigt;
    const { error } = await supabase.from('cadetten').update({ dsgvo_bestaetigt: neuerStatus }).eq('id', cadett.id);
    if (!error) {
      logAction("DSGVO geändert", `Status für ${cadett.vorname} ${cadett.nachname} auf ${neuerStatus ? 'JA' : 'NEIN'} gesetzt.`);
      fetchCadetten(); 
      setSelectedCadett({ ...cadett, dsgvo_bestaetigt: neuerStatus }); 
    }
  }

  // Steuert die digitale Empfangsbestätigung der Eltern (Checkbox 2)
  async function toggleEmpfang(cadett) {
    if (cadett.empfang_bestaetigt) {
      const cancel = window.confirm("Möchtest du die Empfangsbestätigung wirklich zurücksetzen?");
      if (!cancel) return;
    }

    const neuerStatus = !cadett.empfang_bestaetigt;
    
    // Sendet das Update an die PostgreSQL-Tabelle 'cadetten'
    const { error } = await supabase.from('cadetten').update({ empfang_bestaetigt: neuerStatus }).eq('id', cadett.id);
    
    if (!error) {
      logAction(neuerStatus ? "Empfang quittiert" : "Empfang storniert", `Erziehungsberechtigte von ${cadett.vorname} ${cadett.nachname} haben den Erhalt digital bestätigt.`);
      await fetchCadetten();
      // Zustand im UI unverzüglich synchronisieren, um Fehlbedienungen zu unterbinden
      setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: neuerStatus }));
    } else {
      alert(`Fehler beim Aktualisieren der Quittung: ${error.message}`);
    }
  }

  // Löscht ein Kind mitsamt Kaskadierung. Supabase entfernt durch gesetzte Foreign Key-Bedingungen automatisch 
  // die Zuweisungen und setzt die verknüpften Lagerteile im Trigger wieder auf 'Frei'.
  async function handleDeletetCadett(cadett) {
    const ersteAbfrage = window.confirm(`Kind löschen?\nMöchtest du ${cadett.vorname} ${cadett.nachname} wirklich aus dem System entfernen?`);
    if (!ersteAbfrage) return;

    const zweiteAbfrage = window.confirm(`LETZTE WARNUNG:\nDadurch werden ALLE aktuellen Ausgaben gelöscht und die Kleidung automatisch wieder auf 'Frei' ins Lager gebucht!\n\nDrücke OK zum unwiderruflichen Löschen.`);
    if (!zweiteAbfrage) return;

    const { error: ausgabenError } = await supabase.from('ausgaben').delete().eq('cadetten_id', cadett.id);
    
    if (!ausgabenError) {
      const { error: cadettError } = await supabase.from('cadetten').delete().eq('id', cadett.id);
      if (!cadettError) {
        logAction("Cadett gelöscht", `${cadett.vorname} ${cadett.nachname} wurde vollständig entfernt.`);
        setSelectedCadett(null); // Detailansicht schließen, da das Kind nicht mehr existiert
        fetchCadetten(); 
        fetchInventar();
        fetchAllAusgaben();
      }
    }
  }

  // Verarbeitet die Zuweisung eines Uniformteils im Modal (Egal ob Lagerware, Eigenbesitz oder Nicht benötigt)
  async function handleAusgabeSpeichern(kategorie, typ) {
    if (typ === 'lager' && !selectedTeilId) {
      alert("Bitte wähle zuerst eine Lager-ID aus!");
      return; 
    }

    // Vorbereitung des Payload-Objekts für die 'ausgaben'-Tabelle in Supabase
    const insertData = {
      cadetten_id: selectedCadett.id,
      kategorie_soll: kategorie,
      selbst_beschafft: typ === 'selbst',
      inventar_id: typ === 'lager' ? selectedTeilId : null,
      status_nicht_benoetigt: typ === 'nicht_benoetigt'
    };

    const { error } = await supabase.from('ausgaben').insert([insertData]);

    if (error) {
      console.error("Supabase Fehler beim Speichern:", error);
      alert(`Fehler beim Speichern: ${error.message}`);
      return;
    }

    // AUTOMATISCHE UNTERSCHRIFT-STORNIERUNG: Da sich der Kleidungs-Sollbestand des Kindes verändert hat, 
    // wird der digitale Elternhaken in der DB und im aktiven Zustand sofort annulliert!
    await supabase.from('cadetten').update({ empfang_bestaetigt: false }).eq('id', selectedCadett.id);
    setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: false }));

    // Log-Meldung generieren je nachdem, welcher der 3 Ausgabe-Modi genutzt wurde
    let logDetail = `Zuweisung für ${selectedCadett.vorname}: ${kategorie}`;
    if (typ === 'lager') logDetail += ` (Lager-ID: ${selectedTeilId})`;
    if (typ === 'selbst') logDetail += ` (Selbst beschafft)`;
    if (typ === 'nicht_benoetigt') logDetail += ` (Als 'Nicht benötigt' markiert)`;
    
    await logAction("Teil ausgegeben", `${logDetail} - Eltern-Quittung wurde automatisch storniert.`);
    
    // UI-Zustand aufräumen und alle Listen neu puffern
    setShowAusgabeModal(false); 
    setSelectedTeilId('');     
    fetchAusgaben(selectedCadett.id); 
    fetchInventar();
    fetchCadetten(); 
    fetchAllAusgaben();
  }

  // Nimmt ein Kleidungsstück zurück (löscht die Zuweisung in der DB, wodurch das Lagerteil automatisch wieder frei wird)
  async function handleRueckgabe(ausgabeId, kategorie, inventarId) {
    const bestaetigung = window.confirm(`Möchtest du das Teil für "${kategorie}" wirklich als zurückgegeben markieren?`);
    if (!bestaetigung) return;

    const { error } = await supabase.from('ausgaben').delete().eq('id', ausgabeId);
    
    if (!error) {
      // Auch bei einer Rückgabe/Stornierung erlischt die Gültigkeit der alten digitalen Elternquittung
      await supabase.from('cadetten').update({ empfang_bestaetigt: false }).eq('id', selectedCadett.id);
      setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: false }));

      await logAction("Teil zurückgegeben", `Rückgabe von ${selectedCadett.vorname}: ${kategorie} - Eltern-Quittung wurde automatisch storniert.`);
      
      fetchAusgaben(selectedCadett.id);
      fetchInventar();
      fetchCadetten(); 
      fetchAllAusgaben();
    }
  }

  // =========================================================================
  // PDF-GENERATOR (HIER ERFOLGT DIE GESTALTUNG DES AUSGABE-BELEGS)
  // =========================================================================
  function generatePDF(cadett, aktuelleAusgaben) {
    const doc = new jsPDF();
    
    // Dekorativer roter Header-Balken der Ehrengarde am oberen Papierrand
    doc.setFillColor(196, 18, 48); 
    doc.rect(20, 15, 170, 3, 'F');
    
    // Dokumenten-Titel und Metadaten des Belegs
    doc.setFont("Helvetica", "bold"); doc.setFontSize(22); doc.text("Beleg: Uniformen-Ausgabe", 20, 30);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Cadett: ${cadett.vorname} ${cadett.nachname}`, 20, 45);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 52);
    doc.setLineWidth(0.5); doc.line(20, 58, 190, 58); // Horizontale Trennlinie
    
    // Tabelle / Listenausgabe der Ausstattung
    doc.setFont("Helvetica", "bold"); doc.text("Aktueller Ausstattungs-Status:", 20, 68);
    doc.setFont("Helvetica", "normal"); let yPos = 78;
    
    // Die Schleife läuft automatisch durch alle Kategorien aus 'SOLL_KATEGORIEN'.
    // Jedes neue Teil (wie Hut oder Stiefel) wird hierdurch automatisch auf das PDF gedruckt!
    SOLL_KATEGORIEN.forEach((kat) => {
      const geliehen = aktuelleAusgaben.find(a => a.kategorie_soll === kat);
      if (geliehen) {
        if (geliehen.status_nicht_benoetigt) {
          doc.text(`[-] ${kat}: Wird für diese Saison nicht benötigt`, 25, yPos);
        }
        else if (geliehen.selbst_beschafft) {
          doc.text(`[X] ${kat}: Selbst beschafft (Eigentum)`, 25, yPos);
        } 
        else {
          const info = inventar.find(i => i.id === geliehen.inventar_id);
          doc.text(`[X] ${kat}: Vereinslager ID: ${geliehen.inventar_id}${info?.groesse ? ` (Größe: ${info.groesse})` : ''}`, 25, yPos);
        }
      } else doc.text(`[ ] ${kat}: Offen / Noch nicht ausgegeben`, 25, yPos);
      yPos += 9; // Zeilenabstand nach unten verschieben
    });
    
    // Rechtliche Hinweise, Satzungs-Klauseln und Mietgebühren
    yPos += 8; doc.setFont("Helvetica", "bold"); doc.text("Rechtliche Einverständniserklärung & Miete:", 20, yPos);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(9);
    const rechtstext = "Die Uniformen-Miete beträgt pauschal 150,00 € pro Saison. Die Datenhaltung wurde elektronisch bewilligt.";
    doc.text(doc.splitTextToSize(rechtstext, 170), 20, yPos + 6);
    
    // Nachweis der digitalen Signaturen / Haken aus der Web-App
    doc.setFontSize(10); 
    doc.text(`🔒 Datenschutz (DSGVO): ${cadett.dsgvo_bestaetigt ? 'ERTEILT (Digital hinterlegt)' : 'OFFEN / AUSSTEHEND'}`, 20, yPos + 25);
    doc.text(`✍️ Übergabe-Quittung Eltern: ${cadett.empfang_bestaetigt ? 'BESTÄTIGT (Vor Ort digital autorisiert)' : 'OFFEN / AUSSTEHEND'}`, 20, yPos + 32);
    
    logAction("PDF generiert", `Beleg-PDF für ${cadett.vorname} ${cadett.nachname} aufgerufen.`);
    
    // Öffnet das fertig berechnete PDF direkt in einem neuen Browser-Tab zum Drucken
    doc.output('dataurlnewwindow');
  }

  // Hilfsfunktion: Berechnet den Textbaustein für das Zähler-Verhältnis (z.B. "3 / 8") in der Hauptliste
  function getAusstattungsStatus(cadettId) {
    return `${allAusgaben.filter(a => a.cadetten_id === cadettId).length} / ${SOLL_KATEGORIEN.length}`;
  }

  // =========================================================================
  // VIEW-RENDERING 1: LOGIN SCREEN (WENN KEIN BETREUER AKTIV IST)
  // =========================================================================
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

  // Hilfsvariablen für die Modalausgabe (Filtert Teile, die exakt zur Kategorie passen und den Zustand 'Frei'/'Free' aufweisen)
  const freieTeileFuerKategorie = inventar.filter(i => i.artikel === activeKategorie && (i.status === 'Frei' || i.status === 'Free'));
  const istVollstaendigBestaetigt = selectedCadett?.dsgvo_bestaetigt && selectedCadett?.empfang_bestaetigt;

  // =========================================================================
  // VIEW-RENDERING 2: HAUPT-APP (MOBILE FIRST CONTAINER - MAX 480PX WIDTH)
  // =========================================================================
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '480px', margin: '0 auto', backgroundColor: COLORS.appBackground, minHeight: '100vh', color: COLORS.textDark }}>
      
      {/* Oberste Statuszeile mit angemeldetem User und Logout-Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px', padding: '0 5px' }}>
        <span>👤 Zeugmeister: <strong style={{ color: COLORS.textDark }}>{currentBetreuer}</strong></span>
        <button onClick={() => setCurrentBetreuer('')} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Wechseln</button>
      </div>

      {/* Haupt-Navigationsleiste (Tab-Switcher) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: COLORS.primaryRed, padding: '6px', borderRadius: '10px' }}>
        <button onClick={() => { setView('cadetten'); setSelectedCadett(null); }} style={{ flex: 1, padding: '10px', background: view === 'cadetten' ? COLORS.pureWhite : 'transparent', color: view === 'cadetten' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ flex: 1, padding: '10px', background: view === 'inventar' ? COLORS.pureWhite : 'transparent', color: view === 'inventar' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Lagerbestand</button>
        <button onClick={() => setView('logs')} style={{ flex: 1, padding: '10px', background: view === 'logs' ? COLORS.pureWhite : 'transparent', color: view === 'logs' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>📋 Protokoll</button>
      </div>

      {/* TAB A: CADETTEN - HAUPTLISTE (WENN KEIN KIND SELEKTIERT IST) */}
      {view === 'cadetten' && !selectedCadett && (
        <div>
          {/* Eingabeformular für Neuregistrierung eines Kindes */}
          <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px' }}>Neuen Cadetten eintragen</h3>
          <form onSubmit={handleAddCadett} style={{ display: 'flex', gap: '8px', marginBottom: '25px', marginTop: '10px' }}>
            <input type="text" placeholder="Vorname" value={newVorname} onChange={e => setNewVorname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` }} />
            <input type="text" placeholder="Nachname" value={newNachname} onChange={e => setNewNachname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` }} />
            <button type="submit" style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold' }}>+</button>
          </form>

          {/* Auflistung aller erfassten Kinder */}
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Aktive Cadetten</h3>
          {cadetten.map(c => (
            <div key={c.id} onClick={() => setSelectedCadett(c)} style={{ background: COLORS.pureWhite, padding: '14px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', borderLeft: `4px solid ${COLORS.primaryRed}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px' }}>{c.vorname} {c.nachname}</strong>
                <div style={{ fontSize: '12px', color: COLORS.textMuted }}>Ausrüstung: <span style={{ fontWeight: 'bold', color: COLORS.primaryRed }}>{getAusstattungsStatus(c.id)}</span></div>
              </div>
              {/* Visuelle Haken-Badges direkt in der Zeile für schnellen administrativen Überblick */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', background: c.dsgvo_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.dsgvo_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>DSGVO</span>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', background: c.empfang_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.empfang_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>Quittung</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB A-DET: CADETTEN - DETAILANSICHT (FÜR EIN SPEZIFISCHES KIND) */}
      {view === 'cadetten' && selectedCadett && (
        <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {/* Header-Aktionen der Detailkarte */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>... Übersicht</button>
            <button onClick={() => handleDeletetCadett(selectedCadett)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>🗑️ Kind löschen</button>
          </div>
          
          <h2 style={{ margin: '15px 0 4px 0', color: COLORS.primaryRed }}>{selectedCadett.vorname} {selectedCadett.nachname}</h2>

          {/* Bereich für die beiden großen Kontroll-Checkboxen (Rechtliches & Quittungen) */}
          <div style={{ background: '#F7FAFC', padding: '12px', borderRadius: '8px', margin: '15px 0', border: `1px solid ${COLORS.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', marginBottom: '10px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>1. Datenschutz (DSGVO)</span>
                <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Speicherung für Kleiderkammer erlaubt</div>
              </div>
              <input type="checkbox" checked={selectedCadett.dsgvo_bestaetigt || false} onChange={() => toggleDSGVO(selectedCadett)} style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: COLORS.statusGreen }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>2. Übergabe-Quittung</span>
                <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Eltern bestätigen Erhalt der geliehenen Teile</div>
              </div>
              <input type="checkbox" checked={selectedCadett.empfang_bestaetigt || false} onChange={() => toggleEmpfang(selectedCadett)} style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: COLORS.statusGreen }} />
            </div>
          </div>

          {/* Das dynamische Zuweisungs-Register (Iteriert über SOLL_KATEGORIEN) */}
          <h3 style={{ fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', color: COLORS.textMuted }}>Soll-Ausstattung</h3>
          {SOLL_KATEGORIEN.map(kat => {
            const geliehen = ausgaben.find(a => a.kategorie_soll === kat);
            const istNichtBenoetigt = geliehen && geliehen.status_nicht_benoetigt;
            const istSelbstBeschafft = geliehen && geliehen.selbst_beschafft; 

            return (
              <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <div>
                  {/* Status-Indikator: Roter Punkt = Zugewiesen, Weißer Punkt = Noch offen */}
                  <span style={{ marginRight: '10px' }}>{geliehen ? '🔴' : '⚪'}</span>
                  <strong style={{ fontSize: '14px' }}>{kat}</strong>
                  
                  {/* Bedingte Text-Labels je nachdem welcher Inventar-Typ vorliegt */}
                  {geliehen && !istSelbstBeschafft && !istNichtBenoetigt && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px' }}>[ID: {geliehen.inventar_id}]</span>}
                  {istNichtBenoetigt && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px', fontStyle: 'italic' }}>(Nicht benötigt)</span>}
                  {istSelbstBeschafft && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px', fontStyle: 'italic' }}>(Selbst beschafft)</span>}
                </div>
                <div>
                  {geliehen ? (
                    <button onClick={() => handleRueckgabe(geliehen.id, kat, geliehen.inventar_id)} style={{ background: '#FFF5F5', color: COLORS.primaryRed, border: `1px solid ${COLORS.primaryRed}`, padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                      {istNichtBenoetigt || istSelbstBeschafft ? 'Ändern' : 'Rückgabe'}
                    </button>
                  ) : (
                    <button onClick={() => { setActiveKategorie(kat); setShowAusgabeModal(true); }} style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Ausgeben</button>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Großer Beleg-Aktionsbutton am Fußende der Karte */}
          <button onClick={() => generatePDF(selectedCadett, ausgaben)} style={{ width: '100%', marginTop: '25px', background: istVollstaendigBestaetigt ? COLORS.textDark : COLORS.warningOrange, color: COLORS.pureWhite, border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            {istVollstaendigBestaetigt ? '📄 PDF Beleg erzeugen (Alles OK)' : '⚠️ PDF erzeugen (Haken fehlen noch!)'}
          </button>
        </div>
      )}

      {/* TAB B: LAGERBESTAND (MIT KLICK-FILTERN UND SCHNELLERFASSUNG) */}
      {view === 'inventar' && (
        <div>
          {/* Schnellerfassungs-Eingabemaske für neue Bekleidung im Lager */}
          <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px' }}>Neues Uniformteil erfassen</h3>
          <form onSubmit={handleAddInventar} style={{ background: COLORS.pureWhite, padding: '12px', borderRadius: '8px', marginBottom: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select value={newArtikelKat} onChange={e => setNewArtikelKat(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px' }}>
                {SOLL_KATEGORIEN.map(kat => <option key={kat} value={kat}>{kat}</option>)}
              </select>
              <input type="text" placeholder="Größe (z.B. 38, M)" value={newGroesse} onChange={e => setNewGroesse(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select value={newZustand} onChange={e => setNewZustand(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px' }}>
                <option value="Neu">Zustand: Neu</option>
                <option value="Sehr Gut">Zustand: Sehr Gut</option>
                <option value="Gebraucht">Zustand: Gebraucht</option>
              </select>
              <button type="submit" style={{ background: COLORS.statusGreen, color: COLORS.pureWhite, border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>Teil einbuchen</button>
            </div>
          </form>

          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Lagerbestand ({inventar.length} Teile)</h3>
          
          {/* DIE NEUE KLICK-FILTERBOX (ERSETZT FREITEXT-SUCHE GEGEN SCHNELLE RADIAL-BUTTONS) */}
          <div style={{ background: COLORS.pureWhite, padding: '12px', borderRadius: '8px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            
            {/* Filter-Kriterium 1: Kategorie (Dropdown) */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Kategorie</label>
              <select value={lagerFilter} onChange={e => setLagerFilter(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px', fontWeight: 'bold' }}>
                <option value="Alle">Alle Kategorien</option>
                {SOLL_KATEGORIEN.map(kat => <option key={kat} value={kat}>{kat}n</option>)}
              </select>
            </div>

            {/* Filter-Kriterium 2: Größe (Scrollbare Button-Leiste für schnellen Daumen-Klick) */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Größe</label>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '3px' }}>
                {['Alle', 'S', 'M', 'L', 'XL', '36', '38', '40', '42'].map(g => {
                  const istAktiv = groessenFilter === g;
                  return (
                    <button key={g} type="button" onClick={() => setGroessenFilter(g)} style={{ padding: '5px 10px', borderRadius: '4px', border: istAktiv ? 'none' : `1px solid ${COLORS.borderLight}`, background: istAktiv ? COLORS.primaryRed : COLORS.appBackground, color: istAktiv ? COLORS.pureWhite : COLORS.textDark, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter-Kriterium 3: Physischer Zustand */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Zustand</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['Alle', 'Neu', 'Sehr Gut', 'Gebraucht'].map(z => {
                  const istAktiv = zustandFilter === z;
                  return (
                    <button key={z} type="button" onClick={() => setZustandFilter(z)} style={{ flex: 1, padding: '5px 8px', borderRadius: '4px', border: istAktiv ? 'none' : `1px solid ${COLORS.borderLight}`, background: istAktiv ? COLORS.textDark : COLORS.appBackground, color: istAktiv ? COLORS.pureWhite : COLORS.textDark, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {z}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Ausgabe der gefilterten Lager-Ergebnisse */}
          <div style={{ maxHeight: '45vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px' }}>
            {inventar
              .filter(item => {
                // Verschachtelte Filter-Prüfung: Nur Datensätze, die alle drei Bedingungen erfüllen, passieren
                const passtKategorie = lagerFilter === 'Alle' || item.artikel === lagerFilter;
                const passtGroesse = groessenFilter === 'Alle' || (item.groesse && item.groesse.toUpperCase() === groessenFilter.toUpperCase());
                const passtZustand = zustandFilter === 'Alle' || item.zustand === zustandFilter;
                return passtKategorie && passtGroesse && passtZustand;
              })
              .map(item => (
                <div key={item.id} style={{ padding: '10px 5px', borderBottom: `1px solid ${COLORS.borderLight}`, display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', background: COLORS.appBackground, padding: '2px 6px', marginRight: '8px', borderRadius: '4px' }}>{item.id}</span>
                      <strong>{item.artikel}</strong>
                    </div>
                    {/* Statusmeldung: Frei (grün) vs. Ausgeliehen (rot) */}
                    <span style={{ color: item.status === 'Frei' || item.status === 'Free' ? COLORS.statusGreen : COLORS.primaryRed, fontWeight: 'bold', fontSize: '12px' }}>
                      {item.status}
                    </span>
                  </div>
                  {/* Erweiterte Detailanzeige für Größe und Zustand unterhalb des Artikeltitels */}
                  <div style={{ fontSize: '11px', color: COLORS.textMuted, marginLeft: '45px' }}>
                    {item.groesse && <span style={{ marginRight: '10px' }}>📏 Gr: {item.groesse}</span>}
                    {item.zustand && <span>✨ {item.zustand}</span>}
                  </div>
                </div>
              ))}

            {/* Leermeldung falls kein Lagergegenstand auf die Filter-Kombination zutrifft */}
            {inventar.filter(item => {
              const passtKategorie = lagerFilter === 'Alle' || item.artikel === lagerFilter;
              const passtGroesse = groessenFilter === 'Alle' || (item.groesse && item.groesse.toUpperCase() === groessenFilter.toUpperCase());
              const passtZustand = zustandFilter === 'Alle' || item.zustand === zustandFilter;
              return passtKategorie && passtGroesse && passtZustand;
            }).length === 0 && (
              <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '20px', fontSize: '12px', fontStyle: 'italic' }}>
                Keine Uniformteile mit dieser Filter-Kombination im Lager.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB C: REVISIONSLOGS (PROTOKOLL-ANZEIGE) */}
      {view === 'logs' && (
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
      )}

      {/* OVERLAY / DIALOG-MODAL: KLEIDUNG AUSGEBEN (WIRD BEI KLICK AUF 'AUSGEBEN' AKTIVIERT) */}
      {showAusgabeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '350px' }}>
            <h3 style={{ marginTop: 0, color: COLORS.primaryRed }}>{activeKategorie} ausgeben</h3>
            
            {/* Dropdown zur Selektion einer konkreten, freien Lager-ID */}
            <select value={selectedTeilId} onChange={e => setSelectedTeilId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '18px' }}>
              <option value="">-- Lagerstück wählen --</option>
              {freieTeileFuerKategorie.map(i => <option key={i.id} value={i.id}>ID: {i.id} {i.groesse ? `(Gr. ${i.groesse})` : ''}</option>)}
            </select>
            
            {/* Die drei unterschiedlichen Ausgabe-Strategie-Buttons */}
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'lager')} disabled={!selectedTeilId} style={{ width: '100%', padding: '11px', background: selectedTeilId ? COLORS.primaryRed : COLORS.textMuted, color: COLORS.pureWhite, border: 'none', borderRadius: '6px', marginBottom: '8px', fontWeight: 'bold' }}>Aus Lager zuweisen</button>
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'selbst')} style={{ width: '100%', padding: '11px', background: COLORS.pureWhite, color: COLORS.statusGreen, border: `1px solid ${COLORS.statusGreen}`, borderRadius: '6px', marginBottom: '8px', fontWeight: 'bold' }}>"Selbst beschafft"</button>
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'nicht_benoetigt')} style={{ width: '100%', padding: '11px', background: COLORS.appBackground, color: COLORS.textDark, border: 'none', borderRadius: '6px', marginBottom: '18px', fontWeight: 'bold' }}>Wird nicht benötigt</button>
            
            <button onClick={() => setShowAusgabeModal(false)} style={{ width: '100%', padding: '10px', background: COLORS.pureWhite, color: COLORS.textMuted, border: `1px solid ${COLORS.borderLight}`, borderRadius: '6px' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}