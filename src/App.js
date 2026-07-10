import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { SOLL_KATEGORIEN, COLORS } from './constants/config';
import { generateAndSharePDF } from './services/pdfService';

// Komponenten importieren
import CadettDetail from './components/CadettDetail';
import AusgabeModal from './components/AusgabeModal';
import InventarTab from './components/InventarTab';
import ProtokollTab from './components/ProtokollTab';

export default function App() {
  const [view, setView] = useState('cadetten'); 
  const [currentBetreuer, setCurrentBetreuer] = useState(''); // Startet jetzt leer
  const [isLoading, setIsLoading] = useState(true); // Verhindert Flackern beim Laden

  // States für das Login-Formular
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Daten-States
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

  // Hilfsfunktion: Wandelt Login-E-Mails in lesbare Namen für das Audit-Log um
  function getBetreuerName(userEmail) {
    if (!userEmail) return 'Unbekannt';
    const emailLower = userEmail.toLowerCase();
    if (emailLower.includes('anja')) return 'Anja';
    if (emailLower.includes('claudia')) return 'Claudia';
    if (emailLower.includes('ro.fr')) return 'Ronny';
    if (emailLower.includes('simone')) return 'Simone';
    if (emailLower.includes('tina')) return 'Tina';
    return userEmail.split('@')[0]; // Fallback, falls eine neue E-Mail hinzugefügt wird
  }

  // AUTOMATISCHER SESSION-CHECK BEIM START
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentBetreuer(getBetreuerName(user.email));
      }
      setIsLoading(false);
    });
  }, []);

  // API-Abfragen (Nur wenn ein Betreuer eingeloggt ist)
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
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    } 
  }, [selectedCadett]);

  // SICHERER LOGIN-HANDLER
  async function handleSichererLogin(e) {
    e.preventDefault();
    setLoginError('');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setLoginError('Falsche E-Mail-Adresse oder Passwort.');
    } else if (data?.user) {
      setCurrentBetreuer(getBetreuerName(data.user.email));
    }
  }

  // LOGOUT-HANDLER
  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentBetreuer('');
    setSelectedCadett(null);
  }

  // Schaltet im Detail-Modus einen Cadetten vor oder zurück (◀ ▶)
  function handleNavigateCadett(dir) { 
    if (!selectedCadett || cadetten.length === 0) return; 
    const idx = cadetten.findIndex(c => c.id === selectedCadett.id); 
    let nIdx = idx + dir; 
    if (nIdx >= cadetten.length) nIdx = 0; 
    if (nIdx < 0) nIdx = cadetten.length - 1; 
    setSelectedCadett(cadetten[nIdx]); 
  }

  // Datenbank-Aktionen (unverändert, nutzt jetzt das fälschungssichere currentBetreuer)
  async function logAction(aktion, details) { await supabase.from('audit_log').insert([{ betreuer: currentBetreuer, aktion, details }]); fetchLogs(); }
  async function fetchCadetten() { const { data } = await supabase.from('cadetten').select('*').order('vorname', { ascending: true }); if (data) setCadetten(data); }
  async function fetchInventar() { const { data } = await supabase.from('inventar').select('*'); if (data) setInventar(data); }
  async function fetchAllAusgaben() { const { data } = await supabase.from('ausgaben').select('*'); if (data) setAllAusgaben(data); }
  async function fetchAusgaben(id) { const { data } = await supabase.from('ausgaben').select('*').eq('cadetten_id', id); if (data) setAusgaben(data); }
  async function fetchLogs() { const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50); if (data) setLogs(data); }

  async function handleAddCadett(e) { e.preventDefault(); if (!newVorname || !newNachname) return; const { error } = await supabase.from('cadetten').insert([{ vorname: newVorname, nachname: newNachname, dsgvo_bestaetigt: false, empfang_bestaetigt: false, kommentar: '' }]); if (!error) { logAction("Cadett angelegt", `Hat ${newVorname} ${newNachname} hinzugefügt.`); setNewVorname(''); setNewNachname(''); fetchCadetten(); } }
  async function handleUpdateName(e) { e.preventDefault(); if (!editVorname.trim() || !editNachname.trim()) return; const { error } = await supabase.from('cadetten').update({ vorname: editVorname.trim(), nachname: editNachname.trim() }).eq('id', selectedCadett.id); if (!error) { logAction("Name korrigiert", `Name geändert zu "${editVorname} ${editNachname}".`); setIsEditingName(false); setSelectedCadett(prev => ({ ...prev, vorname: editVorname.trim(), nachname: editNachname.trim() })); fetchCadetten(); } }
  async function handleSaveKommentar() { const { error } = await supabase.from('cadetten').update({ kommentar: kommentarText }).eq('id', selectedCadett.id); if (!error) { logAction("Kommentar aktualisiert", `Notiz aktualisiert.`); setKommentarGespeichert(true); setSelectedCadett(prev => ({ ...prev, kommentar: kommentarText })); fetchCadetten(); } }
  async function handleAddInventar(e) { e.preventDefault(); if (!newArtikelKat) return; const { error } = await supabase.from('inventar').insert([{ artikel: newArtikelKat, groesse: newGroesse || null, zustand: newZustand, status: 'Frei' }]); if (!error) { logAction("Teil ins Lager gebucht", `${newArtikelKat} hinzugefügt.`); setNewGroesse(''); fetchInventar(); } }
  async function toggleDSGVO(c) { if (c.dsgvo_bestaetigt && !window.confirm(`Genehmigung entfernen?`)) return; const nStat = !c.dsgvo_bestaetigt; const { error } = await supabase.from('cadetten').update({ dsgvo_bestaetigt: nStat }).eq('id', c.id); if (!error) { logAction("DSGVO geändert", `Status geändert.`); fetchCadetten(); setSelectedCadett({ ...c, dsgvo_bestaetigt: nStat }); } }
  async function toggleEmpfang(c) { if (c.empfang_bestaetigt && !window.confirm("Quittung zurücksetzen?")) return; const nStat = !c.empfang_bestaetigt; const { error } = await supabase.from('cadetten').update({ empfang_bestaetigt: nStat }).eq('id', c.id); if (!error) { logAction("Quittung geändert", `Status geändert.`); fetchCadetten(); setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: nStat })); } }
  async function handleDeletetCadett(c) { if (!window.confirm(`Löschen?`) || !window.confirm(`Ausgaben werden gelöscht!`)) return; const { error } = await supabase.from('ausgaben').delete().eq('cadetten_id', c.id); if (!error) { await supabase.from('cadetten').delete().eq('id', c.id); logAction("Cadett gelöscht", `${c.vorname} entfernt.`); setSelectedCadett(null); fetchCadetten(); fetchInventar(); fetchAllAusgaben(); } }
  async function handleAusgabeSpeichern(kat, typ) { if (typ === 'lager' && !selectedTeilId) return; const { error } = await supabase.from('ausgaben').insert([{ cadetten_id: selectedCadett.id, kategorie_soll: kat, selbst_beschafft: typ === 'selbst', inventar_id: typ === 'lager' ? selectedTeilId : null, status_nicht_benoetigt: typ === 'nicht_benoetigt' }]); if (!error) { await supabase.from('cadetten').update({ empfang_bestaetigt: false }).eq('id', selectedCadett.id); setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: false })); logAction("Teil ausgegeben", `${kat} zugewiesen.`); setShowAusgabeModal(false); setSelectedTeilId(''); fetchAusgaben(selectedCadett.id); fetchInventar(); fetchCadetten(); fetchAllAusgaben(); } }
  async function handleRueckgabe(aId, kat) { if (!window.confirm(`Teil zurückgeben?`)) return; const { error } = await supabase.from('ausgaben').delete().eq('id', aId); if (!error) { await supabase.from('cadetten').update({ empfang_bestaetigt: false }).eq('id', selectedCadett.id); setSelectedCadett(prev => ({ ...prev, empfang_bestaetigt: false })); logAction("Teil zurückgegeben", `${kat} zurück.`); fetchAusgaben(selectedCadett.id); fetchInventar(); fetchCadetten(); fetchAllAusgaben(); } }

  if (isLoading) {
    return <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '100px', color: COLORS.textMuted }}>Sitzung wird geladen...</div>;
  }

  // NEUE LOGIN-ANSICHT MIT FORMULAR
  if (!currentBetreuer) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: '40px 20px', maxWidth: '400px', margin: '100px auto', backgroundColor: COLORS.pureWhite, borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', borderTop: `6px solid ${COLORS.primaryRed}` }}>
        <h2 style={{ color: COLORS.primaryRed, marginBottom: '5px' }}>🛡️ Zeugmeister Login</h2>
        <p style={{ fontSize: '12.5px', color: COLORS.textMuted, marginBottom: '25px' }}>Ehrengarde der Stadt Bonn e.V.</p>
        
        <form onSubmit={handleSichererLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="email" 
            placeholder="E-Mail-Adresse" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.borderLight}`, fontSize: '15px', boxSizing: 'border-box', width: '100%' }} 
            required 
          />
          <input 
            type="password" 
            placeholder="Passwort" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.borderLight}`, fontSize: '15px', boxSizing: 'border-box', width: '100%' }} 
            required 
          />
          
          {loginError && <p style={{ color: COLORS.primaryRed, fontSize: '13px', margin: '5px 0', fontWeight: 'bold' }}>{loginError}</p>}
          
          <button type="submit" style={{ width: '100%', padding: '13px', background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            Sicher einloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '480px', margin: '0 auto', backgroundColor: COLORS.appBackground, minHeight: '100vh', color: COLORS.textDark }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px' }}>
        <span>👤 Zeugmeister: <strong>{currentBetreuer}</strong></span>
        {/* Ändern triggert nun ein sicheres Abmelden */}
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: COLORS.primaryRed, fontWeight: 'bold', cursor: 'pointer' }}>Abmelden</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: COLORS.primaryRed, padding: '6px', borderRadius: '10px' }}>
        <button onClick={() => { setView('cadetten'); setSelectedCadett(null); }} style={{ flex: 1, padding: '10px', background: view === 'cadetten' ? COLORS.pureWhite : 'transparent', color: view === 'cadetten' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ flex: 1, padding: '10px', background: view === 'inventar' ? COLORS.pureWhite : 'transparent', color: view === 'inventar' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Lagerbestand</button>
        <button onClick={() => setView('logs')} style={{ flex: 1, padding: '10px', background: view === 'logs' ? COLORS.pureWhite : 'transparent', color: view === 'logs' ? COLORS.primaryRed : COLORS.pureWhite, border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>📋 Protokoll</button>
      </div>

      {view === 'cadetten' && !selectedCadett && (
        <div>
          <h3 style={{ fontSize: '16px', color: COLORS.primaryRed, borderBottom: `2px solid ${COLORS.primaryRed}`, paddingBottom: '5px' }}>Neuen Cadetten eintragen</h3>
          <form onSubmit={handleAddCadett} style={{ display: 'flex', gap: '8px', marginBottom: '25px', marginTop: '10px' }}>
            <input type="text" placeholder="Vorname" value={newVorname} onChange={e => setNewVorname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` }} />
            <input type="text" placeholder="Nachname" value={newNachname} onChange={e => setNewNachname(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` }} />
            <button type="submit" style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold' }}>+</button>
          </form>
          {cadetten.map(c => (
            <div key={c.id} onClick={() => setSelectedCadett(c)} style={{ background: COLORS.pureWhite, padding: '14px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', borderLeft: `4px solid ${COLORS.primaryRed}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><strong>{c.vorname} {c.nachname}</strong><div style={{ fontSize: '12px', color: COLORS.textMuted }}>Ausrüstung: <span style={{ fontWeight: 'bold', color: COLORS.primaryRed }}>{`${allAusgaben.filter(a => a.cadetten_id === c.id).length} / ${SOLL_KATEGORIEN.length}`}</span></div></div>
              <div style={{ display: 'flex', gap: '4px' }}><span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', background: c.dsgvo_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.dsgvo_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>DSGVO</span><span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', background: c.empfang_bestaetigt ? COLORS.statusGreenBg : '#FFF5F5', color: c.empfang_bestaetigt ? COLORS.statusGreen : COLORS.primaryRed }}>Quittung</span></div>
            </div>
          ))}
        </div>
      )}

      {view === 'cadetten' && selectedCadett && (
        <CadettDetail 
          selectedCadett={selectedCadett} setSelectedCadett={setSelectedCadett} handleNavigateCadett={handleNavigateCadett} handleDeletetCadett={handleDeletetCadett} isEditingName={isEditingName} setIsEditingName={setIsEditingName} editVorname={editVorname} setEditVorname={setEditVorname} editNachname={editNachname} setEditNachname={setEditNachname} handleUpdateName={handleUpdateName} toggleDSGVO={toggleDSGVO} toggleEmpfang={toggleEmpfang} kommentarText={kommentarText} setKommentarText={setKommentarText} kommentarGespeichert={kommentarGespeichert} setKommentarGespeichert={setKommentarGespeichert} handleSaveKommentar={handleSaveKommentar} ausgaben={ausgaben} handleRueckgabe={handleRueckgabe} setActiveKategorie={setActiveKategorie} setShowAusgabeModal={setShowAusgabeModal} generateAndSharePDF={(c, a) => generateAndSharePDF(c, a, inventar, logAction)}
        />
      )}

      {view === 'inventar' && (
        <InventarTab 
          inventar={inventar} newArtikelKat={newArtikelKat} setNewArtikelKat={setNewArtikelKat} newGroesse={newGroesse} setNewGroesse={setNewGroesse} newZustand={newZustand} setNewZustand={setNewZustand} handleAddInventar={handleAddInventar} lagerFilter={lagerFilter} setLagerFilter={setLagerFilter} setLagerFilter={setLagerFilter} groessenFilter={groessenFilter} setGroessenFilter={setGroessenFilter} zustandFilter={zustandFilter} setZustandFilter={setZustandFilter} existierendeGroessen={['Alle', ...new Set(inventar.map(i => i.groesse?.trim()).filter(Boolean))].sort()} existierendeZustaende={['Alle', ...new Set(inventar.map(i => i.zustand?.trim()).filter(Boolean))].sort()}
        />
      )}

      {view === 'logs' && <ProtokollTab logs={logs} />}

      <AusgabeModal 
        showAusgabeModal={showAusgabeModal} setShowAusgabeModal={setShowAusgabeModal} activeKategorie={activeKategorie} selectedTeilId={selectedTeilId} setSelectedTeilId={setSelectedTeilId} freieTeileFuerKategorie={inventar.filter(i => i.artikel === activeKategorie && (i.status === 'Frei' || i.status === 'Free')).sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))} handleAusgabeSpeichern={handleAusgabeSpeichern}
      />
    </div>
  );
}