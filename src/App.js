import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Package, FileText, Check, X, Plus, Trash2, Download, History, User } from 'lucide-react';
import { jsPDF } from 'jspdf';

const SOLL_KATEGORIEN = ['Barret', 'Koppel', 'Uniformjacke', 'Mantel', 'Rock'];
const BETREUER_LISTE = ['Matthias', 'Sarah', 'Aurelia', 'Thomas', 'Christian']; // Hier deine 5 Namen eintragen!

export default function App() {
  const [view, setView] = useState('cadetten'); // 'cadetten', 'inventar', 'logs'
  const [currentBetreuer, setCurrentBetreuer] = useState(localStorage.getItem('active_betreuer') || '');
  
  const [cadetten, setCadetten] = useState([]);
  const [selectedCadett, setSelectedCadett] = useState(null);
  const [inventar, setInventar] = useState([]);
  const [allAusgaben, setAllAusgaben] = useState([]);
  const [ausgaben, setAusgaben] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Modaler Zustand für die Ausgabe
  const [showAusgabeModal, setShowAusgabeModal] = useState(false);
  const [activeKategorie, setActiveKategorie] = useState('');
  const [selectedTeilId, setSelectedTeilId] = useState('');

  // Formular-States
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

  // Funktion zum Speichern eines Log-Eintrags
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
    const { error } = await supabase.from('cadetten').insert([{ vorname: newVorname, nachname: newNachname }]);
    if (!error) {
      logAction("Cadett angelegt", `Hat ${newVorname} ${newNachname} im Register hinzugefügt.`);
      setNewVorname('');
      setNewNachname('');
      fetchCadetten();
    }
  }

  async function toggleDSGVO(cadett) {
    const { error } = await supabase.from('cadetten').update({ dsgvo_bestaetigt: !cadett.dsgvo_bestaetigt }).eq('id', cadett.id);
    if (!error) {
      logAction("DSGVO geändert", `Status für ${cadett.vorname} ${cadett.nachname} auf ${!cadett.dsgvo_bestaetigt ? 'JA' : 'NEIN'} gesetzt.`);
      fetchCadetten();
      setSelectedCadett({ ...cadett, dsgvo_bestaetigt: !cadett.dsgvo_bestaetigt });
    }
  }

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

      setShowAusgabeModal(false);
      setSelectedTeilId('');
      fetchAusgaben(selectedCadett.id);
      fetchInventar();
      fetchAllAusgaben();
    }
  }

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

  function generatePDF(cadett, aktuelleAusgaben) {
    const doc = new jsPDF();
    doc.setFont("Helvetica", "bold"); doc.setFontSize(22); doc.text("Beleg: Uniformen-Ausgabe", 20, 25);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Cadett: ${cadett.vorname} ${cadett.nachname}`, 20, 40);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 47);
    doc.setLineWidth(0.5); doc.line(20, 53, 190, 53);
    doc.setFont("Helvetica", "bold"); doc.text("Ausstattungs-Status:", 20, 63);
    doc.setFont("Helvetica", "normal"); let yPos = 73;
    
    SOLL_KATEGORIEN.forEach((kat) => {
      const geliehen = aktuelleAusgaben.find(a => a.kategorie_soll === kat);
      if (geliehen) {
        if (geliehen.anmerkung_ausgabe === 'Nicht benötigt') doc.text(`[-] ${kat}: Wird nicht benötigt`, 25, yPos);
        else if (geliehen.selbst_beschafft) doc.text(`[X] ${kat}: Selbst beschafft (Eigentum)`, 25, yPos);
        else {
          const info = inventar.find(i => i.id === geliehen.inventar_id);
          doc.text(`[X] ${kat}: Vereinslager ID: ${geliehen.inventar_id}${info?.groesse ? ` (Gr. ${info.groesse})` : ''}`, 25, yPos);
        }
      } else doc.text(`[ ] ${kat}: Offen / Noch nicht ausgegeben`, 25, yPos);
      yPos += 9;
    });
    
    yPos += 8; doc.setFont("Helvetica", "bold"); doc.text("Rechtliche Einverständniserklärung & Miete:", 20, yPos);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(9);
    const rechtstext = "Mit der Bestätigung im System (DSGVO OK) willigen die Erziehungsberechtigten ein, dass die personenbezogenen Daten des Kindes intern zur Uniformverwaltung digital gespeichert werden. Die Uniformen-Miete beträgt pauschal 150,00 € pro Saison.";
    doc.text(doc.splitTextToSize(rechtstext, 170), 20, yPos + 6);
    doc.setFontSize(11); doc.text(`Sammelbestätigung erteilt: ${cadett.dsgvo_bestaetigt ? 'JA (System hinterlegt)' : 'NEIN'}`, 20, yPos + 30);
    
    logAction("PDF generiert", `Beleg-PDF für ${cadett.vorname} ${cadett.nachname} aufgerufen.`);
    doc.output('dataurlnewwindow');
  }

  function getAusstattungsStatus(cadettId) {
    return `${allAusgaben.filter(a => a.cadetten_id === cadettId).length} / ${SOLL_KATEGORIEN.length}`;
  }

  // Login-Screen erzwingen, wenn kein Betreuer ausgewählt ist
  if (!currentBetreuer) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: '40px 20px', maxWidth: '400px', margin: '100px auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h2 style={{ color: '#1e3a8a', marginBottom: '10px' }}>🛡️ Zeugmeister Login</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '25px' }}>Bitte wähle deinen Namen aus, um die App auf diesem Gerät freizuschalten.</p>
        {BETREUER_LISTE.map(name => (
          <button key={name} onClick={() => handleBetreuerLogin(name)} style={{ width: '100%', padding: '12px', marginBottom: '10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', color: '#374151', cursor: 'pointer' }}>{name}</button>
        ))}
      </div>
    );
  }

  const freieTeileFuerKategorie = inventar.filter(i => i.artikel === activeKategorie && i.status === 'Frei');

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      {/* Betreuer Info-Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#4b5563', marginBottom: '10px', padding: '0 5px' }}>
        <span>👤 Aktiver Nutzer: <strong>{currentBetreuer}</strong></span>
        <button onClick={() => setCurrentBetreuer('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>Wechseln</button>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: '#1e3a8a', padding: '8px', borderRadius: '8px' }}>
        <button onClick={() => { setView('cadetten'); setSelectedCadett(null); }} style={{ flex: 1, padding: '10px', background: view === 'cadetten' ? '#fff' : 'transparent', color: view === 'cadetten' ? '#1e3a8a' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ flex: 1, padding: '10px', background: view === 'inventar' ? '#fff' : 'transparent', color: view === 'inventar' ? '#1e3a8a' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Lager</button>
        <button onClick={() => setView('logs')} style={{ flex: 1, padding: '10px', background: view === 'logs' ? '#fff' : 'transparent', color: view === 'logs' ? '#1e3a8a' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>📋 Log</button>
      </div>

      {view === 'cadetten' && !selectedCadett && (
        <div>
          <h3>Neuen Cadetten anlegen</h3>
          <form onSubmit={handleAddCadett} style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
            <input type="text" placeholder="Vorname" value={newVorname} onChange={e => setNewVorname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Nachname" value={newNachname} onChange={e => setNewNachname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
          </form>

          <h3>Aktive Cadetten (A-Z)</h3>
          {cadetten.map(c => (
            <div key={c.id} onClick={() => setSelectedCadett(c)} style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '16px', color: '#1f2937' }}>{c.vorname} {c.nachname}</strong>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Ausstattung: <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{getAusstattungsStatus(c.id)}</span> Teile</div>
              </div>
              <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', background: c.dsgvo_bestaetigt ? '#d1fae5' : '#fee2e2', color: c.dsgvo_bestaetigt ? '#065f46' : '#991b1b' }}>
                {c.dsgvo_bestaetigt ? 'Bestätigt' : 'Offen'}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === 'cadetten' && selectedCadett && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginBottom: '15px', fontWeight: 'bold' }}>← Zurück</button>
          <h2 style={{ margin: '0 0 15px 0' }}>{selectedCadett.vorname} {selectedCadett.nachname}</h2>

          <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 10px 0', lineHeight: '1.4' }}>
              <strong>Sammelerklärung der Eltern:</strong> Ich willige in die digitale Speicherung ein und bestätige den Erhalt aller unten abgehakten Uniformteile, inklusive Miete (150 €).
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: selectedCadett.dsgvo_bestaetigt ? '#16a34a' : '#d97706' }}>
                {selectedCadett.dsgvo_bestaetigt ? '✅ Einverständnis erteilt' : '⚠️ Noch nicht bestätigt'}
              </span>
              <input type="checkbox" checked={selectedCadett.dsgvo_bestaetigt} onChange={() => toggleDSGVO(selectedCadett)} style={{ width: '22px', height: '22px', cursor: 'pointer' }} />
            </div>
          </div>

          <h3>Soll-Ausstattung Checkliste</h3>
          {SOLL_KATEGORIEN.map(kat => {
            const geliehen = ausgaben.find(a => a.kategorie_soll === kat);
            return (
              <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <span style={{ marginRight: '10px' }}>{geliehen ? (geliehen.anmerkung_ausgabe === 'Nicht benötigt' ? '➖' : '✅') : '⬜'}</span>
                  <strong>{kat}</strong>
                  {geliehen && !geliehen.selbst_beschafft && !geliehen.anmerkung_ausgabe && <span style={{ marginLeft: '5px', color: '#4b5563', fontSize: '13px' }}>({geliehen.inventar_id})</span>}
                  {geliehen && geliehen.selbst_beschafft && <span style={{ marginLeft: '5px', color: '#16a34a', fontSize: '13px' }}>(Selbst)</span>}
                </div>
                <div>
                  {geliehen ? (
                    <button onClick={() => handleRueckgabe(geliehen.id, kat, geliehen.inventar_id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Rückgabe</button>
                  ) : (
                    <button onClick={() => { setActiveKategorie(kat); setShowAusgabeModal(true); }} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Ausgeben</button>
                  )}
                </div>
              </div>
            );
          })}
          <button onClick={() => generatePDF(selectedCadett, ausgaben)} style={{ width: '100%', marginTop: '25px', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>📄 PDF Beleg öffnen</button>
        </div>
      )}

      {view === 'inventar' && (
        <div>
          <h3>Lagerbestand ({inventar.length} Teile)</h3>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', background: '#fff', padding: '10px', borderRadius: '8px' }}>
            {inventar.map(item => (
              <div key={item.id} style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <div><span style={{ fontFamily: 'monospace', background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', fontWeight: 'bold' }}>{item.id}</span><strong>{item.artikel}</strong>{item.groesse && <span style={{ color: '#9ca3af', marginLeft: '5px' }}>Gr. {item.groesse}</span>}</div>
                <span style={{ color: item.status === 'Frei' ? '#16a34a' : '#ea580c', fontWeight: 'bold' }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEUER TAB: HISTORIE / LOGS */}
      {view === 'logs' && (
        <div>
          <h3>📋 Änderungshistorie (Letzte 50 Aktionen)</h3>
          <div style={{ maxHeight: '75vh', overflowY: 'auto', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {logs.length === 0 ? <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>Noch keine Aktionen protokolliert.</p> : 
              logs.map(log => (
                <div key={log.id} style={{ padding: '10px 5px', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>👤 {log.betreuer}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(log.created_at).toLocaleString('de-DE')}</span>
                  </div>
                  <div style={{ fontWeight: '600', color: '#374151' }}>🔹 {log.aktion}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>{log.details}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* MODAL FÜR AUSGABE */}
      {showAusgabeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '360px' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>{activeKategorie} ausgeben</h3>
            <select value={selectedTeilId} onChange={e => setSelectedTeilId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '18px' }}>
              <option value="">-- Teil wählen --</option>
              {freieTeileFuerKategorie.map(i => <option key={i.id} value={i.id}>{i.id} {i.groesse ? `(Gr. ${i.groesse})` : ''}</option>)}
            </select>
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'lager')} disabled={!selectedTeilId} style={{ width: '100%', padding: '11px', background: selectedTeilId ? '#2563eb' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '6px', marginBottom: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Aus Lager zuweisen</button>
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'selbst')} style={{ width: '100%', padding: '11px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', marginBottom: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Als "Selbst beschafft" eintragen</button>
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, 'nicht_benoetigt')} style={{ width: '100%', padding: '11px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', marginBottom: '18px', fontWeight: 'bold', cursor: 'pointer' }}>Für dieses Kind nicht benötigt</button>
            <button onClick={() => setShowAusgabeModal(false)} style={{ width: '100%', padding: '10px', background: '#fff', color: '#4b5563', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}