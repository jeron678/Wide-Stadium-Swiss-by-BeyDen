import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const CATEGORIES = ['BX', 'UX', 'BX-00', 'BX-Expand', 'UX-Expand', 'Collab', 'CX', 'CX-Expand'];
const GENERAL_GROUPS = ['Ratchets', 'Bits', 'Integrated-Bit'];
const PART_TABLES = ['Blades', 'Ratchets', 'Bits'];
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTuOYycxCrAi5gLW-6B0Cx-59cPNNg8_6RoBYEWqh80fPHqBElnc5Y79sAt5VT1vraX812rRuTZunHo/pub?output=csv";

// --- HELPER: BUCHHOLZ CALCULATION ---
const calculateBuchholz = (player, allPlayers) => {
  if (!player.opponents || player.opponents.length === 0) return 0;
  return player.opponents.reduce((acc, oppName) => {
    const opp = allPlayers.find(p => p.name === oppName);
    return acc + (opp ? (opp.score || 0) : 0);
  }, 0);
};

// --- HELPER: BUILD ITEM GROUPS FROM CSV ---
const buildItemGroups = (matrix) => {
  const groups = {};
  const TYPES = ["Attack", "Defense", "Stamina", "Balance"];
  const numCols = matrix[0]?.length || 0;

  for (let col = 0; col < numCols; col++) {
    const groupHeader = matrix[0]?.[col]; // Blades, Ratchets, Bits
    const category = matrix[1]?.[col];     // BX, UX, Normal, Integrated-Bit
    const row3 = matrix[2]?.[col];         // Main Blade, 0, Turbo
    const row4 = matrix[3]?.[col];         // Attack, 0-60, Accel

    if (!groupHeader || !category) continue;

    let displayCategory = category;
    let subCategory = row3 || "General";
    let startRow = 4; // Items usually start at Row 5 (index 4)

    if (groupHeader === "Blades") {
      // Add Type info to subcategory name if present for all systems
      if (TYPES.includes(row4)) {
        subCategory = `${row3} (${row4})`;
      }
    } else if (GENERAL_GROUPS.includes(groupHeader)) {
      displayCategory = groupHeader;

      // NEW LOGIC: Check if this specific column is actually an Integrated Bit
      if (category === "Integrated Bit" || category === "Integrated-Bit") {
        displayCategory = "Integrated-Bit";
      }

      // Logic for Ratchets/Bits metadata
      if (row3 && row3 !== "Normal" && row3 !== "Simple" && row3 !== "Integrated Bit") {
        subCategory = row3;
      }
      startRow = 3; // Items start earlier in these columns
    }

    const key = `${displayCategory}||${subCategory}`;
    if (!groups[key]) groups[key] = { category: displayCategory, subCategory, items: [] };

    for (let row = startRow; row < matrix.length; row++) {
      const part = matrix[row]?.[col];
      if (part && part !== "" && !TYPES.includes(part) && part !== "Main Blade") {
        groups[key].items.push(part);
      }
    }
  }

  return Object.values(groups).map(g => ({ ...g, items: Array.from(new Set(g.items)) }));
};

// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState('MAIN'); 
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [refereeData, setRefereeData] = useState(null);
  const [searchTerm, setSearchTerm] = useState({ Blades: '', Ratchets: '', Bits: '' });
  const [itemGroups, setItemGroups] = useState([]);
  const [librarySort, setLibrarySort] = useState({ column: 'name', ascending: true });
  const [libraryFilters, setLibraryFilters] = useState({ Blades: { system: null, type: null, class: null }, Ratchets: { type: null }, Bits: { system: null, type: null } });

  // REALTIME SUBSCRIPTION: Listen for changes at the App level
  useEffect(() => {
    if (!currentEvent?.event_id) return;

    const channel = supabase.channel(`sync-${currentEvent.event_id}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `event_id=eq.${currentEvent.event_id}` }, 
        (payload) => {
          setCurrentEvent(payload.new); // Updates the entire app when DB changes
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
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
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (!error) {
      setEvents(data);
      setView('HISTORY');
    }
  };

  const loadEvent = (event) => {
    setCurrentEvent(event);
    setView('ACTIVE');
  };

  return (
    <div style={appContainer}>
      <style>{`
        @media (orientation: portrait) {
          .landscape-lock {
            width: 100vh !important;
            height: 100vw !important;
            transform: rotate(90deg);
            transform-origin: center;
            position: absolute;
            top: 50%;
            left: 50%;
            margin-top: -50vw;
            margin-left: -50vh;
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
        {view === 'MAIN' && (
          <div style={heroSection}>
            <h1 style={heroTitle}>🏆 Beyblade Manager <span style={brandSpan}>by BeyDen</span></h1>
            <div style={buttonGroup}>
              <button onClick={() => setView('CREATE')} style={primaryBtn}>➕ Create New Event</button>
              <button onClick={fetchEvents} style={secondaryBtn}>📋 View Tournaments</button>
              <button onClick={() => {setRefereeData(null); setView('SCOREBOARD')}} style={accentBtn}>⏱ Live Scoreboard (Ref Tool)</button>
              <button onClick={() => setView('RANDOMIZER')} style={secondaryBtn}>🎲 Beyblade Combo Randomizer</button>
              <button onClick={() => setView('PARTS_LIBRARY')} style={secondaryBtn}>📂 Beyblade Parts</button>
            </div>
          </div>
        )}

        {view === 'CREATE' && <CreateEventView setView={setView} loadEvent={loadEvent} />}
        {view === 'HISTORY' && <HistoryView events={events} setEvents={setEvents} setView={setView} loadEvent={loadEvent} />}
        {view === 'ACTIVE' && (
          <ActiveTournament 
            event={currentEvent} 
            onBack={() => setView('MAIN')} 
            setRefereeData={setRefereeData} 
            setView={setView}
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
    </div>
  );
}

export function BladeRandomizer({ onBack }) {
  const [dataMatrix, setDataMatrix] = useState([]);
  const [itemGroups, setItemGroups] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [categoryFilters, setCategoryFilters] = useState(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubgroups, setExpandedSubgroups] = useState({});
  const [result, setResult] = useState(null);
  const [deckResult, setDeckResult] = useState(null);
  const [allowRepeats, setAllowRepeats] = useState(false);
  const [loading, setLoading] = useState(true);

  const itemKey = (category, subCategory, item) => `${category}||${subCategory}||${item}`;
  const isItemSelected = (key) => selectedItems[key] ?? true;

  const shouldShowGroup = (group) => {
    if (categoryFilters[group.category]) return true;
    if (group.category === 'CX' && ['Lock Chip', 'Assist Blade'].includes(group.subCategory) && categoryFilters['CX-Expand']) return true;
    return GENERAL_GROUPS.includes(group.category);
  };

  const visibleGroups = itemGroups.filter(shouldShowGroup);
  const totalItemCount = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);
  const selectedItemCount = visibleGroups.reduce((sum, group) => {
    return sum + group.items.filter(item => isItemSelected(itemKey(group.category, group.subCategory, item))).length;
  }, 0);

  const toggleItem = (category, subCategory, item) => {
    const key = itemKey(category, subCategory, item);
    setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategoryFilter = (category) => setCategoryFilters(prev => ({ ...prev, [category]: !prev[category] }));
  const selectAllItems = () => setSelectedItems(itemGroups.reduce((acc, group) => {
    group.items.forEach(item => acc[itemKey(group.category, group.subCategory, item)] = true);
    return acc;
  }, {}));
  const clearAllItems = () => setSelectedItems(itemGroups.reduce((acc, group) => {
    group.items.forEach(item => acc[itemKey(group.category, group.subCategory, item)] = false);
    return acc;
  }, {}));

  const categoryHasSelectedItems = (cat) => {
    return categoryFilters[cat] && itemGroups.some(group => 
      group.category === cat && group.items.some(item => isItemSelected(itemKey(group.category, group.subCategory, item)))
    );
  };

  const toggleCategoryExpansion = (category) => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  const toggleSubgroupExpansion = (groupKey) => setExpandedSubgroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));

  useEffect(() => {
    fetch(SHEET_URL)
      .then(res => res.text())
      .then(csv => {
        const rows = csv.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        setDataMatrix(rows);

        const groups = buildItemGroups(rows);
        setItemGroups(groups);
        setSelectedItems(groups.reduce((acc, group) => {
          group.items.forEach(item => acc[itemKey(group.category, group.subCategory, item)] = true);
          return acc;
        }, {}));

        setLoading(false);
      });
  }, []);

  const getBladeParts = (cat, subCat) => {
    const parts = [];
    itemGroups.forEach(group => {
      if (group.category === cat) {
        // Matches exact (e.g. "Lock Chip") or with type (e.g. "Main Blade (Attack)")
        if (group.subCategory === subCat || group.subCategory.startsWith(`${subCat} (`)) {
          group.items.forEach(item => {
            if (isItemSelected(itemKey(group.category, group.subCategory, item))) parts.push(item);
          });
        }
      }
    });
    return Array.from(new Set(parts));
  };

  const getGeneralParts = (headerName) => {
    const parts = [];
    itemGroups.forEach(group => {
      if (group.category === headerName) {
        group.items.forEach(item => {
          if (isItemSelected(itemKey(group.category, group.subCategory, item))) parts.push(item);
        });
      }
    });
    return Array.from(new Set(parts));
  };

  const pick = (list) => (list && list.length > 0) ? list[Math.floor(Math.random() * list.length)] : null;

  const generateRandom = () => {
    const activeCats = CATEGORIES.filter(categoryHasSelectedItems);
    if (activeCats.length === 0) return alert("Select at least one system with selected items.");

    const chosenCat = activeCats[Math.floor(Math.random() * activeCats.length)];
    let combo = [];

    if (chosenCat === 'CX') {
      combo.push({ type: 'Lock Chip', name: pick(getBladeParts('CX', 'Lock Chip')) });
      combo.push({ type: 'Main Blade', name: pick(getBladeParts('CX', 'Main Blade')) });
      combo.push({ type: 'Assist Blade', name: pick(getBladeParts('CX', 'Assist Blade')) });
    } else if (chosenCat === 'CX-Expand') {
      combo.push({ type: 'Lock Chip', name: pick(getBladeParts('CX', 'Lock Chip')) });
      combo.push({ type: 'Metal Blade', name: pick(getBladeParts('CX-Expand', 'Metal Blade')) });
      combo.push({ type: 'Over Blade', name: pick(getBladeParts('CX-Expand', 'Over Blade')) });
      combo.push({ type: 'Assist Blade', name: pick(getBladeParts('CX', 'Assist Blade')) });
    } else {
      combo.push({ type: 'Blade', name: pick(getBladeParts(chosenCat, 'Main Blade')) });
    }

    const ratchets = getGeneralParts('Ratchets');
    const bits = getGeneralParts('Bits');
    const integrated = getGeneralParts('Integrated-Bit');

    if (chosenCat === 'UX-Expand') {
      combo.push({ type: 'Bit', name: pick(bits) });
    } else {
      const useIntegrated = integrated.length > 0 && Math.random() < 0.15;
      if (useIntegrated) {
        combo.push({ type: 'Integrated-Bit', name: pick(integrated) });
      } else {
        combo.push({ type: 'Ratchet', name: pick(ratchets) });
        combo.push({ type: 'Bit', name: pick(bits) });
      }
    }

    if (combo.some(p => !p.name)) return alert("Missing parts in selection. Check Item Selector.");
    setResult({ category: chosenCat, parts: combo });
    setDeckResult(null);
  };

  const generate3on3 = () => {
    const activeCats = CATEGORIES.filter(categoryHasSelectedItems);
    if (activeCats.length === 0) return alert("Select systems in the filter.");
    const deck = [];
    const usedBlades = new Set();
    const usedRatchets = new Set();
    const usedBits = new Set();
    const pickUnique = (list, set) => {
    if (!list || list.length === 0) return null;

    if (allowRepeats) {
      return pick(list);
    }

    const available = list.filter(p => !set.has(p));

    if (available.length === 0) {
      return null; // IMPORTANT: do NOT fallback here
    }

    const selection = pick(available);
    set.add(selection);
    return selection;
  };

    for (let i = 0; i < 3; i++) {
      const cat = activeCats[Math.floor(Math.random() * activeCats.length)];
      let bey = { system: cat, parts: [] };

      if (cat === 'CX') {
        bey.parts.push({ type: 'Lock Chip', name: pickUnique(getBladeParts('CX', 'Lock Chip'), usedBlades) });
        bey.parts.push({ type: 'Main Blade', name: pickUnique(getBladeParts('CX', 'Main Blade'), usedBlades) });
        bey.parts.push({ type: 'Assist Blade', name: pickUnique(getBladeParts('CX', 'Assist Blade'), usedBlades) });
      } else if (cat === 'CX-Expand') {
        bey.parts.push({ type: 'Lock Chip', name: pickUnique(getBladeParts('CX', 'Lock Chip'), usedBlades) });
        bey.parts.push({ type: 'Metal Blade', name: pickUnique(getBladeParts('CX-Expand', 'Metal Blade'), usedBlades) });
        bey.parts.push({ type: 'Over Blade', name: pickUnique(getBladeParts('CX-Expand', 'Over Blade'), usedBlades) });
        bey.parts.push({ type: 'Assist Blade', name: pickUnique(getBladeParts('CX', 'Assist Blade'), usedBlades) });
      } else {
        bey.parts.push({ type: 'Blade', name: pickUnique(getBladeParts(cat, 'Main Blade'), usedBlades) });
      }

      // Hardware Logic Fix
      if (cat === 'UX-Expand') {
        bey.parts.push({ type: 'Bit', name: pickUnique(getGeneralParts('Bits'), usedBits) || pick(getGeneralParts('Bits')) });
      } else {
        const bitsList = getGeneralParts('Bits');
        const integratedList = getGeneralParts('Integrated-Bit');
        
        // Randomly decide which to try first
        const tryIntegratedFirst = Math.random() < 0.3; 
        let partSelected = null;

        if (tryIntegratedFirst) {
          partSelected = pickUnique(integratedList, usedBits);
          if (partSelected) {
            bey.parts.push({ type: 'Integrated-Bit', name: partSelected });
          }
        }

        // If no integrated bit was picked (or none were available/unique), pick a normal Bit + Ratchet
        if (!partSelected) {
          const bitName = pickUnique(bitsList, usedBits);
          const ratchetName = pickUnique(getGeneralParts('Ratchets'), usedRatchets);

          // If we can't find unique parts → FAIL EARLY
          if (!bitName || !ratchetName) {
            alert("Not enough unique parts to generate a full 3on3 deck without repeats.");
            return;
          }

          bey.parts.push({ type: 'Ratchet', name: ratchetName });
          bey.parts.push({ type: 'Bit', name: bitName });
          
        }
      }
      deck.push(bey);
    }
    setDeckResult(deck);
    setResult(null);
  };

  const visibleCategories = Array.from(new Set(visibleGroups.map(group => group.category)));
  const categoryGroups = visibleCategories.map(category => ({
    category,
    subgroups: visibleGroups.filter(group => group.category === category)
  }));

  return (
    <div style={card}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <h2 style={sectionTitle}>Beyblade Combo Randomizer</h2>
      
      <div style={filterGrid}>
        {CATEGORIES.map(cat => (
          <label key={cat} style={checkboxLabel}>
            <input type="checkbox" checked={categoryFilters[cat]} onChange={() => toggleCategoryFilter(cat)} />
            {cat}
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => setShowFilterModal(true)} style={secondaryBtn}>
          🔧 Choose Items ({selectedItemCount}/{totalItemCount})
        </button>

        {showFilterModal && (
          <div style={modalOverlay} onClick={() => setShowFilterModal(false)}>
            <div style={modalDialog} onClick={(e) => e.stopPropagation()}>
              <div style={modalHeader}>
                <div>
                  <h3 style={{ margin: 0 }}>Item Selector</h3>
                  <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '0.85rem' }}>Toggle specific parts to include in randomization.</p>
                </div>
                <button onClick={() => setShowFilterModal(false)} style={modalCloseBtn}>✕</button>
              </div>

              <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '20px' }}>
                {categoryGroups.map(({ category, subgroups }) => {
                  const categoryOpen = expandedCategories[category] ?? false;
                  return (
                    <div key={category} style={groupWrapper}>
                      <button onClick={() => toggleCategoryExpansion(category)} style={groupHeader}>
                        <span>{category}</span>
                        <span>{categoryOpen ? '▾' : '▸'}</span>
                      </button>
                      {categoryOpen && (
                        <div style={subgroupList}>
                          {subgroups.map(group => {
                            const subgroupKey = `${group.category}||${group.subCategory}`;
                            const subgroupOpen = expandedSubgroups[subgroupKey] ?? false;
                            
                            // Logic to check if all items in this specific subcategory are selected
                            const allSubItemsSelected = group.items.every(item => 
                              isItemSelected(itemKey(group.category, group.subCategory, item))
                            );

                            const toggleSubgroupItems = (select) => {
                              const newSelections = { ...selectedItems };
                              group.items.forEach(item => {
                                newSelections[itemKey(group.category, group.subCategory, item)] = select;
                              });
                              setSelectedItems(newSelections);
                            };

                            return (
                              <div key={subgroupKey} style={subgroupWrapper}>
                                <div style={subgroupHeader}>
                                  <div onClick={() => toggleSubgroupExpansion(subgroupKey)} style={{ flex: 1, cursor: 'pointer' }}>
                                    <span>{group.subCategory}</span>
                                    <span style={{ marginLeft: '10px' }}>{subgroupOpen ? '▾' : '▸'}</span>
                                  </div>
                                  
                                  {/* Right Side: Select All Checkbox */}
                                  <label style={selectAllContainer}>
                                    <span style={selectAllText}>
                                      {allSubItemsSelected ? 'Clear All' : 'Select All'}
                                    </span>
                                    <input 
                                      type="checkbox" 
                                      checked={allSubItemsSelected} 
                                      onChange={(e) => toggleSubgroupItems(e.target.checked)}
                                      style={{ 
                                        cursor: 'pointer', 
                                        width: '16px', 
                                        height: '16px', 
                                        accentColor: '#10b981' 
                                      }}
                                    />
                                  </label>
                                </div>

                                {subgroupOpen && (
                                  <div style={itemList}>
                                    {group.items.map(item => {
                                      const key = itemKey(group.category, group.subCategory, item);
                                      return (
                                        <label key={key} style={checkboxLabel}> 
                                          <input 
                                            type="checkbox" 
                                            checked={isItemSelected(key)} 
                                            onChange={() => toggleItem(group.category, group.subCategory, item)} 
                                          />
                                          <span style={{ marginLeft: '8px' }}>{item}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={modalActions}>
                <button onClick={selectAllItems} style={modalActionBtn}>Select All</button>
                <button onClick={clearAllItems} style={modalActionBtn}>Clear All</button>
                <button onClick={() => setShowFilterModal(false)} style={primaryBtn}>Done</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={generateRandom} style={primaryBtn} disabled={loading}>🎲 Random Single</button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button onClick={generate3on3} style={deckBtn} disabled={loading}>🎴 Build 3on3 Deck</button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <input type="checkbox" id="rep" checked={allowRepeats} onChange={(e) => setAllowRepeats(e.target.checked)} />
              <label htmlFor="rep" style={{ fontSize: '0.75rem' }}>Allow repeats</label>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div style={resultContainer}>
          <div style={resultBadge}>{result.category}</div>
          <div style={resultList}>
            {result.parts.map((p, i) => (
              <div key={i} style={{...resultItem, color: getPartColor(p.type)}}>
                <span style={partType}>{p.type}:</span> {p.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {deckResult && (
        <div style={deckGrid}>
          {deckResult.map((bey, idx) => (
            <div key={idx} style={deckCard}>
              <div style={resultBadge}>Slot {idx + 1}: {bey.system}</div>
              {bey.parts.map((p, pi) => (
                <div key={pi} style={{ fontSize: '0.9rem', marginBottom: '4px', color: getPartColor(p.type) }}>
                  <span style={partType}>{p.type}:</span> {p.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const getPartColor = (type) => {
  if (type === 'Ratchet') return '#fbbf24';
  if (type.includes('Bit')) return '#34d399';
  if (type.includes('Blade') || type.includes('Chip')) return '#60a5fa';
  return '#ffffff';
};

// Additional Styles for your CSS-in-JS
const filterGrid = { 
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
  gap: '10px', 
  marginBottom: '20px' 
};
const checkboxLabel = { fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };
const groupWrapper = { borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '12px' };
const groupHeader = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#0f172a',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: '12px',
  padding: '12px 14px',
  cursor: 'pointer',
  textAlign: 'left'
};
const subgroupWrapper = { marginTop: '10px', paddingLeft: '12px' };
const subgroupHeader = {
  display: 'flex',
  justifyContent: 'space-between', // Pushes title to left, checkbox to right
  alignItems: 'center',
  padding: '10px 15px',
  background: 'rgba(255, 255, 255, 0.05)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#f8fafc',
  fontWeight: '600',
  fontSize: '0.9rem'
};
const selectAllContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '4px 8px',
  borderRadius: '6px',
  background: 'rgba(255, 255, 255, 0.03)',
  cursor: 'pointer',
  transition: 'background 0.2s'
};
const selectAllText = {
  fontSize: '0.7rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '700'
};
const subgroupList = { paddingLeft: '6px', marginTop: '8px' };
const itemList = { display: 'grid', gap: '8px', padding: '10px 14px', background: '#0f172a', borderRadius: '12px' };
const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};
const modalDialog = {
  width: 'min(620px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 18px 60px rgba(15, 23, 42, 0.55)'
};
const modalHeader = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  marginBottom: '18px'
};
const modalCloseBtn = {
  border: 'none',
  background: '#475569',
  color: 'white',
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  cursor: 'pointer'
};
const filterTable = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '20px'
};
const filterTableHeader = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: '0.95rem',
  color: '#cbd5e1',
  borderBottom: '1px solid #334155'
};
const filterTableRow = {
  borderBottom: '1px solid #334155'
};
const filterTableCell = {
  padding: '12px 14px',
  color: '#e2e8f0',
  fontSize: '0.95rem'
};
const modalActions = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  justifyContent: 'flex-end'
};
const modalActionBtn = {
  background: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #475569',
  padding: '10px 16px',
  borderRadius: '10px',
  cursor: 'pointer'
};
const resultContainer = { marginTop: '30px', padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #3b82f6', textAlign: 'center' };
const resultBadge = { background: '#3b82f6', color: 'white', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', marginBottom: '15px' };
const resultList = { display: 'flex', flexDirection: 'column', gap: '10px' };
const resultItem = { fontSize: '1.2rem', fontWeight: 'bold' };
const partType = { color: '#64748b', fontSize: '0.8rem', marginRight: '10px', textTransform: 'uppercase' };
const deckGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '15px',
  marginTop: '30px'
};

const deckCard = {
  background: '#1e293b',
  padding: '15px',
  borderRadius: '10px',
  border: '1px solid #475569'
};

const deckBtn = {
  background: '#8b5cf6', // Purple color for Deck building
  color: 'white',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 'bold',
  cursor: 'pointer',
  flex: 1
};


// --- VIEW: SCOREBOARD (HYBRID MODE) ---
function ScoreboardView({ setView, activeMatch, event_id }) {
  const isTournamentMode = !!activeMatch;
  const [standaloneMode, setStandaloneMode] = useState(2);
  const mode = isTournamentMode ? activeMatch.members.length : standaloneMode;

  const [scores, setScores] = useState(
    isTournamentMode 
      ? activeMatch.members.map(m => m.currentRoundScore || 0) 
      : [0, 0, 0]
  );

  const [isColorblind, setIsColorblind] = useState(() => {
    const saved = localStorage.getItem('scoreboard-colorblind');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('scoreboard-colorblind', JSON.stringify(isColorblind));
  }, [isColorblind]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = isColorblind ? ['#0072B2', '#D55E00', '#F0E442'] : ['#2563eb', '#ef4444', '#10b981'];

  const patterns = [
    { backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' }, // vertical stripes
    { backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' }, // horizontal stripes
    { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' }, // diagonal stripes
  ];

  const handleSubmit = async () => {
    if (!isTournamentMode || isSubmitting) return;
    setIsSubmitting(true);

    const { data } = await supabase.from('events').select('matches').eq('event_id', event_id).single();
    const allRounds = [...data.matches];
    
    activeMatch.members.forEach((m, i) => {
      allRounds[activeMatch.roundIdx][activeMatch.matchIdx].members[i].currentRoundScore = scores[i];
    });
    allRounds[activeMatch.roundIdx][activeMatch.matchIdx].status = 'completed';

    await supabase.from('events').update({ matches: allRounds }).eq('event_id', event_id);
    setView('ACTIVE');
  };

  return (
    <div style={sbContainer}>
      <div className="landscape-lock" style={sbRotationWrapper}>
        <div style={sbOverlay}>
          <button onClick={() => setView(isTournamentMode ? 'ACTIVE' : 'MAIN')} style={sbSmallBtn}>← Exit</button>
          {!isTournamentMode && (
            <button onClick={() => setStandaloneMode(mode === 2 ? 3 : 2)} style={sbSmallBtn}>
              {mode === 2 ? '1v1' : '1v1v1'}
            </button>
          )}
          {isTournamentMode && (
            <button onClick={handleSubmit} style={sbSubmitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : '💾 Submit & Lock'}
            </button>
          )}
          <button onClick={() => setIsColorblind(!isColorblind)} style={sbSmallBtn}>👁 CB</button>
          <button onClick={() => setScores([0,0,0])} style={sbSmallBtn}>Reset</button>
        </div>

        <div style={sbWrapper}>
          {[...Array(mode)].map((_, i) => (
            <div 
              key={i} 
              onClick={() => {
                const s = [...scores]; s[i]++; setScores(s);
              }}
              style={{ ...sbSection, background: colors[i], ...(isColorblind ? patterns[i % patterns.length] : {}), width: `${100 / mode}%` }}
            >
              <div style={sbLabel}>
                {isTournamentMode ? activeMatch.members[i].name : `PLAYER ${i + 1}`}
              </div>
              <div style={sbPoints}>{scores[i]}</div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const s = [...scores]; if(s[i] > 0) s[i]--; setScores(s);
                }} 
                style={sbMinusBtn}
              >
                −
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- VIEW: CREATE NEW EVENT ---
function CreateEventView({ setView, loadEvent }) {
  const [name, setName] = useState('');
  const [pastedNames, setPastedNames] = useState('');
  const [rounds, setRounds] = useState(3);

  const handleCreate = async () => {
    let playerList = pastedNames.split('\n')
      .map(n => n.trim()).filter(n => n !== "")
      .map(name => ({ 
        name, score: 0, wins: 0, opponents: [], id: Math.random().toString(36).substr(2, 9) 
      }));

    if (playerList.length === 0) return alert("Please add players.");

    const remainder = playerList.length % 3;
    if (remainder !== 0) {
      const fillNeeded = 3 - remainder;
      for (let i = 1; i <= fillNeeded; i++) {
        playerList.push({ name: `Imposter ${i}`, score: 0, wins: 0, opponents: [], id: `imp-${i}-${Date.now()}` });
      }
    }

    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    const initialMatches = [];
    for (let i = 0; i < shuffled.length; i += 3) {
      initialMatches.push({ id: i, status: 'pending', members: shuffled.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
    }

    const { data, error } = await supabase.from('events').insert([{
      name: name || "BEYBLADE TOWN LEAGUE",
      players: shuffled,
      matches: [initialMatches], 
      current_round: 1,
      max_rounds: parseInt(rounds),
      status: 'active'
    }]).select();

    if (!error && data) loadEvent(data[0]);
  };

  return (
    <div style={card}>
      <button onClick={() => setView('MAIN')} style={backBtn}>← Back</button>
      <h2 style={sectionTitle}>Initialize Tournament</h2>
      <div style={formGroup}>
        <label style={label}>Event Name</label>
        <input placeholder="e.g. League Round 1" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </div>
      <div style={formGroup}>
        <label style={label}>Total Rounds</label>
        <input type="number" value={rounds} onChange={e => setRounds(e.target.value)} style={smallInput} />
      </div>
      <div style={formGroup}>
        <label style={label}>Player Roster (One name per line)</label>
        <textarea placeholder="Player 1\nPlayer 2..." value={pastedNames} onChange={e => setPastedNames(e.target.value)} rows={8} style={textArea} />
      </div>
      <button onClick={handleCreate} style={primaryBtn}>Start Tournament</button>
    </div>
  );
}

// --- VIEW: HISTORY ---
function HistoryView({ events, setEvents, setView, loadEvent }) {
  return (
    <div>
      <button onClick={() => setView('MAIN')} style={backBtn}>← Back</button>
      <h2 style={sectionTitle}>Previous Events</h2>
      <div style={listContainer}>
        {events.map(e => (
          <div key={e.event_id} style={historyCard}>
            <div>
              <div style={historyName}>{e.name}</div>
              <div style={historyMeta}>{new Date(e.created_at).toLocaleDateString()} • {e.status.toUpperCase()}</div>
            </div>
            <button onClick={() => loadEvent(e)} style={openBtn}>Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VIEW: ACTIVE TOURNAMENT ---
function ActiveTournament({ event, onBack, setRefereeData, setView }) {
  // Logic simplified: Use 'event' directly from props. 
  // App component handles the Realtime syncing.

  const updateMaxRounds = async (newVal) => {
    const val = parseInt(newVal);
    if (isNaN(val) || val < event.current_round) return; 
    await supabase.from('events').update({ max_rounds: val }).eq('event_id', event.event_id);
  };

  const nextRound = async () => {
    const updatedPlayers = [...event.players];
    const currentRoundMatches = event.matches[event.current_round - 1];

    currentRoundMatches.forEach(m => {
      const highest = Math.max(...m.members.map(p => p.currentRoundScore));
      m.members.forEach(member => {
        const pIdx = updatedPlayers.findIndex(p => p.name === member.name);
        if(pIdx !== -1) {
          updatedPlayers[pIdx].score += (member.currentRoundScore || 0);
          if (member.currentRoundScore === highest && highest > 0) updatedPlayers[pIdx].wins += 1;
          const opps = m.members.filter(opp => opp.name !== member.name).map(opp => opp.name);
          updatedPlayers[pIdx].opponents = [...(updatedPlayers[pIdx].opponents || []), ...opps];
        }
      });
    });

    if (event.current_round >= event.max_rounds) {
      await supabase.from('events').update({ players: updatedPlayers, status: 'finished' }).eq('event_id', event.event_id);
      return;
    }

    const sorted = [...updatedPlayers].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return calculateBuchholz(b, updatedPlayers) - calculateBuchholz(a, updatedPlayers);
    });

    const nextMatches = [];
    for (let i = 0; i < sorted.length; i += 3) {
      nextMatches.push({ id: i, status: 'pending', members: sorted.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
    }

    await supabase.from('events').update({
      players: updatedPlayers,
      matches: [...event.matches, nextMatches], 
      current_round: event.current_round + 1,
      status: 'active'
    }).eq('event_id', event.event_id);
  };

  const sortedPlayers = [...event.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return calculateBuchholz(b, event.players) - calculateBuchholz(a, event.players);
  });

  const isFinalized = event.status === 'finished';

  return (
    <div style={activeLayout}>
      <div style={stickyHeader}>
        <div style={headerContent}>
          <div>
            <h2 style={headerTitle}>{event.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ROUNDS:</span>
              <input type="number" min={event.current_round} value={event.max_rounds} onChange={(e) => updateMaxRounds(e.target.value)} style={miniInput} />
            </div>
          </div>
          <button onClick={onBack} style={utilBtn}>Main Menu</button>
        </div>
      </div>

      <div style={roundScrollArea}>
        {event.matches.map((roundMatches, rIdx) => {
          const isCompleted = rIdx + 1 < event.current_round;
          return (
            <div key={rIdx}>
              <div style={isCompleted ? completedRound : currentRound}>
                <div style={roundHeader}>
                  <span style={roundBadge}>ROUND {rIdx + 1}</span>
                  {isCompleted && <span style={statusTag}>Match History</span>}
                </div>
                <div style={matchGrid}>
                {roundMatches.map((m, mIdx) => {
                  const getCardBackground = () => {
                    if (m.status === 'pending') return '#1e293b';
                    if (m.status === 'playing') return '#1e3a2f';
                    if (m.status === 'completed') return '#2d3a1a';
                    return '#1e293b';
                  };
                  
                  const getWinner = () => {
                    if (m.status !== 'completed') return null;
                    const maxScore = Math.max(...m.members.map(p => p.currentRoundScore || 0));
                    return m.members.find(p => (p.currentRoundScore || 0) === maxScore);
                  };
                  
                  const winner = getWinner();
                  
                  return (
                  <div key={mIdx} style={{ ...matchCard, background: getCardBackground() }}>
                    <div style={matchLabel}>STADIUM {mIdx + 1}</div>
                    {m.members.map((p, pIdx) => {
                      const isWinner = winner && p.name === winner.name;
                      const winnerStyle = isWinner ? { ...matchRow, background: 'rgba(16, 185, 129, 0.2)', borderLeft: '4px solid #10b981', paddingLeft: '8px' } : matchRow;
                      return (
                      <div key={pIdx} style={winnerStyle}>
                        <span style={pName}>{isWinner ? '🏆 ' : ''}{p.name}</span>
                        <span style={scoreDisplay}>{p.currentRoundScore || 0}</span>
                      </div>
                      );
                    })}
                    {!isCompleted && !isFinalized && (
                      <button 
                        onClick={async () => {
                          const updatedMatches = [...event.matches];
                          updatedMatches[rIdx][mIdx].status = 'playing';
                          await supabase.from('events').update({ matches: updatedMatches }).eq('event_id', event.event_id);
                          setRefereeData({ roundIdx: rIdx, matchIdx: mIdx, members: m.members });
                          setView('SCOREBOARD');
                        }}
                        style={m.status === 'pending' ? playBtn : editBtn}
                      >
                        {m.status === 'pending' ? '▶️ Play Match' : '📝 Edit Match'}
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
            {rIdx + 1 === event.current_round && !isFinalized && (
              <div style={stickyButtonContainer}>
                <button onClick={nextRound} style={roundActionBtn}>
                  {event.current_round >= event.max_rounds ? "🏁 Finalize Standings" : "Confirm Round & Next Pairings"}
                </button>
              </div>
            )}
            </div>
          );
        })}

        {[...Array(Math.max(0, event.max_rounds - event.matches.length))].map((_, i) => {
          const futureRoundNum = event.matches.length + i + 1;
          return (
            <div key={`future-${i}`} style={{ ...completedRound, opacity: 0.3 }}>
              <div style={roundHeader}>
                <span style={roundBadge}>ROUND {futureRoundNum}</span>
                <span style={statusTag}>Upcoming</span>
              </div>
              <div style={{ ...matchGrid, opacity: 0.5 }}>
                <div style={matchCard}>
                  <div style={matchLabel}>Matches pending confirmation</div>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>This round will be created once the previous round is confirmed.</p>
                </div>
              </div>
            </div>
          );
        })}

        <div style={standingContainer}>
          <h3 style={sectionTitle}>📊 Live Standings</h3>
          <div style={tableWrapper}>
            <table style={standingsTable}>
              <thead>
                <tr>
                  <th style={th}>Rank</th>
                  <th style={thLeft}>Player</th>
                  <th style={thCenter}>Score</th>
                  <th style={thCenter}>Wins</th>
                  <th style={thCenter}>BH</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, i) => (
                  <tr key={i} style={tr}>
                    <td style={tdRank}>#{i + 1}</td>
                    <td style={tdName}>{p.name}</td>
                    <td style={tdCenter}>{p.score}</td>
                    <td style={tdCenter}>{p.wins}</td>
                    <td style={tdBH}>{calculateBuchholz(p, event.players)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}





// --- STYLES (UNCHANGED) ---
const appContainer = { minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '20px 10px', fontFamily: 'system-ui' };
const contentWrapper = { maxWidth: '1000px', margin: '0 auto' };
const heroSection = { textAlign: 'center', padding: '80px 0' };
const heroTitle = { fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '800', marginBottom: '40px' };
const brandSpan = { display: 'block', color: '#3b82f6', fontSize: '1.5rem', marginTop: '10px' };
const buttonGroup = { display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '320px', margin: '0 auto' };
const primaryBtn = { background: '#2563eb', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' };
const secondaryBtn = { background: '#334155', color: '#f8fafc', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' };
const accentBtn = { background: '#1e293b', color: '#10b981', padding: '16px', borderRadius: '12px', border: '1px solid #10b981', fontWeight: '700', cursor: 'pointer' };
const card = { background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' };
const smallInput = { ...inputStyle, width: '80px' };
const miniInput = { background: '#0f172a', border: '1px solid #3b82f6', color: 'white', borderRadius: '4px', width: '50px', textAlign: 'center', fontSize: '0.8rem' };
const textArea = { ...inputStyle, resize: 'vertical' };
const backBtn = { background: 'transparent', color: '#3b82f6', border: 'none', cursor: 'pointer', marginBottom: '20px', fontWeight: '600' };
const historyCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', marginBottom: '10px' };
const historyName = { fontWeight: '700', fontSize: '1.1rem' };
const historyMeta = { color: '#64748b', fontSize: '0.85rem' };
const openBtn = { background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' };
const stickyHeader = { position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #334155', zIndex: 100, padding: '15px' };
const headerContent = { maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const headerTitle = { margin: 0, fontSize: '1.1rem', color: '#3b82f6' };
const utilBtn = { background: '#334155', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' };
const roundScrollArea = { display: 'flex', flexDirection: 'column', gap: '50px', padding: '40px 0' };
const currentRound = { opacity: 1 };
const completedRound = { opacity: 0.4, filter: 'grayscale(0.8)' };
const roundHeader = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' };
const roundBadge = { background: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' };
const statusTag = { fontSize: '0.75rem', color: '#64748b' };
const matchGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const matchCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' };
const matchLabel = { fontSize: '0.6rem', fontWeight: '800', color: '#64748b', marginBottom: '10px' };
const matchRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' };
const roundActionBtn = { ...primaryBtn, margin: '20px auto', display: 'block', width: '100%', maxWidth: '400px' };
const stickyButtonContainer = { position: 'sticky', bottom: '20px', margin: '20px auto', zIndex: 50, display: 'flex', justifyContent: 'center' };
const standingContainer = { background: '#1e293b', padding: '25px', borderRadius: '20px', border: '2px solid #2563eb' };
const standingsTable = { width: '100%', borderCollapse: 'collapse' };
const th = { padding: '10px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #334155' };
const thLeft = { ...th, textAlign: 'left' };
const thCenter = { ...th, textAlign: 'center' };
const tr = { borderBottom: '1px solid #334155' };
const tdRank = { padding: '12px', textAlign: 'center', fontWeight: '800', color: '#3b82f6' };
const tdName = { padding: '12px', fontWeight: '600' };
const tdCenter = { padding: '12px', textAlign: 'center' };
const tdBH = { ...tdCenter, color: '#94a3b8' };
const sectionTitle = { fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px' };
const label = { fontSize: '0.85rem', color: '#94a3b8' };
const formGroup = { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px' };
const listContainer = { display: 'flex', flexDirection: 'column' };
const pName = { fontWeight: '500' };
const activeLayout = { paddingTop: '60px' };

const sbContainer = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 9999, overflow: 'hidden' };
const sbRotationWrapper = { width: '100%', height: '100%' };
const sbOverlay = { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', gap: '10px', width: '90%', justifyContent: 'center' };
const sbSmallBtn = { background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', backdropFilter: 'blur(4px)' };
const sbSubmitBtn = { ...sbSmallBtn, background: '#10b981', border: 'none', fontWeight: 'bold' };
const sbWrapper = { display: 'flex', width: '100%', height: '100%' };
const sbSection = { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', userSelect: 'none', position: 'relative' };
const sbPoints = { fontSize: 'clamp(6rem, 25vw, 18rem)', fontWeight: '900', color: 'white', textShadow: '0 10px 20px rgba(0,0,0,0.4)', lineHeight: '0.8' };
const sbLabel = { fontSize: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.3em', marginBottom: '20px', textTransform: 'uppercase' };
const sbMinusBtn = { position: 'absolute', bottom: '40px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white', width: '60px', height: '60px', borderRadius: '50%', fontSize: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 10 };
const playBtn = { width: '100%', marginTop: 'auto', padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const editBtn = { ...playBtn, background: '#334155', color: '#94a3b8' };
const scoreDisplay = { fontWeight: 'bold', color: '#3b82f6', fontSize: '1.2rem' };

const libraryContainer = { padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'white' };
const tableSection = { marginBottom: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '15px' };
const tableHeaderRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' };
const filterRowStyle = { display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' };
const filterSelectStyle = { background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' };
const searchBarStyle = { background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px 12px', borderRadius: '6px', width: '200px' };
const tableWrapper = { overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' };
const partsTable = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const thStyle = { padding: '12px', borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' };
const tdStyle = { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' };
const tdNameStyle = { ...tdStyle, fontWeight: 'bold', color: '#6366f1' };
const badgeStyle = { background: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' };
const trStyle = { transition: 'background 0.2s' };
const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  marginBottom: '30px',
  paddingBottom: '15px',
  borderBottom: '1px solid rgba(255,255,255,0.1)'
};

const backBtnStyle = {
  padding: '8px 16px',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'white',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'background 0.2s'
};