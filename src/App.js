import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Package, FileText, Check, X, Plus, Trash2, Download, History, User } from 'lucide-react';
import { jsPDF } from 'jspdf';

// --- SYSTEMKONFIGURATION ---
const SOLL_KATEGORIEN = ['Barret', 'Koppel', 'Uniformjacke', 'Mantel', 'Rock'];
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
  // --- STATE-MANAGEMENT ---
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

  function handleBetreuerLogin(name) {
    localStorage.setItem('active_betreuer', name);
    setCurrentBetreuer(name);
  }

  async function handleAddCadett(e) {
    e.preventDefault(); 
    if (!newVorname || !newNachname) return; 
    
    // Spalte 'empfang_bestaetigt' wird jetzt sauber miterzeugt
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

  // =========================================================
  // BEHOBEN: DIE ÜBERGABE-ANZEIGE SPEICHERT & AKTUALISIERT JETZT KORREKT
  // =========================================================
  async function toggleEmpfang(cadett) {
    if (cadett.empfang_bestaetigt) {
      const cancel = window.confirm("Möchtest du die Empfangsbestätigung wirklich zurücksetzen?");
      if (!cancel) return;
    }

    const neuerStatus = !cadett.empfang_bestaetigt;
    
    // Feuert gegen die neue Spalte 'empfang_bestaetigt' in der Datenbank
    const { error } = await supabase.from('cadetten').update({ empfang_bestaetigt: neuerStatus }).eq('id', cadett.id);
    
    if (!error) {
      logAction(neuerStatus ? "Empfang quittiert" : "Empfang storniert", `Erziehungsberechtigte von ${cadett.vorname} ${cadett.nachname} haben den Erhalt digital bestätigt.`);
      
      await fetchCadetten();
      
      // Zustand des ausgewählten Kindes explizit erzwingen, damit UI sofort reagiert
      setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: neuerStatus }));
    } else {
      alert(`Fehler beim Aktualisieren der Quittung: ${error.message}\n(Bitte prüfe, ob die Spalte in Supabase existiert und der API-Cache neu geladen wurde!)`);
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

  // =========================================================
  // NEU: ANPASSUNG BEI AUSGABE -> ENTFERNT AUTOMATISCH DEN ELTERNHAKEN
  // =========================================================
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

    // Da sich die Ausstattung geändert hat, setzen wir die Quittung in der DB zurück
    await supabase.from('cadetten').update({ empfang_bestaetigt: false }).eq('id', selectedCadett.id);

    // Zustand im UI synchronisieren
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
    fetchCadetten(); // Lädt die Hauptliste neu, damit der Quittungs-Status dort stimmt
    fetchAllAusgaben();
  }

  // =========================================================
  // NEU: ANPASSUNG BEI RÜCKGABE -> ENTFERNT AUTOMATISCH DEN ELTERNHAKEN
  // =========================================================
  async function handleRueckgabe(ausgabeId, kategorie, inventarId) {
    const bestaetigung = window.confirm(`Möchtest du das Teil für "${kategorie}" wirklich als zurückgegeben markieren?`);
    if (!bestaetigung) return;

    const { error } = await supabase.from('ausgaben').delete().eq('id', ausgabeId);
    
    if (!error) {
      // Auch bei Rückgabe/Änderung erlischt die Gültigkeit der alten Quittung
      await supabase.from('cadetten').update({ empfang_bestaetigt: false }).eq('id', selectedCadett.id);

      // Zustand im UI synchronisieren
      setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: false }));

      await logAction("Teil zurückgegeben", `Rückgabe von ${selectedCadett.vorname}: ${kategorie} - Eltern-Quittung wurde automatisch storniert.`);
      
      fetchAusgaben(selectedCadett.id);
      fetchInventar();
      fetchCadetten(); 
      fetchAllAusgaben();
    }
  }

  function generatePDF(cadett, aktuelleAusgaben) {
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
    doc.text(`🔒 Datenschutz (DSGVO): ${cadett.dsgvo_bestaetigt ? 'ERTEILT (Digital hinterlegt)' : 'OFFEN / AUSSTEHEND'}`, 20, yPos + 25);
    doc.text(`✍️ Übergabe-Quittung Eltern: ${cadett.empfang_bestaetigt ? 'BESTÄTIGT (Vor Ort digital autorisiert)' : 'OFFEN / AUSSTEHEND'}`, 20, yPos + 32);
    
    logAction("PDF generiert", `Beleg-PDF für ${cadett.vorname} ${cadett.nachname} aufgerufen.`);
    doc.output('dataurlnewwindow');
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

  const freieTeileFuerKategorie = inventar.filter(i => i.artikel === activeKategorie && i.status === 'Frei');
  const istVollstaendigBestaetigt = selectedCadett?.dsgvo_bestaetigt && selectedCadett?.empfang_bestaetigt;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '480px', margin: '0 auto', backgroundColor: COLORS.appBackground, minHeight: '100vh', color: COLORS.textDark }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px', padding: '0 5px' }}>
        <span>👤 Zeugmeister: <strong style={{ color: COLORS.textDark }}>{currentBetreuer}</strong></span>
        <button onClick={() => setCurrentBetreuer('')} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Wechseln</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: COLORS.primaryRed, padding: '6px', borderRadius: '10px' }}>
        <button onClick={() => { setView('cadetten'); setSelectedCadett(null); }} style={{ flex: 1, padding: '10px', background: view === 'cadetten' ? COLORS.pureWhite : 'transparent', color: view === 'cadetten' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ flex: 1, padding: '10px', background: view === 'inventar' ? COLORS.pureWhite : 'transparent', color: view === 'inventar' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Lagerbestand</button>
        <button onClick={() => setView('logs')} style={{ flex: 1, padding: '10px', background: view === 'logs' ? COLORS.pureWhite : 'transparent', color: view === 'logs' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>📋 Protokoll</button>
      </div>

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

      {view === 'cadetten' && selectedCadett && (
        <div style={{ background: COLORS.pureWhite, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>← Übersicht</button>
            <button onClick={() => handleDeletetCadett(selectedCadett)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>🗑️ Kind löschen</button>
          </div>
          
          <h2 style={{ margin: '15px 0 4px 0', color: COLORS.primaryRed }}>{selectedCadett.vorname} {selectedCadett.nachname}</h2>

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

          <h3 style={{ fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', color: COLORS.textMuted }}>Soll-Ausstattung</h3>
          {SOLL_KATEGORIEN.map(kat => {
            const geliehen = ausgaben.find(a => a.kategorie_soll === kat);
            const istNichtBenoetigt = geliehen && geliehen.status_nicht_benoetigt;
            const istSelbstBeschafft = geliehen && geliehen.selbst_beschafft; 

            return (
              <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <div>
                  <span style={{ marginRight: '10px' }}>{geliehen ? '🔴' : '⚪'}</span>
                  <strong style={{ fontSize: '14px' }}>{kat}</strong>
                  
                  {/* ========================================================= */}
                  {/* BEHOBEN: TEXTANZEIGE UND BUTTONS FÜR SELBST BESCHAFFT */}
                  {/* ========================================================= */}
                  {geliehen && !istSelbstBeschafft && !istNichtBenoetigt && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px' }}>[ID: {geliehen.inventar_id}]</span>}
                  {istNichtBenoetigt && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px', fontStyle: 'italic' }}>(Nicht benötigt)</span>}
                  {/* Zeigt nun auch textuell an, dass die Ausrüstung privat vorhanden ist */}
                  {istSelbstBeschafft && <span style={{ marginLeft: '6px', color: COLORS.textMuted, fontSize: '11px', fontStyle: 'italic' }}>(Selbst beschafft)</span>}
                </div>
                <div>
                  {geliehen ? (
                    <button onClick={() => handleRueckgabe(geliehen.id, kat, geliehen.inventar_id)} style={{ background: '#FFF5F5', color: COLORS.primaryRed, border: `1px solid ${COLORS.primaryRed}`, padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                      {/* Ändert den Button-Text bei 'Selbst beschafft' zu 'Ändern' anstatt 'Rückgabe' */}
                      {istNichtBenoetigt || istSelbstBeschafft ? 'Ändern' : 'Rückgabe'}
                    </button>
                  ) : (
                    <button onClick={() => { setActiveKategorie(kat); setShowAusgabeModal(true); }} style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Ausgeben</button>
                  )}
                </div>
              </div>
            );
          })}
          
          <button onClick={() => generatePDF(selectedCadett, ausgaben)} style={{ width: '100%', marginTop: '25px', background: istVollstaendigBestaetigt ? COLORS.textDark : COLORS.warningOrange, color: COLORS.pureWhite, border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            {istVollstaendigBestaetigt ? '📄 PDF Beleg erzeugen (Alles OK)' : '⚠️ PDF erzeugen (Haken fehlen noch!)'}
          </button>
        </div>
      )}

      {view === 'inventar' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Lagerbestand ({inventar.length} Teile)</h3>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', background: COLORS.pureWhite, padding: '8px', borderRadius: '8px' }}>
            {inventar.map(item => (
              <div key={item.id} style={{ padding: '10px', borderBottom: `1px solid ${COLORS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <div><span style={{ fontSize: '11px', background: COLORS.appBackground, padding: '2px 6px', marginRight: '8px' }}>{item.id}</span><strong>{item.artikel}</strong></div>
                <span style={{ color: item.status === 'Free' || item.status === 'Frei' ? COLORS.statusGreen : COLORS.primaryRed, fontWeight: 'bold', fontSize: '12px' }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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