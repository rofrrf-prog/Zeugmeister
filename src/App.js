import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Package, FileText, Check, X, Plus, Trash2, Download, History, User } from 'lucide-react';
import { jsPDF } from 'jspdf';

// =========================================================================
// GLOBAL SYSTEMKONFIGURATION & FARBSCHEMA
// =========================================================================

const SOLL_KATEGORIEN = ['Hut', 'Barret', 'Uniformjacke', 'Schulterstücke', 'Koppel', 'Mantel', 'Rock', 'Stiefel'];
const BETREUER_LISTE = ['Anja', 'Claudia', 'Ronny', 'Simone', 'Tina']; 

const COLORS = {
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

export default function App() {
  // =========================================================================
  // STATE-MANAGEMENT
  // =========================================================================
  const [view, setView] = useState('cadetten'); 
  const [currentBetreuer, setCurrentBetreuer] = useState(localStorage.getItem('active_betreuer') || '');
  
  const [cadetten, setCadetten] = useState([]);         
  const [selectedCadett, setSelectedCadett] = useState(null); 
  const [inventar, setInventar] = useState([]);         
  const [allAusgaben, setAllAusgaben] = useState([]);   
  const [ausgaben, setAusgaben] = useState([]);         
  const [logs, setLogs] = useState([]);                 
  
  const [showAusgabeModal, setShowAusgabeModal] = useState(false); 
  const [activeKategorie, setActiveKategorie] = useState('');     
  const [selectedTeilId, setSelectedTeilId] = useState('');       
  
  const [newVorname, setNewVorname] = useState('');     
  const [newNachname, setNewNachname] = useState('');   
  const [newGroesse, setNewGroesse] = useState('');     

  const [lagerFilter, setLagerFilter] = useState('Alle');       
  const [groessenFilter, setGroessenFilter] = useState('Alle');  
  const [zustandFilter, setZustandFilter] = useState('Alle');    

  const [newArtikelKat, setNewArtikelKat] = useState(SOLL_KATEGORIEN[0]); 
  const [newZustand, setNewZustand] = useState('Neu');                  

  const [isEditingName, setIsEditingName] = useState(false);       
  const [editVorname, setEditVorname] = useState('');               
  const [editNachname, setEditNachname] = useState('');             
  const [kommentarText, setKommentarText] = useState('');           
  const [kommentarGespeichert, setKommentarGespeichert] = useState(true); 

  // =========================================================================
  // SIDE EFFECTS & DATEN-FETCH-LOGIK
  // =========================================================================
  useEffect(() => {
    if (currentBetreuer) {
      fetchCadetten();
      fetchInventar();
      fetchAllAusgaben();
      fetchLogs();
    }
  }, [currentBetreuer]);

  useEffect(() => {
    if (selectedCadett) {
      fetchAusgaben(selectedCadett.id);
      setKommentarText(selectedCadett.kommentar || '');
      setKommentarGespeichert(true);
      setIsEditingName(false);

      // NEU (PUNKT 1): AUTOMATISCHES HOCHSCROLLEN BEIM ÖFFNEN / WECHSELN EINES KINDES
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedCadett]);

  async function logAction(aktion, details) {
    await supabase.from('audit_log').insert([{
      betreuer: currentBetreuer,
      aktion: aktion,
      details: details
    }]);
    fetchLogs(); 
  }

  async function fetchCadetten() {
    const { data } = await supabase.from('cadetten').select('*').order('vorname', { ascending: true });
    if (data) setCadetten(data);
  }

  async function fetchInventar() {
    const { data } = await supabase.from('inventar').select('*');
    if (data) setInventar(data);
  }

  async function fetchAllAusgaben() {
    const { data } = await supabase.from('ausgaben').select('*');
    if (data) setAllAusgaben(data);
  }

  async function fetchAusgaben(cadettId) {
    const { data } = await supabase.from('ausgaben').select('*').eq('cadetten_id', cadettId);
    if (data) setAusgaben(data);
  }

  async function fetchLogs() {
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setLogs(data);
  }

  // =========================================================================
  // LOGIK FÜR AKTIONEN & BUTTONS
  // =========================================================================
  function handleBetreuerLogin(name) {
    localStorage.setItem('active_betreuer', name);
    setCurrentBetreuer(name);
  }

  // NEU (PUNKT 2): BLÄTTER-LOGIK (ZUM NÄCHSTEN ODER VORHERIGEN KIND SPRINGEN)
  function handleNavigateCadett(direction) {
    if (!selectedCadett || cadetten.length === 0) return;
    
    // Findet den Index des aktuell geöffneten Kindes in der alphabetischen Gesamtliste
    const currentIndex = cadetten.findIndex(c => c.id === selectedCadett.id);
    let nextIndex = currentIndex + direction;

    // Endlos-Schleife verhindern: Wenn am Ende angekommen, wieder von vorne starten, und umgekehrt
    if (nextIndex >= cadetten.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = cadetten.length - 1;

    setSelectedCadett(cadetten[nextIndex]);
  }

  async function handleAddCadett(e) {
    e.preventDefault(); 
    if (!newVorname || !newNachname) return; 
    
    const { error } = await supabase.from('cadetten').insert([{ 
      vorname: newVorname, 
      nachname: newNachname, 
      dsgvo_bestaetigt: false, 
      empfang_bestaetigt: false,
      kommentar: '' 
    }]);

    if (!error) {
      logAction("Cadett angelegt", `Hat ${newVorname} ${newNachname} im Register hinzugefügt.`);
      setNewVorname('');
      setNewNachname('');
      fetchCadetten(); 
    }
  }

  async function handleUpdateName(e) {
    e.preventDefault();
    if (!editVorname.trim() || !editNachname.trim()) return;

    const { error } = await supabase.from('cadetten').update({
      vorname: editVorname.trim(),
      nachname: editNachname.trim()
    }).eq('id', selectedCadett.id);

    if (!error) {
      logAction("Name korrigiert", `Name von ID ${selectedCadett.id} geändert von "${selectedCadett.vorname} ${selectedCadett.nachname}" zu "${editVorname} ${editNachname}".`);
      setIsEditingName(false);
      setSelectedCadett(prev => ({ ...prev, vorname: editVorname.trim(), nachname: editNachname.trim() }));
      fetchCadetten();
    } else {
      alert(`Fehler beim Ändern des Namens: ${error.message}`);
    }
  }

  async function handleSaveKommentar() {
    const { error } = await supabase.from('cadetten').update({
      kommentar: kommentarText
    }).eq('id', selectedCadett.id);

    if (!error) {
      logAction("Kommentar aktualisiert", `Notiz für ${selectedCadett.vorname} ${selectedCadett.nachname} wurde aktualisiert.`);
      setKommentarGespeichert(true);
      setSelectedCadett(prev => ({ ...prev, kommentar: kommentarText }));
      fetchCadetten();
    } else {
      alert(`Fehler beim Speichern der Notiz: ${error.message}`);
    }
  }

  async function handleAddInventar(e) {
    e.preventDefault();
    if (!newArtikelKat) return;

    const { error } = await supabase.from('inventar').insert([{
      artikel: newArtikelKat,
      groesse: newGroesse || null, 
      zustand: newZustand,
      status: 'Frei' 
    }]);

    if (!error) {
      logAction("Teil ins Lager gebucht", `${newArtikelKat} (Größe: ${newGroesse || 'k.A.'}, Zustand: ${newZustand}) hinzugefügt.`);
      setNewGroesse(''); 
      fetchInventar();    
    } else {
      alert(`Fehler beim Hinzufügen: ${error.message}`);
    }
  }

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

  async function toggleEmpfang(cadett) {
    if (cadett.empfang_bestaetigt) {
      const cancel = window.confirm("Möchtest du die Empfangsbestätigung wirklich zurücksetzen?");
      if (!cancel) return;
    }

    const neuerStatus = !cadett.empfang_bestaetigt;
    const { error } = await supabase.from('cadetten').update({ empfang_bestaetigt: neuerStatus }).eq('id', cadett.id);
    
    if (!error) {
      logAction(neuerStatus ? "Empfang quittiert" : "Empfang storniert", `Erziehungsberechtigte von ${cadett.vorname} ${cadett.nachname} haben den Erhalt digital bestätigt.`);
      await fetchCadetten();
      setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: neuerStatus }));
    } else {
      alert(`Fehler beim Aktualisieren der Quittung: ${error.message}`);
    }
  }

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
        setSelectedCadett(null); 
        fetchCadetten(); 
        fetchInventar();
        fetchAllAusgaben();
      }
    }
  }

  async function handleAusgabeSpeichern(kategorie, typ) {
    if (typ === 'lager' && !selectedTeilId) {
      alert("Bitte wähle zuerst eine Lager-ID aus!");
      return; 
    }

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

    await supabase.from('cadetten').update({ empfang_bestaetigt: false }).eq('id', selectedCadett.id);
    setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: false }));

    let logDetail = `Zuweisung für ${selectedCadett.vorname}: ${kategorie}`;
    if (typ === 'lager') logDetail += ` (Lager-ID: ${selectedTeilId})`;
    if (typ === 'selbst') logDetail += ` (Selbst beschafft)`;
    if (typ === 'nicht_benoetigt') logDetail += ` (Als 'Nicht benötigt' markiert)`;
    
    await logAction("Teil ausgegeben", `${logDetail} - Eltern-Quittung wurde automatisch storniert.`);
    
    setShowAusgabeModal(false); 
    setSelectedTeilId('');     
    fetchAusgaben(selectedCadett.id); 
    fetchInventar();
    fetchCadetten(); 
    fetchAllAusgaben();
  }

  async function handleRueckgabe(ausgabeId, kategorie, inventarId) {
    const bestaetigung = window.confirm(`Möchtest du das Teil für "${kategorie}" wirklich als zurückgegeben markieren?`);
    if (!bestaetigung) return;

    const { error } = await supabase.from('ausgaben').delete().eq('id', ausgabeId);
    
    if (!error) {
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
  // PDF-GENERATOR & SHARE LOGIK
  // =========================================================================
  async function generateAndSharePDF(cadett, aktuelleAusgaben) {
    const doc = new jsPDF();
    
    doc.setFillColor(196, 18, 48); 
    doc.rect(20, 15, 170, 3, 'F');
    
    doc.setFont("Helvetica", "bold"); doc.setFontSize(22); doc.text("Beleg: Uniformen-Ausgabe", 20, 30);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Cadett: ${cadett.vorname} ${cadett.nachname}`, 20, 45);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 52);
    doc.setLineWidth(0.5); doc.line(20, 58, 190, 58); 
    
    doc.setFont("Helvetica", "bold"); doc.text("Aktueller Ausstattungs-Status:", 20, 68);
    doc.setFont("Helvetica", "normal"); let yPos = 78;
    
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
      yPos += 9; 
    });
    
    yPos += 8; doc.setFont("Helvetica", "bold"); doc.text("Rechtliche Einverständniserklärung & Miete:", 20, yPos);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(9);
    const rechtstext = "Die Uniformen-Miete beträgt pauschal 150,00 € pro Saison. Die Datenhaltung wurde elektronisch bewilligt.";
    doc.text(doc.splitTextToSize(rechtstext, 170), 20, yPos + 6);
    
    doc.setFontSize(10); 
    // NEU (PUNKT 5): EMOJIS ENTFERNT (Schloss & Stift gelöscht, da sie in Helvetica fehlerhaft als Kästchen dargestellt wurden)
    doc.text(`Datenschutz (DSGVO): ${cadett.dsgvo_bestaetigt ? 'ERTEILT (Digital hinterlegt)' : 'OFFEN / AUSSTEHEND'}`, 20, yPos + 25);
    doc.text(`Uebergabe-Quittung Eltern: ${cadett.empfang_bestaetigt ? 'BESTAETIGT (Vor Ort digital autorisiert)' : 'OFFEN / AUSSTEHEND'}`, 20, yPos + 32);
    
    logAction("PDF generiert", `Beleg-PDF für ${cadett.vorname} ${cadett.nachname} aufgerufen.`);

    // NEU (PUNKT 4): DYNAMISCHER FILENAME NACH SCHEMA <Vorname_Nachname>.pdf
    const dateiname = `${cadett.vorname}_${cadett.nachname}.pdf`;

    // NEU (PUNKT 3): INTERACTIVE WHATSAPP / HANDY TEILEN ÜBER WEB SHARE API
    // Statt das PDF starr im Browser zu öffnen, übergeben wir es an das native Teilen-Menü des Mobiltelefons
    if (navigator.canShare && navigator.share) {
      try {
        const pdfBlob = doc.output('blob'); // Konvertiert PDF in Rohdaten
        const file = new File([pdfBlob], dateiname, { type: 'application/pdf' }); // Erzeugt virtuelle Datei

        await navigator.share({
          files: [file],
          title: `Uniformen-Beleg: ${cadett.vorname} ${cadett.nachname}`,
          text: `Hier ist der aktuelle Ausstattungsbeleg von ${cadett.vorname}.`
        });
      } catch (err) {
        // Falls der Nutzer den Teilen-Dialog abbricht, passiert nichts Schlimmes
        console.log("Teilen abgebrochen oder fehlgeschlagen:", err);
      }
    } else {
      // Fallback: Wenn die App auf einem alten PC läuft, der kein "Teilen-Menü" kennt, wird es einfach direkt heruntergeladen
      doc.save(dateiname);
    }
  }

  function getAusstattungsStatus(cadettId) {
    return `${allAusgaben.filter(a => a.cadetten_id === cadettId).length} / ${SOLL_KATEGORIEN.length}`;
  }

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

  const freieTeileFuerKategorie = inventar
    .filter(i => i.artikel === activeKategorie && (i.status === 'Frei' || i.status === 'Free'))
    .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })); 

  const istVollstaendigBestaetigt = selectedCadett?.dsgvo_bestaetigt && selectedCadett?.empfang_bestaetigt;

  const existierendeGroessen = [
    'Alle',
    ...new Set(inventar.map(item => item.groesse ? item.groesse.trim() : '').filter(g => g !== ''))
  ].sort(); 

  const existierendeZustaende = [
    'Alle',
    ...new Set(inventar.map(item => item.zustand ? item.zustand.trim() : '').filter(z => z !== ''))
  ].sort();

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '480px', margin: '0 auto', backgroundColor: COLORS.appBackground, minHeight: '100vh', color: COLORS.textDark }}>
      
      {/* Statuszeile */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px', padding: '0 5px' }}>
        <span>👤 Zeugmeister: <strong style={{ color: COLORS.textDark }}>{currentBetreuer}</strong></span>
        <button onClick={() => setCurrentBetreuer('')} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Wechseln</button>
      </div>

      {/* Haupt-Navigationsleiste */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: COLORS.primaryRed, padding: '6px', borderRadius: '10px' }}>
        <button onClick={() => { setView('cadetten'); setSelectedCadett(null); }} style={{ flex: 1, padding: '10px', background: view === 'cadetten' ? COLORS.pureWhite : 'transparent', color: view === 'cadetten' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ flex: 1, padding: '10px', background: view === 'inventar' ? COLORS.pureWhite : 'transparent', color: view === 'inventar' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Lagerbestand</button>
        <button onClick={() => setView('logs')} style={{ flex: 1, padding: '10px', background: view === 'logs' ? COLORS.pureWhite : 'transparent', color: view === 'logs' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>📋 Protokoll</button>
      </div>

      {/* TAB A: CADETTEN - HAUPTLISTE */}
      {view === 'cadetten' && !selectedCadett && (
        <div>
          <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px' }}>Neuen Cadetten eintragen</h3>
          <form onSubmit={handleAddCadett} style={{ display: 'flex', gap: '8px', marginBottom: '25px', marginTop: '10px' }}>
            <input type="text" placeholder="Vorname" value={newVorname} onChange={e => setNewVorname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` }} />
            <input type="text" placeholder="Nachname" value={newNachname} onChange={e => setNewNachname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` }} />
            <button type="submit" style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold' }}>+</button>
          </form>

          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Aktive Cadetten</h3>
          {cadetten.map(c => (
            <div key={c.id} onClick={() => setSelectedCadett(c)} style={{ background: COLORS.pureWhite, padding: '14px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', borderLeft: `4px solid ${COLORS.primaryRed}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px' }}>{c.vorname} {c.nachname}</strong>
                <div style={{ fontSize: '12px', color: COLORS.textMuted }}>Ausrüstung: <span style={{ fontWeight: 'bold', color: COLORS.primaryRed }}>{getAusstattungsStatus(c.id)}</span></div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', background: c.dsgvo_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.dsgvo_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>DSGVO</span>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', background: c.empfang_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.empfang_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>Quittung</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB A-DET: CADETTEN - DETAILANSICHT */}
      {view === 'cadetten' && selectedCadett && (
        <div style={{ background: COLORS.pureWhite, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          
          {/* NEU (PUNKT 6): FIXED / STICKY HEADER - BLEIBT OBEN AM DISPLAYRAND FIXIERT BEIM SCROLLEN */}
          <div style={{ position: 'sticky', top: 0, backgroundColor: COLORS.pureWhite, borderBottom: `1px solid ${COLORS.borderLight}`, padding: '15px 20px', zIndex: 100, boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}>
            
            {/* Header-Aktionszeile */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>← Übersicht</button>
              
              {/* NEU (PUNKT 2): BLÄTTER-NAVIGATIONSBUTTONS (ZUM NÄCHSTEN/VORHERIGEN KIND) */}
              <div style={{ display: 'flex', gap: '5px', background: COLORS.appBackground, padding: '2px', borderRadius: '6px' }}>
                <button onClick={() => handleNavigateCadett(-1)} style={{ background: COLORS.pureWhite, border: `1px solid ${COLORS.borderLight}`, borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }} title="Vorheriges Kind">◀</button>
                <button onClick={() => handleNavigateCadett(1)} style={{ background: COLORS.pureWhite, border: `1px solid ${COLORS.borderLight}`, borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }} title="Nächstes Kind">▶</button>
              </div>

              <button onClick={() => handleDeletetCadett(selectedCadett)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: '12px' }}>🗑️ Löschen</button>
            </div>
            
            {/* Namen-Anzeige / Bearbeitung direkt im fixierten Header */}
            {!isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: COLORS.primaryRed, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCadett.vorname} {selectedCadett.nachname}</h2>
                <button 
                  onClick={() => { 
                    setEditVorname(selectedCadett.vorname); 
                    setEditNachname(selectedCadett.nachname); 
                    setIsEditingName(true); 
                  }} 
                  style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: '14px' }}
                >
                  ✏️
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '5px', background: COLORS.appBackground, borderRadius: '6px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" value={editVorname} onChange={e => setEditVorname(e.target.value)} style={{ flex: 1, padding: '5px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }} placeholder="Vorname" />
                  <input type="text" value={editNachname} onChange={e => setEditNachname(e.target.value)} style={{ flex: 1, padding: '5px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }} placeholder="Nachname" />
                </div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsEditingName(false)} style={{ padding: '2px 8px', fontSize: '11px', background: 'none', border: `1px solid ${COLORS.borderLight}`, borderRadius: '4px', cursor: 'pointer' }}>Abbrechen</button>
                  <button type="submit" style={{ padding: '2px 8px', fontSize: '11px', background: COLORS.statusGreen, color: COLORS.pureWhite, border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Speichern</button>
                </div>
              </form>
            )}
          </div>

          {/* Innerer Scroll-Inhalt der Detailansicht */}
          <div style={{ padding: '20px' }}>
            
            {/* Status-Haken Checkboxen */}
            <div style={{ background: '#F7FAFC', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: `1px solid ${COLORS.borderLight}` }}>
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
                  <div style={{ fontSize: '11px', color: COLORS.textMuted }}>Eltern haben den Erhalt digital bestätigt</div>
                </div>
                <input type="checkbox" checked={selectedCadett.empfang_bestaetigt || false} onChange={() => toggleEmpfang(selectedCadett)} style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: COLORS.statusGreen }} />
              </div>
            </div>

            {/* Freitext-Kommentarfeld */}
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, textTransform: 'uppercase' }}>✍️ Interne Notizen / Kommentare:</label>
              <textarea 
                value={kommentarText} 
                onChange={e => {
                  setKommentarText(e.target.value);
                  setKommentarGespeichert(false); 
                }} 
                placeholder="Besonderheiten eintragen... (z.B. Jacke gekürzt, etc.)"
                style={{ width: '100%', minHeight: '60px', padding: '8px', boxSizing: 'border-box', borderRadius: '6px', border: `1px solid ${kommentarGespeichert ? COLORS.borderLight : COLORS.warningOrange}`, fontSize: '13px', fontFamily: 'sans-serif', resize: 'vertical' }}
              />
              {!kommentarGespeichert && (
                <button 
                  onClick={handleSaveKommentar} 
                  style={{ alignSelf: 'flex-end', background: COLORS.warningOrange, color: COLORS.pureWhite, border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Notiz speichern
                </button>
              )}
            </div>

            {/* Kleiderliste */}
            <h3 style={{ fontSize: '13px', marginBottom: '10px', textTransform: 'uppercase', color: COLORS.textMuted }}>Soll-Ausstattung</h3>
            {SOLL_KATEGORIEN.map(kat => {
              const geliehen = ausgaben.find(a => a.kategorie_soll === kat);
              const istNichtBenoetigt = geliehen && geliehen.status_nicht_benoetigt;
              const istSelbstBeschafft = geliehen && geliehen.selbst_beschafft; 

              return (
                <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                  <div>
                    <span style={{ marginRight: '10px' }}>{geliehen ? '🔴' : '⚪'}</span>
                    <strong style={{ fontSize: '14px' }}>{kat}</strong>
                    
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
            
            {/* Beleg teilen via WhatsApp oder Download */}
            <button onClick={() => generateAndSharePDF(selectedCadett, ausgaben)} style={{ width: '100%', marginTop: '25px', background: istVollstaendigBestaetigt ? COLORS.textDark : COLORS.warningOrange, color: COLORS.pureWhite, border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <span>{istVollstaendigBestaetigt ? '🟢 Beleg via WhatsApp senden' : '⚠️ Beleg senden (Haken fehlen!)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB B: LAGERBESTAND */}
      {view === 'inventar' && (
        <div>
          <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px' }}>Neues Uniformteil erfassen</h3>
          <form onSubmit={handleAddInventar} style={{ background: COLORS.pureWhite, padding: '12px', borderRadius: '8px', marginBottom: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select value={newArtikelKat} onChange={e => setNewArtikelKat(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px' }}>
                {SOLL_KATEGORIEN.map(kat => <option key={kat} value={kat}>{kat}</option>)}
              </select>
              <input type="text" placeholder="Größe (z.B. M)" value={newGroesse} onChange={e => setNewGroesse(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px' }} />
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
          
          <div style={{ background: COLORS.pureWhite, padding: '12px', borderRadius: '8px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Kategorie</label>
              <select value={lagerFilter} onChange={e => setLagerFilter(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, fontSize: '13px', fontWeight: 'bold' }}>
                <option value="Alle">Alle Kategorien</option>
                {SOLL_KATEGORIEN.map(kat => <option key={kat} value={kat}>{kat}n</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Größe</label>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '3px' }}>
                {existierendeGroessen.map(g => {
                  const istAktiv = groessenFilter === g;
                  return (
                    <button key={g} type="button" onClick={() => setGroessenFilter(g)} style={{ padding: '5px 12px', borderRadius: '4px', border: istAktiv ? 'none' : `1px solid ${COLORS.borderLight}`, background: istAktiv ? COLORS.primaryRed : COLORS.appBackground, color: istAktiv ? COLORS.pureWhite : COLORS.textDark, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {g === 'Alle' ? 'Alle' : g}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Zustand</label>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '3px' }}>
                {existierendeZustaende.map(z => {
                  const istAktiv = zustandFilter === z;
                  return (
                    <button key={z} type="button" onClick={() => setZustandFilter(z)} style={{ flex: 1, minWidth: '60px', padding: '5px 8px', borderRadius: '4px', border: istAktiv ? 'none' : `1px solid ${COLORS.borderLight}`, background: istAktiv ? COLORS.textDark : COLORS.appBackground, color: istAktiv ? COLORS.pureWhite : COLORS.textDark, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {z === 'Alle' ? 'Alle' : z}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div style={{ maxHeight: '45vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px' }}>
            {inventar
              .filter(item => {
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
                    <span style={{ color: item.status === 'Frei' || item.status === 'Free' ? COLORS.statusGreen : COLORS.primaryRed, fontWeight: 'bold', fontSize: '12px' }}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.textMuted, marginLeft: '45px' }}>
                    {item.groesse && <span style={{ marginRight: '10px' }}>📏 Gr: {item.groesse}</span>}
                    {item.zustand && <span>✨ {item.zustand}</span>}
                  </div>
                </div>
              ))}

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

      {/* TAB C: REVISIONSLOGS */}
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

      {/* MODAL: KLEIDUNG AUSGEBEN */}
      {showAusgabeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '350px' }}>
            <h3 style={{ marginTop: 0, color: COLORS.primaryRed }}>{activeKategorie} ausgeben</h3>
            
            <select value={selectedTeilId} onChange={e => setSelectedTeilId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '18px' }}>
              <option value="">-- Lagerstück wählen --</option>
              {freieTeileFuerKategorie.map(i => <option key={i.id} value={i.id}>ID: {i.id} {i.groesse ? `(Gr. ${i.groesse})` : ''}</option>)}
            </select>
            
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