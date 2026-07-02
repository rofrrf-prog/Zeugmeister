import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Package, FileText, Check, X, Plus, Trash2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

const SOLL_KATEGORIEN = ['Barret', 'Koppel', 'Uniformjacke', 'Mantel', 'Rock'];

export default function App() {
  const [view, setView] = useState('cadetten');
  const [cadetten, setCadetten] = useState([]);
  const [selectedCadett, setSelectedCadett] = useState(null);
  const [inventar, setInventar] = useState([]);
  const [ausgaben, setAusgaben] = useState([]);
  
  // Modaler Zustand für die Ausgabe
  const [showAusgabeModal, setShowAusgabeModal] = useState(false);
  const [activeKategorie, setActiveKategorie] = useState('');
  const [selectedTeilId, setSelectedTeilId] = useState('');

  // Formular-States
  const [newVorname, setNewVorname] = useState('');
  const [newNachname, setNewNachname] = useState('');

  useEffect(() => {
    fetchCadetten();
    fetchInventar();
  }, []);

  useEffect(() => {
    if (selectedCadett) {
      fetchAusgaben(selectedCadett.id);
    }
  }, [selectedCadett]);

  async function fetchCadetten() {
    const { data, error } = await supabase
      .from('cadetten')
      .select('*')
      .order('vorname', { ascending: true });
    if (!error) setCadetten(data);
  }

  async function fetchInventar() {
    const { data, error } = await supabase.from('inventar').select('*');
    if (!error) setInventar(data);
  }

  async function fetchAusgaben(cadettId) {
    const { data, error } = await supabase
      .from('ausgaben')
      .select('*')
      .eq('cadetten_id', cadettId);
    if (!error) setAusgaben(data);
  }

  async function handleAddCadett(e) {
    e.preventDefault();
    if (!newVorname || !newNachname) return;
    const { error } = await supabase
      .from('cadetten')
      .insert([{ vorname: newVorname, nachname: newNachname }]);
    if (!error) {
      setNewVorname('');
      setNewNachname('');
      fetchCadetten();
    }
  }

  async function toggleDSGVO(cadett) {
    const { error } = await supabase
      .from('cadetten')
      .update({ dsgvo_bestaetigt: !cadett.dsgvo_bestaetigt })
      .eq('id', cadett.id);
    if (!error) {
      fetchCadetten();
      setSelectedCadett({ ...cadett, dsgvo_bestaetigt: !cadett.dsgvo_bestaetigt });
    }
  }

  // Teil ausgeben oder als selbst beschafft markieren
  async function handleAusgabeSpeichern(kategorie, selbstBeschafft = false) {
    if (!selbstBeschafft && !selectedTeilId) return;

    const { error } = await supabase
      .from('ausgaben')
      .insert([{
        cadetten_id: selectedCadett.id,
        inventar_id: selbstBeschafft ? null : selectedTeilId,
        kategorie_soll: kategorie,
        selbst_beschafft: selbstBeschafft
      }]);

    if (!error) {
      setShowAusgabeModal(false);
      setSelectedTeilId('');
      fetchAusgaben(selectedCadett.id);
      fetchInventar();
    } else {
      alert("Fehler bei der Ausgabe: " + error.message);
    }
  }

  // Rückgabe abwickeln (Ausgabe-Eintrag löschen)
  async function handleRueckgabe(ausgabeId) {
    const { error } = await supabase
      .from('ausgaben')
      .delete()
      .eq('id', ausgabeId);

    if (!error) {
      fetchAusgaben(selectedCadett.id);
      fetchInventar();
    }
  }

  // PDF Generierung (WhatsApp-Ready)
  function generatePDF(cadett, aktuelleAusgaben) {
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Beleg: Uniformen-Ausgabe", 20, 25);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Cadett: ${cadett.vorname} ${cadett.nachname}`, 20, 40);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 47);
    
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
    
    doc.setFont("Helvetica", "bold");
    doc.text("Ausgeliehene Uniformteile:", 20, 65);
    
    doc.setFont("Helvetica", "normal");
    let yPos = 75;
    
    SOLL_KATEGORIEN.forEach((kat) => {
      const geliehen = aktuelleAusgaben.find(a => a.kategorie_soll === kat);
      if (geliehen) {
        if (geliehen.selbst_beschafft) {
          doc.text(`[X] ${kat}: Selbst beschafft`, 25, yPos);
        } else {
          const info = inventar.find(i => i.id === geliehen.inventar_id);
          const groesseText = info && info.groesse ? ` (Gr. ${info.groesse})` : '';
          doc.text(`[X] ${kat}: ID: ${geliehen.inventar_id}${groesseText}`, 25, yPos);
        }
      } else {
        doc.text(`[ ] ${kat}: Nicht ausgegeben`, 25, yPos);
      }
      yPos += 10;
    });
    
    yPos += 10;
    doc.setFont("Helvetica", "bold");
    doc.text("Hinweis zur Uniformen-Miete:", 20, yPos);
    doc.setFont("Helvetica", "normal");
    doc.text("Die Uniformen-Miete beträgt pauschal 150,00 € pro Saison.", 20, yPos + 7);
    
    // Direkt im Browser öffnen (mobil triggert das den Teilen/Download Dialog)
    doc.output('dataurlnewwindow');
  }

  // Hilfsfunktionen für Filterung
  const freieTeileFuerKategorie = inventar.filter(i => i.artikel === activeKategorie && i.status === 'Frei');

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      {/* Mini-Navigation */}
      <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '20px', background: '#1e3a8a', padding: '10px', borderRadius: '8px' }}>
        <button onClick={() => { setView('cadetten'); setSelectedCadett(null); }} style={{ flex: 1, padding: '10px', background: view === 'cadetten' ? '#fff' : 'transparent', color: view === 'cadetten' ? '#1e3a8a' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ flex: 1, padding: '10px', background: view === 'inventar' ? '#fff' : 'transparent', color: view === 'inventar' ? '#1e3a8a' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Lager</button>
      </div>

      {view === 'cadetten' && !selectedCadett && (
        <div>
          <h3>Neuen Cadetten anlegen</h3>
          <form onSubmit={handleAddCadett} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="text" placeholder="Vorname" value={newVorname} onChange={e => setNewVorname(e.target.value)} style={{ flex: 1, padding: '8px' }} />
            <input type="text" placeholder="Nachname" value={newNachname} onChange={e => setNewNachname(e.target.value)} style={{ flex: 1, padding: '8px' }} />
            <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '4px' }}>+</button>
          </form>

          <h3>Cadetten Register (A-Z)</h3>
          {cadetten.map(c => (
            <div key={c.id} onClick={() => setSelectedCadett(c)} style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><strong>{c.vorname} {c.nachname}</strong></div>
              <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '10px', background: c.dsgvo_bestaetigt ? '#d1fae5' : '#fee2e2', color: c.dsgvo_bestaetigt ? '#065f46' : '#991b1b' }}>
                {c.dsgvo_bestaetigt ? 'DSGVO OK' : 'DSGVO fehlt'}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === 'cadetten' && selectedCadett && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <button onClick={() => setSelectedCadett(null)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginBottom: '15px' }}>← Zurück</button>
          <h2>{selectedCadett.vorname} {selectedCadett.nachname}</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f9fafb', padding: '10px', borderRadius: '6px', marginBottom: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px' }}>DSGVO & Empfang bestätigt</span>
            <input type="checkbox" checked={selectedCadett.dsgvo_bestaetigt} onChange={() => toggleDSGVO(selectedCadett)} style={{ width: '20px', height: '20px' }} />
          </div>

          <h3>Soll-Ausstattung Checkliste</h3>
          {SOLL_KATEGORIEN.map(kat => {
            const geliehen = ausgaben.find(a => a.kategorie_soll === kat);
            return (
              <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <span style={{ marginRight: '10px' }}>{geliehen ? '✅' : '⬜'}</span>
                  <strong>{kat}</strong>
                  {geliehen && !geliehen.selbst_beschafft && <span style={{ marginLeft: '10px', color: '#4b5563', fontSize: '14px' }}>(ID: {geliehen.inventar_id})</span>}
                  {geliehen && geliehen.selbst_beschafft && <span style={{ marginLeft: '10px', color: '#16a34a', fontSize: '14px' }}>(Selbst beschafft)</span>}
                </div>
                <div>
                  {geliehen ? (
                    <button onClick={() => handleRueckgabe(geliehen.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Rückgabe</button>
                  ) : (
                    <button onClick={() => { setActiveKategorie(kat); setShowAusgabeModal(true); }} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Ausgeben</button>
                  )}
                </div>
              </div>
            );
          })}

          <button onClick={() => generatePDF(selectedCadett, ausgaben)} style={{ width: '100%', marginTop: '25px', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
            📄 PDF generieren (WhatsApp)
          </button>
        </div>
      )}

      {view === 'inventar' && (
        <div>
          <h3>Lagerbestand ({inventar.length} Teile)</h3>
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {inventar.map(item => (
              <div key={item.id} style={{ background: '#fff', padding: '10px', borderRadius: '6px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <div>
                  <span style={{ fontFamily: 'monospace', background: '#e5e7eb', padding: '2px 4px', borderRadius: '3px', marginRight: '5px' }}>{item.id}</span>
                  <strong>{item.artikel}</strong>
                  {item.groesse && <span style={{ color: '#9ca3af', marginLeft: '5px' }}>Gr. {item.groesse}</span>}
                </div>
                <span style={{ color: item.status === 'Frei' ? '#16a34a' : '#ea580c', fontWeight: 'bold' }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL FÜR AUSGABE */}
      {showAusgabeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: '20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', width: '100%', maxWidth: '350px' }}>
            <h3>{activeKategorie} ausgeben</h3>
            
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Verfügbare Teile im Lager:</label>
            <select value={selectedTeilId} onChange={e => setSelectedTeilId(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px' }}>
              <option value="">-- Teil wählen --</option>
              {freieTeileFuerKategorie.map(i => (
                <option key={i.id} value={i.id}>{i.id} {i.groesse ? `(Gr. ${i.groesse})` : ''}</option>
              ))}
            </select>

            <button onClick={() => handleAusgabeSpeichern(activeKategorie, false)} disabled={!selectedTeilId} style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>Aus Lager zuweisen</button>
            <button onClick={() => handleAusgabeSpeichern(activeKategorie, true)} style={{ width: '100%', padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>Als "Selbst beschafft" markieren</button>
            <button onClick={() => setShowAusgabeModal(false)} style={{ width: '100%', padding: '10px', background: '#9ca3af', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}