import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { COLORS } from './constants/config';
import { getSollKategorienFuerCadett } from './constants/config'; 
import { generateAndSharePDF } from './services/pdfService';

// UI-Komponenten importieren
import CadettenListe from './components/CadettenListe';
import CadettDetail from './components/CadettDetail';
import AusgabeModal from './components/AusgabeModal';
import InventarTab from './components/InventarTab';
import ProtokollTab from './components/ProtokollTab';

export default function App() {
  // Navigation & Authentifizierung
  const [view, setView] = useState('cadetten'); 
  const [currentBetreuer, setCurrentBetreuer] = useState(''); 
  const [isLoading, setIsLoading] = useState(true); 

  // Login-Formular-States
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
  
  // Modal- & Zuweisungs-States
  const [showAusgabeModal, setShowAusgabeModal] = useState(false); 
  const [activeKategorie, setActiveKategorie] = useState(''); 
  const [selectedTeilId, setSelectedTeilId] = useState(''); 

  // States für das Hinzufügen neuer Daten
  const [newVorname, setNewVorname] = useState('');
  const [newNachname, setNewNachname] = useState('');
  const [newArtikelKat, setNewArtikelKat] = useState('Hut');
  const [newGroesse, setNewGroesse] = useState('');
  const [newZustand, setNewZustand] = useState('Neuwertig');

  // Name des Cadetten bearbeiten
  const [isEditingName, setIsEditingName] = useState(false);
  const [editVorname, setEditVorname] = useState('');
  const [editNachname, setEditNachname] = useState('');

  // -------------------------------------------------------------------------
  // 1. AUTHENTIFIZIERUNG & INITIALE DATENLADUNG
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Echtzeit-Überwachung des Login-Status
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Betreuername anhand der E-Mail ermitteln
        const emailPrefix = session.user.email.split('@')[0];
        const formattedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        setCurrentBetreuer(formattedName);
        
        // Sobald eingeloggt, alle Stammdaten aus der DB laden
        fetchInitialData();
      } else {
        setCurrentBetreuer('');
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Lädt alle Kerntabellen der Datenbank parallel
  async function fetchInitialData() {
    setIsLoading(true);
    try {
      // Laden aller Tabellen inklusive deiner realen 'audit_log'-Tabelle
      const [rCadetten, rInventar, rAusgaben, rLogs] = await Promise.all([
        supabase.from('cadetten').select('*').order('nachname', { ascending: true }),
        supabase.from('inventar').select('*').order('id', { ascending: true }),
        supabase.from('ausgaben').select('*'),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }) // Korrigiert auf 'audit_log'
      ]);

      if (rCadetten.error) throw rCadetten.error;
      if (rInventar.error) throw rInventar.error;
      if (rAusgaben.error) throw rAusgaben.error;
      if (rLogs.error) throw rLogs.error;

      setCadetten(rCadetten.data || []);
      setInventar(rInventar.data || []);
      setAllAusgaben(rAusgaben.data || []);
      setLogs(rLogs.data || []);

    } catch (err) {
      console.error('Fehler beim Laden der Stammdaten:', err);
      alert('Daten konnten nicht geladen werden: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // 2. DETEILANSICHT: CADETTEN-AUSGABEN LADEN (Race-Condition-Schutz)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!selectedCadett) {
      setAusgaben([]);
      return;
    }

    let active = true;

    async function fetchAusgabenForSelected() {
      try {
        const { data, error } = await supabase
          .from('ausgaben')
          .select('*')
          .eq('cadetten_id', selectedCadett.id);

        if (error) throw error;

        if (active) {
          setAusgaben(data || []);
        }
      } catch (err) {
        console.error('Fehler beim Laden der Ausgaben:', err);
      }
    }

    fetchAusgabenForSelected();

    return () => {
      active = false;
    };
  }, [selectedCadett]);

  // -------------------------------------------------------------------------
  // 3. LOGGER-FUNKTION (Schreibt in 'audit_log')
  // -------------------------------------------------------------------------

  async function logAction(aktion, details) {
    try {
      const { data, error } = await supabase
        .from('audit_log') // Korrigiert auf 'audit_log'
        .insert([{ betreuer: currentBetreuer || 'System', aktion, details }])
        .select();

      if (!error && data) {
        setLogs(prev => [data[0], ...prev]);
      }
    } catch (err) {
      console.error('Logging-Fehler:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 4. DATENBANK-AKTIONEN (CRUD)
  // -------------------------------------------------------------------------

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError('Login fehlgeschlagen. Bitte Daten prüfen.');
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSelectedCadett(null);
    setView('cadetten');
  }

  async function handleAddCadett(e) {
    e.preventDefault();
    if (!newVorname.trim() || !newNachname.trim()) return;

    try {
      const { data, error } = await supabase
        .from('cadetten')
        .insert([{ vorname: newVorname.trim(), nachname: newNachname.trim(), dsgvo_bestaetigt: false, empfang_bestaetigt: false }])
        .select();

      if (error) throw error;

      if (data) {
        setCadetten(prev => [...prev, data[0]].sort((a, b) => a.nachname.localeCompare(b.nachname)));
        logAction('Cadett angelegt', `${newVorname.trim()} ${newNachname.trim()} wurde hinzugefügt.`);
        setNewVorname('');
        setNewNachname('');
      }
    } catch (err) {
      alert('Fehler beim Erstellen des Cadetten: ' + err.message);
    }
  }

  async function onUpdateCadettField(cadettId, field, value) {
    try {
      const { error } = await supabase
        .from('cadetten')
        .update({ [field]: value })
        .eq('id', cadettId);

      if (error) throw error;

      setCadetten(prev => prev.map(c => c.id === cadettId ? { ...c, [field]: value } : c));
      if (selectedCadett && selectedCadett.id === cadettId) {
        setSelectedCadett(prev => ({ ...prev, [field]: value }));
      }
    } catch (err) {
      alert('Fehler beim Aktualisieren des Feldes: ' + err.message);
    }
  }

  async function handleUpdateName(e) {
    e.preventDefault();
    if (!editVorname.trim() || !editNachname.trim()) return;

    try {
      const { error } = await supabase
        .from('cadetten')
        .update({ vorname: editVorname.trim(), nachname: editNachname.trim() })
        .eq('id', selectedCadett.id);

      if (error) throw error;

      setCadetten(prev => prev.map(c => c.id === selectedCadett.id ? { ...c, vorname: editVorname.trim(), nachname: editNachname.trim() } : c));
      setSelectedCadett(prev => ({ ...prev, vorname: editVorname.trim(), nachname: editNachname.trim() }));
      logAction('Name geändert', `Geändert zu ${editVorname.trim()} ${editNachname.trim()}`);
      setIsEditingName(false);
    } catch (err) {
      alert('Fehler beim Ändern des Namens: ' + err.message);
    }
  }

  async function handleDeletetCadett(id) {
    if (!window.confirm('Möchtest du diesen Cadetten wirklich unwiderruflich löschen? Alle Ausgaben müssen vorher zurückgegeben sein.')) return;

    if (ausgaben.length > 0) {
      alert('Dieser Cadett hat noch zugewiesene Ausrüstung! Bitte buche zuerst alle Rückgaben ein.');
      return;
    }

    try {
      const { error } = await supabase.from('cadetten').delete().eq('id', id);
      if (error) throw error;

      logAction('Cadett gelöscht', `${selectedCadett.vorname} ${selectedCadett.nachname} wurde entfernt.`);
      setCadetten(prev => prev.filter(c => c.id !== id));
      setSelectedCadett(null);
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  }

  async function handleAddInventar(e) {
    e.preventDefault();
    const formatierteGroesse = newGroesse.trim() || '';

    try {
      const { data, error } = await supabase
        .from('inventar')
        .insert([{ artikel: newArtikelKat, groesse: formatierteGroesse, zustand: newZustand, status: 'Frei' }])
        .select();

      if (error) throw error;

      if (data) {
        setInventar(prev => [...prev, data[0]]);
        logAction('Inventar hinzugefügt', `Ein Teil der Kategorie "${newArtikelKat}" (Gr. ${formatierteGroesse || 'k.A.'}) wurde eingebucht.`);
        setNewGroesse('');
      }
    } catch (err) {
      alert('Fehler beim Hinzufügen des Inventars: ' + err.message);
    }
  }

  async function handleAusgabeSpeichern(kategorie, typ) {
    if (!selectedCadett) return;

    try {
      let insertData = {
        cadetten_id: selectedCadett.id,
        kategorie_soll: kategorie,
        selbst_beschafft: false,
        status_nicht_benoetigt: false,
        inventar_id: null
      };

      let logDetails = '';

      if (typ === 'lager') {
        if (!selectedTeilId) return;
        insertData.inventar_id = parseInt(selectedTeilId, 10);
        logDetails = `Teil ID: ${selectedTeilId} aus dem Lager zugewiesen.`;

        const { error: invErr } = await supabase
          .from('inventar')
          .update({ status: 'Ausgeliehen' })
          .eq('id', selectedTeilId);

        if (invErr) throw invErr;

        setInventar(prev => prev.map(i => i.id === insertData.inventar_id ? { ...i, status: 'Ausgeliehen' } : i));
      } else if (typ === 'selbst') {
        insertData.selbst_beschafft = true;
        logDetails = 'Als "Selbst beschafft" markiert.';
      } else if (typ === 'nicht_benoetigt') {
        insertData.status_nicht_benoetigt = true;
        logDetails = 'Als "Nicht benötigt" deklariert.';
      }

      const { data, error } = await supabase
        .from('ausgaben')
        .insert([insertData])
        .select();

      if (error) throw error;

      if (data) {
        setAusgaben(prev => [...prev, data[0]]);
        setAllAusgaben(prev => [...prev, data[0]]);
        logAction(`Ausrüstung ausgegeben: ${kategorie}`, `${selectedCadett.vorname} ${selectedCadett.nachname} -> ${logDetails}`);
      }

      setShowAusgabeModal(false);
      setSelectedTeilId('');
    } catch (err) {
      alert('Fehler beim Speichern der Ausgabe: ' + err.message);
    }
  }

  async function handleRueckgabe(ausgabeId, kategorie) {
    const ausgabeItem = ausgaben.find(a => a.id === ausgabeId);
    if (!ausgabeItem) return;

    try {
      if (ausgabeItem.inventar_id) {
        const { error: invErr } = await supabase
          .from('inventar')
          .update({ status: 'Frei' })
          .eq('id', ausgabeItem.inventar_id);

        if (invErr) throw invErr;

        setInventar(prev => prev.map(i => i.id === ausgabeItem.inventar_id ? { ...i, status: 'Frei' } : i));
      }

      const { error } = await supabase
        .from('ausgaben')
        .delete()
        .eq('id', ausgabeId);

      if (error) throw error;

      setAusgaben(prev => prev.filter(a => a.id !== ausgabeId));
      setAllAusgaben(prev => prev.filter(a => a.id !== ausgabeId));
      logAction(`Ausrüstung zurückgegeben: ${kategorie}`, `Rückgabe von ${selectedCadett.vorname} ${selectedCadett.nachname} erfasst.`);
    } catch (err) {
      alert('Fehler bei der Rückgabe: ' + err.message);
    }
  }

  async function toggleDSGVO() {
    if (!selectedCadett) return;
    const neuWert = !selectedCadett.dsgvo_bestaetigt;
    await onUpdateCadettField(selectedCadett.id, 'dsgvo_bestaetigt', neuWert);
    logAction('DSGVO Status geändert', `DSGVO-Erklärung für ${selectedCadett.vorname} ${selectedCadett.nachname} auf [${neuWert ? 'JA' : 'NEIN'}] gesetzt.`);
  }

  async function toggleEmpfang() {
    if (!selectedCadett) return;
    const neuWert = !selectedCadett.empfang_bestaetigt;
    await onUpdateCadettField(selectedCadett.id, 'empfang_bestaetigt', neuWert);
    logAction('Quittungs-Status geändert', `Empfangsbestätigung für ${selectedCadett.vorname} ${selectedCadett.nachname} auf [${neuWert ? 'JA' : 'NEIN'}] gesetzt.`);
  }

  async function handleSaveKommentar(kommentarText) {
    if (!selectedCadett) return;
    try {
      const { error } = await supabase
        .from('cadetten')
        .update({ kommentar: kommentarText })
        .eq('id', selectedCadett.id);

      if (error) throw error;

      setCadetten(prev => prev.map(c => c.id === selectedCadett.id ? { ...c, kommentar: kommentarText } : c));
      setSelectedCadett(prev => ({ ...prev, kommentar: kommentarText }));
      logAction('Kommentar geändert', `Kommentar von ${selectedCadett.vorname} ${selectedCadett.nachname} aktualisiert.`);
      return true;
    } catch (err) {
      alert('Fehler beim Speichern des Kommentars: ' + err.message);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // NAVIGATION & BLÄTTER-LOGIK (◀ / ▶)
  // -------------------------------------------------------------------------

  function handleNavigateCadett(direction) {
    if (!selectedCadett || cadetten.length === 0) return;
    const currentIndex = cadetten.findIndex(c => c.id === selectedCadett.id);
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) nextIndex = cadetten.length - 1;
    if (nextIndex >= cadetten.length) nextIndex = 0;

    setSelectedCadett(cadetten[nextIndex]);
    setIsEditingName(false);
  }

  // -------------------------------------------------------------------------
  // RENDER-METHODE
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', background: COLORS.appBackground }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: `4px solid ${COLORS.borderLight}`, borderTop: `4px solid ${COLORS.primaryRed}`, borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          <p style={{ color: COLORS.textMuted, fontSize: '14px' }}>Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  if (!currentBetreuer) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: COLORS.appBackground, fontFamily: 'sans-serif', padding: '20px' }}>
        <div style={{ background: COLORS.pureWhite, padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h2 style={{ color: COLORS.primaryRed, margin: '0 0 5px' }}>Ehrengarde Bonn</h2>
            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '14px' }}>Zeugmeister-Portal Anmeldung</p>
          </div>
          
          {loginError && <div style={{ color: COLORS.primaryRed, background: COLORS.softRedBg, padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{loginError}</div>}
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '5px' }}>E-Mail-Adresse</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textMuted, display: 'block', marginBottom: '5px' }}>Passwort</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ background: COLORS.primaryRed, color: COLORS.pureWhite, border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Anmelden</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: COLORS.appBackground, minHeight: '100vh', padding: '15px', boxSizing: 'box-sizing', fontFamily: 'sans-serif', paddingBottom: '75px', position: 'relative' }}>
      
      {/* KOPFZEILE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
        <div>
          <h2 style={{ margin: 0, color: COLORS.primaryRed, fontSize: '18px' }}>Zeugmeister</h2>
          <span style={{ fontSize: '11px', color: COLORS.textMuted }}>Angemeldet: <strong>{currentBetreuer}</strong></span>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${COLORS.borderLight}`, padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: COLORS.textMuted }}>Abmelden</button>
      </div>

      {/* INHALTSBEREICH (TAB-STEUERUNG) */}
      {view === 'cadetten' && (
        !selectedCadett ? (
          <CadettenListe 
            cadetten={cadetten} 
            allAusgaben={allAusgaben} 
            setSelectedCadett={(c) => {
              setSelectedCadett(c);
              setEditVorname(c.vorname);
              setEditNachname(c.nachname);
            }} 
            newVorname={newVorname} 
            setNewVorname={setNewVorname} 
            newNachname={newNachname} 
            setNewNachname={setNewNachname} 
            handleAddCadett={handleAddCadett} 
          />
        ) : (
          <CadettDetail 
            selectedCadett={selectedCadett} 
            setSelectedCadett={setSelectedCadett} 
            handleNavigateCadett={handleNavigateCadett} 
            handleDeletetCadett={handleDeletetCadett}
            isEditingName={isEditingName}
            setIsEditingName={setIsEditingName}
            editVorname={editVorname}
            setEditVorname={setEditVorname}
            editNachname={editNachname}
            setEditNachname={setEditNachname}
            handleUpdateName={handleUpdateName}
            toggleDSGVO={toggleDSGVO}
            toggleEmpfang={toggleEmpfang}
            handleSaveKommentar={handleSaveKommentar}
            ausgaben={ausgaben} 
            handleRueckgabe={handleRueckgabe}
            setActiveKategorie={setActiveKategorie}
            setShowAusgabeModal={setShowAusgabeModal} 
            generateAndSharePDF={(c, a) => generateAndSharePDF(c, a, inventar, logAction)}
            onUpdateCadettField={onUpdateCadettField}
          />
        )
      )}

      {view === 'inventar' && (
        <InventarTab 
          inventar={inventar} 
          newArtikelKat={newArtikelKat} 
          setNewArtikelKat={setNewArtikelKat} 
          newGroesse={newGroesse} 
          setNewGroesse={setNewGroesse} 
          newZustand={newZustand} 
          setNewZustand={setNewZustand} 
          handleAddInventar={handleAddInventar} 
        />
      )}

      {view === 'logs' && <ProtokollTab logs={logs} />}

      {/* FOOTER-NAVIGATION */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: COLORS.pureWhite, borderTop: `1px solid ${COLORS.borderLight}`, display: 'flex', justifyContent: 'space-around', padding: '10px 0', zIndex: 100 }}>
        <button onClick={() => { setSelectedCadett(null); setView('cadetten'); }} style={{ background: 'transparent', border: 'none', color: view === 'cadetten' ? COLORS.primaryRed : COLORS.textMuted, fontWeight: view === 'cadetten' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer' }}>👥 Cadetten</button>
        <button onClick={() => setView('inventar')} style={{ background: 'transparent', border: 'none', color: view === 'inventar' ? COLORS.primaryRed : COLORS.textMuted, fontWeight: view === 'inventar' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer' }}>📦 Lager</button>
        <button onClick={() => setView('logs')} style={{ background: 'transparent', border: 'none', color: view === 'logs' ? COLORS.primaryRed : COLORS.textMuted, fontWeight: view === 'logs' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer' }}>📋 Protokoll</button>
      </div>

      {/* AUSGABE-MODAL */}
      <AusgabeModal 
        showAusgabeModal={showAusgabeModal} 
        setShowAusgabeModal={setShowAusgabeModal} 
        activeKategorie={activeKategorie} 
        selectedTeilId={selectedTeilId} 
        setSelectedTeilId={setSelectedTeilId} 
        freieTeileFuerKategorie={inventar.filter(i => i.artikel === activeKategorie && (i.status === 'Frei' || i.status === 'Free'))}
        handleAusgabeSpeichern={handleAusgabeSpeichern}
      />
    </div>
  );
}