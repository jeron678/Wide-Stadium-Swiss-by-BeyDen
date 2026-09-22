import React, { useState, useEffect } from 'react';
import { signOut } from './authService.js';
import AuthScreen from './AuthScreen.jsx';
import EventAccessPanel from './EventAccessPanel.jsx';
import EventAuditPanel from './EventAuditPanel.jsx';
import { listEvents, subscribeToEvent } from './eventService';
import { migrateLegacyTournament } from './tournamentEngine';
import { ScoreboardView } from './scoreboard/ScoreboardView.jsx';
import { CreateEventView } from './views/CreateEventView.jsx';
import { HistoryView } from './views/HistoryView.jsx';
import { ActiveTournament } from './views/ActiveTournament.jsx';
import { BladeRandomizer } from './views/BladeRandomizer.jsx';
import { EventBackupPanel } from './views/EventBackupPanel.jsx';
import { PART_TABLES, SHEET_URL } from './appConstants.js';
import {
  appContainer, contentWrapper, heroSection, heroTitle, brandSpan, buttonGroup, primaryBtn, secondaryBtn, accentBtn,
  libraryContainer, headerStyle, backBtnStyle, tableSection, tableHeaderRow, filterRowStyle, filterSelectStyle, searchBarStyle,
  tableWrapper, partsTable, thStyle, tdStyle, tdNameStyle, badgeStyle, trStyle
} from './styles/appStyles.js';
import { buildItemGroups } from './views/BladeRandomizer.jsx';
import './scoreboard.css';
import ThemeToggle from './ThemeToggle.jsx';

// --- MAIN APP ---
export default function App({ authSession }) {
  const [session, setSession] = useState(authSession || null);
  const [protectedReturnView, setProtectedReturnView] = useState('MAIN');
  const [view, setView] = useState('MAIN'); 
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [refereeData, setRefereeData] = useState(null);
  const [searchTerm, setSearchTerm] = useState({ Blades: '', Ratchets: '', Bits: '' });
  const [itemGroups, setItemGroups] = useState([]);
  const [librarySort, setLibrarySort] = useState({ column: 'name', ascending: true });
  const [showAccess, setShowAccess] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [libraryFilters, setLibraryFilters] = useState({ Blades: { system: null, type: null, class: null }, Ratchets: { type: null }, Bits: { system: null, type: null } });

  useEffect(() => {
    if (authSession !== undefined) setSession(authSession || null);
  }, [authSession]);

  const requireSignIn = (nextView = 'MAIN') => {
    if (session) {
      setView(nextView);
      return true;
    }
    setProtectedReturnView(nextView);
    setView('AUTH');
    return false;
  };

  const handleAuthenticated = value => {
    setSession(value);
    setView(protectedReturnView || 'MAIN');
  };

  // REALTIME SUBSCRIPTION: Listen for changes at the App level
  useEffect(() => {
    const handleManualRefresh = event => {
      if (event?.detail?.event_id && (!currentEvent?.event_id || String(event.detail.event_id) === String(currentEvent.event_id))) {
        setCurrentEvent(migrateLegacyTournament(event.detail));
      }
    };
    window.addEventListener('beyden:tournament-refresh', handleManualRefresh);
    return () => window.removeEventListener('beyden:tournament-refresh', handleManualRefresh);
  }, [currentEvent?.event_id]);

  useEffect(() => {
    document.title = "Beyblade X SG"
    if (!currentEvent?.event_id) return;

    const unsubscribe = subscribeToEvent(
      currentEvent.event_id,
      payload => {
        if (payload?.event_id) setCurrentEvent(migrateLegacyTournament(payload));
      },
    );

    return unsubscribe;
  }, [currentEvent?.event_id]);

  // FETCH BEYBLADE PARTS DATA
  useEffect(() => {
    fetch(SHEET_URL)
      .then(res => res.text())
      .then(csv => {
        const rows = csv.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        const groups = buildItemGroups(rows);
        setItemGroups(groups);
      });
  }, []);

  const fetchEvents = async () => {
    if (!requireSignIn('HISTORY')) return;
    try {
      const data = await listEvents();
      setEvents(data);
      setView('HISTORY');
    } catch (error) {
      alert(`Unable to load tournaments: ${error?.message || 'Unknown error'}`);
    }
  };

  const loadEvent = (event) => {
    setCurrentEvent(migrateLegacyTournament(event));
    setView('ACTIVE');
  };

  return (
    <div style={appContainer}>
      <style>{`
        @media (max-width: 480px) {
          .rename-btn {
            padding: 4px 8px !important;
            font-size: 0.7rem !important;
            white-space: nowrap;
          }
          .header-content-mobile {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 15px;
          }
        }
      `}</style>

      {view === 'SCOREBOARD' && (
        <ScoreboardView 
          setView={setView} 
          activeMatch={refereeData} 
          event_id={currentEvent?.event_id} 
        />
      )}

      <div style={contentWrapper}>
        {view === 'AUTH' && (
          <AuthScreen
            initialMessage="Sign in is required to create or view tournaments."
            onAuthenticated={handleAuthenticated}
          />
        )}

        {view === 'MAIN' && (
          <div style={heroSection}>
            <h1 style={heroTitle}>🏆 Beyblade Manager <span style={brandSpan}>by BeyDen</span></h1>
            <div style={buttonGroup}>
              <ThemeToggle />
              <button onClick={() => requireSignIn('CREATE')} style={primaryBtn}>➕ Create New Event</button>
              <button onClick={fetchEvents} style={secondaryBtn}>📋 View Tournaments</button>
              <button onClick={() => {setRefereeData(null); setView('SCOREBOARD')}} style={accentBtn}>⏱ Live Scoreboard (Public)</button>
              {currentEvent && <button onClick={() => { if (requireSignIn('MAIN')) setShowAccess(true); }} style={secondaryBtn}>🔐 Event Access</button>}
              {currentEvent && <button onClick={() => { if (requireSignIn('MAIN')) setShowAudit(true); }} style={secondaryBtn}>🕘 Activity Log</button>}
              {session && <button onClick={async () => { try { await signOut(); setSession(null); setCurrentEvent(null); setView('MAIN'); } catch (error) { alert(error?.message || 'Unable to sign out.'); } }} style={secondaryBtn}>↪ Sign Out</button>}
              <button onClick={() => setView('RANDOMIZER')} style={secondaryBtn}>🎲 Beyblade Combo Randomizer</button>
              <button onClick={() => setView('PARTS_LIBRARY')} style={secondaryBtn}>📂 Beyblade Parts</button>
            </div>
          </div>
        )}

        {view === 'CREATE' && session && <CreateEventView setView={setView} loadEvent={loadEvent} />}
        {view === 'HISTORY' && session && <HistoryView events={events} setView={setView} loadEvent={loadEvent} />}
        {view === 'BACKUP' && session && currentEvent && (
          <EventBackupPanel event={currentEvent} setView={setView} loadEvent={loadEvent} />
        )}
        {view === 'ACTIVE' && session && (
          <ActiveTournament 
            event={currentEvent} 
            onBack={() => setView('MAIN')} 
            setRefereeData={setRefereeData} 
            setView={setView}
            authSession={session}
          />
        )}
        {view === 'RANDOMIZER' && <BladeRandomizer onBack={() => setView('MAIN')} />}
        {view === 'PARTS_LIBRARY' && (
          <div style={libraryContainer}>
            <div style={headerStyle}>
              <button onClick={() => setView('MAIN')} style={backBtnStyle}>← Back</button>
              <h2 style={{ margin: 0 }}>Beyblade Parts Library</h2>
            </div>

            {PART_TABLES.map(tableType => {
              const tableData = itemGroups
                .filter(group => {
                  if (tableType === 'Bits') return group.category === 'Bits' || group.category === 'Integrated-Bit';
                  if (tableType === 'Ratchets') return group.category === 'Ratchets';
                  if (tableType === 'Blades') return !['Ratchets', 'Bits', 'Integrated-Bit'].includes(group.category);
                  return false;
                })
                .flatMap(group => group.items.map(itemName => ({
                  name: itemName,
                  system: group.category,
                  type: group.subCategory,
                  class: group.subCategory.match(/\((Attack|Defense|Stamina|Balance)\)/)?.[1] || null
                })))
                .filter(part => part.name.toLowerCase().includes(searchTerm[tableType].toLowerCase()))
                .filter(part => {
                  const filters = libraryFilters[tableType];
                  if (filters.system && part.system !== filters.system) return false;
                  if (filters.type && part.type !== filters.type) return false;
                  if (tableType === 'Blades' && filters.class && part.class !== filters.class) return false;
                  return true;
                })
                .sort((a, b) => {
                  let aVal = a[librarySort.column];
                  let bVal = b[librarySort.column];
                  if (librarySort.column === 'name') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                  }
                  if (aVal < bVal) return librarySort.ascending ? -1 : 1;
                  if (aVal > bVal) return librarySort.ascending ? 1 : -1;
                  return 0;
                });

              const uniqueSystems = [...new Set(itemGroups
                .filter(group => {
                  if (tableType === 'Bits') return group.category === 'Bits' || group.category === 'Integrated-Bit';
                  if (tableType === 'Ratchets') return group.category === 'Ratchets';
                  if (tableType === 'Blades') return !['Ratchets', 'Bits', 'Integrated-Bit'].includes(group.category);
                  return false;
                })
                .map(g => g.category)
              )].sort();

              const uniqueTypes = [...new Set(itemGroups
                .filter(group => {
                  if (tableType === 'Bits') return group.category === 'Bits' || group.category === 'Integrated-Bit';
                  if (tableType === 'Ratchets') return group.category === 'Ratchets';
                  if (tableType === 'Blades') return !['Ratchets', 'Bits', 'Integrated-Bit'].includes(group.category);
                  return false;
                })
                .map(g => g.subCategory)
              )].sort();

              return (
                <div key={tableType} style={tableSection}>
                  <div style={tableHeaderRow}>
                    <h3 style={{ margin: 0 }}>{tableType}</h3>
                    <input 
                      placeholder={`Search ${tableType}...`}
                      style={searchBarStyle}
                      onChange={(e) => setSearchTerm({...searchTerm, [tableType]: e.target.value})}
                    />
                  </div>

                  <div style={filterRowStyle}>
                    <select 
                      value={libraryFilters[tableType].system || ''}
                      onChange={(e) => setLibraryFilters({...libraryFilters, [tableType]: {...libraryFilters[tableType], system: e.target.value || null}})}
                      style={filterSelectStyle}
                    >
                      <option value="">All Systems</option>
                      {uniqueSystems.map(sys => <option key={sys} value={sys}>{sys}</option>)}
                    </select>

                    <select 
                      value={libraryFilters[tableType].type || ''}
                      onChange={(e) => setLibraryFilters({...libraryFilters, [tableType]: {...libraryFilters[tableType], type: e.target.value || null}})}
                      style={filterSelectStyle}
                    >
                      <option value="">All Types</option>
                      {uniqueTypes.map(typ => <option key={typ} value={typ}>{typ}</option>)}
                    </select>

                    {tableType === 'Blades' && (
                      <select 
                        value={libraryFilters[tableType].class || ''}
                        onChange={(e) => setLibraryFilters({...libraryFilters, [tableType]: {...libraryFilters[tableType], class: e.target.value || null}})}
                        style={filterSelectStyle}
                      >
                        <option value="">All Classes</option>
                        <option value="Attack">Attack</option>
                        <option value="Defense">Defense</option>
                        <option value="Stamina">Stamina</option>
                        <option value="Balance">Balance</option>
                      </select>
                    )}
                  </div>

                  <div style={tableWrapper}>
                    <table style={partsTable}>
                      <thead>
                        <tr>
                          <th 
                            style={{...thStyle, cursor: 'pointer'}}
                            onClick={() => setLibrarySort({ column: 'name', ascending: librarySort.column === 'name' ? !librarySort.ascending : true })}
                          >
                            Part Name {librarySort.column === 'name' && (librarySort.ascending ? '↑' : '↓')}
                          </th>
                          <th 
                            style={{...thStyle, cursor: 'pointer'}}
                            onClick={() => setLibrarySort({ column: 'system', ascending: librarySort.column === 'system' ? !librarySort.ascending : true })}
                          >
                            System {librarySort.column === 'system' && (librarySort.ascending ? '↑' : '↓')}
                          </th>
                          <th 
                            style={{...thStyle, cursor: 'pointer'}}
                            onClick={() => setLibrarySort({ column: 'type', ascending: librarySort.column === 'type' ? !librarySort.ascending : true })}
                          >
                            Sub-Type / Class {librarySort.column === 'type' && (librarySort.ascending ? '↑' : '↓')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((part, idx) => (
                          <tr key={`${part.name}-${idx}`} style={trStyle}>
                            <td style={tdNameStyle}>{part.name}</td>
                            <td style={tdStyle}><span style={badgeStyle}>{part.system}</span></td>
                            <td style={tdStyle}>{part.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showAccess && session && currentEvent && <EventAccessPanel event={currentEvent} session={session} onClose={() => setShowAccess(false)} />}
      {showAudit && session && currentEvent && <EventAuditPanel event={currentEvent} session={session} onClose={() => setShowAudit(false)} />}
    </div>
  );
}
