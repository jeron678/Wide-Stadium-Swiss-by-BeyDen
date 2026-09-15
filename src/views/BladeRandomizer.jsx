import React, { useState, useEffect } from 'react';
import { CATEGORIES, GENERAL_GROUPS } from '../appConstants.js';
import {
  filterGrid, checkboxLabel, groupWrapper, groupHeader, subgroupWrapper, subgroupHeader, selectAllContainer, selectAllText, subgroupList, itemList,
  modalOverlay, modalDialog, modalHeader, modalCloseBtn, filterTable, filterTableHeader, filterTableRow, filterTableCell, modalActions, modalActionBtn,
  resultContainer, resultBadge, resultList, resultItem, partType, deckGrid, deckCard, deckBtn, getPartColor
} from '../styles/appStyles.js';

export const buildItemGroups = (matrix) => {
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

  const categoryCanGenerate = (cat) => {
    if (!categoryHasSelectedItems(cat)) return false;

    // Check if the category has the required blade parts for generation
    if (cat === 'CX') {
      return getBladeParts('CX', 'Lock Chip').length > 0 &&
             getBladeParts('CX', 'Main Blade').length > 0 &&
             getBladeParts('CX', 'Assist Blade').length > 0;
    } else if (cat === 'CX-Expand') {
      return getBladeParts('CX', 'Lock Chip').length > 0 &&
             getBladeParts('CX-Expand', 'Metal Blade').length > 0 &&
             getBladeParts('CX-Expand', 'Over Blade').length > 0 &&
             getBladeParts('CX', 'Assist Blade').length > 0;
    } else {
      // For all other systems (BX, UX, UX-Expand, etc.), need Main Blade
      return getBladeParts(cat, 'Main Blade').length > 0;
    }
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

  const getGeneralPartsBySubcategory = (headerName, subCategory) => {
    const parts = [];
    itemGroups.forEach(group => {
      if (group.category === headerName && group.subCategory === subCategory) {
        group.items.forEach(item => {
          if (isItemSelected(itemKey(group.category, group.subCategory, item))) parts.push(item);
        });
      }
    });
    return Array.from(new Set(parts));
  };

  const getBladePartSubcategory = (cat, partName) => {
    for (const group of itemGroups) {
      if (group.category === cat && group.items.includes(partName)) {
        return group.subCategory;
      }
    }
    return null;
  };

  const pick = (list) => (list && list.length > 0) ? list[Math.floor(Math.random() * list.length)] : null;

  const getMissingBladePartMessage = (cat) => {
    if (cat === 'CX') {
      const missing = [];
      if (getBladeParts('CX', 'Lock Chip').length === 0) missing.push('Lock Chip');
      if (getBladeParts('CX', 'Main Blade').length === 0) missing.push('Main Blade');
      if (getBladeParts('CX', 'Assist Blade').length === 0) missing.push('Assist Blade');
      return missing.length > 0 ? `Select ${missing.join(', ')} for CX` : null;
    } else if (cat === 'CX-Expand') {
      const missing = [];
      if (getBladeParts('CX', 'Lock Chip').length === 0) missing.push('Lock Chip');
      if (getBladeParts('CX-Expand', 'Metal Blade').length === 0) missing.push('Metal Blade');
      if (getBladeParts('CX-Expand', 'Over Blade').length === 0) missing.push('Over Blade');
      if (getBladeParts('CX', 'Assist Blade').length === 0) missing.push('Assist Blade');
      return missing.length > 0 ? `Select ${missing.join(', ')} for CX-Expand` : null;
    } else {
      if (getBladeParts(cat, 'Main Blade').length === 0) {
        return `Select Main Blade parts for ${cat}`;
      }
    }
    return null;
  };

  const generateRandom = () => {
    const activeCats = CATEGORIES.filter(categoryCanGenerate);
    if (activeCats.length === 0) return alert("Select at least one system with selected blade parts.");

    const chosenCat = activeCats[Math.floor(Math.random() * activeCats.length)];
    
    // Double-check blade parts are available
    const missingMessage = getMissingBladePartMessage(chosenCat);
    if (missingMessage) return alert(missingMessage);
    
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
      const mainBladeName = combo.find(p => p.type === 'Blade')?.name;
      const forceSimpleRatchet = chosenCat === 'UX' && mainBladeName === 'Clock Mirage';
      const useIntegrated = !forceSimpleRatchet && integrated.length > 0 && Math.random() < 0.15;

      if (useIntegrated) {
        combo.push({ type: 'Integrated-Bit', name: pick(integrated) });
      } else {
        const ratchetSource = forceSimpleRatchet
          ? getGeneralPartsBySubcategory('Ratchets', 'Simple')
          : ratchets;

        if (forceSimpleRatchet && ratchetSource.length === 0) {
          return alert("Clock Mirage requires a Simple ratchet. Please enable Simple Ratchets in the item selector.");
        }

        combo.push({ type: 'Ratchet', name: pick(ratchetSource) });
        combo.push({ type: 'Bit', name: pick(bits) });
      }
    }

    if (combo.some(p => !p.name)) return alert("Missing parts in selection. Check Item Selector.");
    setResult({ category: chosenCat, parts: combo });
    setDeckResult(null);
  };

  const generate3on3 = () => {
    const activeCats = CATEGORIES.filter(categoryCanGenerate);
    if (activeCats.length === 0) return alert("Select systems with blade parts in the filter.");
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
      if (available.length === 0) return null;

      const selection = pick(available);
      set.add(selection);
      return selection;
    };

    const buildBey = (cat) => {
      const bey = { system: cat, parts: [] };
      const mainBladeName = cat === 'CX'
        ? pickUnique(getBladeParts('CX', 'Main Blade'), usedBlades)
        : cat === 'CX-Expand'
          ? pickUnique(getBladeParts('CX-Expand', 'Main Blade'), usedBlades)
          : pickUnique(getBladeParts(cat, 'Main Blade'), usedBlades);

      if (cat === 'CX') {
        const lockChip = pickUnique(getBladeParts('CX', 'Lock Chip'), usedBlades);
        const assist = pickUnique(getBladeParts('CX', 'Assist Blade'), usedBlades);
        if (!lockChip || !mainBladeName || !assist) return null;
        bey.parts.push({ type: 'Lock Chip', name: lockChip });
        bey.parts.push({ type: 'Main Blade', name: mainBladeName });
        bey.parts.push({ type: 'Assist Blade', name: assist });
      } else if (cat === 'CX-Expand') {
        const lockChip = pickUnique(getBladeParts('CX', 'Lock Chip'), usedBlades);
        const metalBlade = pickUnique(getBladeParts('CX-Expand', 'Metal Blade'), usedBlades);
        const overBlade = pickUnique(getBladeParts('CX-Expand', 'Over Blade'), usedBlades);
        const assist = pickUnique(getBladeParts('CX', 'Assist Blade'), usedBlades);
        if (!lockChip || !metalBlade || !overBlade || !assist) return null;
        bey.parts.push({ type: 'Lock Chip', name: lockChip });
        bey.parts.push({ type: 'Metal Blade', name: metalBlade });
        bey.parts.push({ type: 'Over Blade', name: overBlade });
        bey.parts.push({ type: 'Assist Blade', name: assist });
      } else {
        if (!mainBladeName) return null;
        bey.parts.push({ type: 'Blade', name: mainBladeName });
      }

      if (cat === 'UX-Expand') {
        const bitName = pickUnique(getGeneralParts('Bits'), usedBits) || pick(getGeneralParts('Bits'));
        if (!bitName) return null;
        bey.parts.push({ type: 'Bit', name: bitName });
      } else {
        const bitsList = getGeneralParts('Bits');
        const integratedList = getGeneralParts('Integrated-Bit');
        const forceSimpleRatchet = cat === 'UX' && bey.parts.find(p => p.type === 'Blade')?.name === 'Clock Mirage';
        const ratchetCandidates = forceSimpleRatchet
          ? getGeneralPartsBySubcategory('Ratchets', 'Simple')
          : getGeneralParts('Ratchets');

        const tryIntegratedFirst = !forceSimpleRatchet && Math.random() < 0.3;
        let partSelected = null;

        if (tryIntegratedFirst) {
          partSelected = pickUnique(integratedList, usedBits);
          if (partSelected) {
            bey.parts.push({ type: 'Integrated-Bit', name: partSelected });
          }
        }

        if (!partSelected) {
          const bitName = pickUnique(bitsList, usedBits);
          const ratchetName = pickUnique(ratchetCandidates, usedRatchets);
          if (!bitName || !ratchetName) return null;
          bey.parts.push({ type: 'Ratchet', name: ratchetName });
          bey.parts.push({ type: 'Bit', name: bitName });
        }
      }

      return bey;
    };

    const buildSlot = () => {
      const categories = [...activeCats];
      while (categories.length > 0) {
        const pickIndex = Math.floor(Math.random() * categories.length);
        const cat = categories.splice(pickIndex, 1)[0];
        const missingMessage = getMissingBladePartMessage(cat);
        if (missingMessage) continue;
        const bey = buildBey(cat);
        if (bey && bey.parts.every(p => p.name)) {
          return bey;
        }
      }
      return null;
    };

    for (let i = 0; i < 3; i++) {
      const bey = buildSlot();
      if (!bey) {
        return alert("Unable to generate a valid 3on3 deck with the current selection. Try enabling more parts or allow repeats.");
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
                          {subgroups.filter(group => group.items.length > 0).map(group => {
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

