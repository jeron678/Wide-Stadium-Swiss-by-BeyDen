import React, { useState } from 'react';
import { createEvent as createEventRecord } from '../eventService.js';
import { calculateSingleEliminationRounds } from '../tournamentUtils.js';
import { createTournamentPlayers, generateSwissMatches, generateEliminationMatches, SWISS_FORMAT, ELIMINATION_FORMAT } from '../tournamentEngine.js';
import { card, backBtn, sectionTitle, formGroup, label, inputStyle, smallInput, textArea, primaryBtn } from '../styles/appStyles.js';

export function CreateEventView({ setView, loadEvent }) {
  const [name, setName] = useState('');
  const [pastedNames, setPastedNames] = useState('');
  const [rounds, setRounds] = useState(3);
  const [format, setFormat] = useState(SWISS_FORMAT);
  const [publicEnabled, setPublicEnabled] = useState(true);

  const handleCreate = async () => {
    const names = pastedNames.split('\n').map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return alert('Please add players.');

    const duplicateNames = names.filter((playerName, index) => names.findIndex(value => value.toLowerCase() === playerName.toLowerCase()) !== index);
    if (duplicateNames.length) return alert(`Duplicate player names are not allowed: ${[...new Set(duplicateNames)].join(', ')}`);

    const realPlayers = createTournamentPlayers(names);
    const maxRounds = format === ELIMINATION_FORMAT
      ? calculateSingleEliminationRounds(realPlayers.length)
      : Math.max(1, parseInt(rounds, 10) || 1);

    const initial = format === SWISS_FORMAT
      ? generateSwissMatches(realPlayers, 1)
      : generateEliminationMatches(realPlayers, 1);

    const eventPlayers = initial.roster;
    const eventMatches = initial.matches;

    try {
      const created = await createEventRecord({
        name: name.trim() || 'BEYBLADE TOWN LEAGUE',
        players: eventPlayers,
        matches: [eventMatches],
        current_round: 1,
        max_rounds: maxRounds,
        status: 'active',
        format,
        public_enabled: publicEnabled,
      });
      if (created) loadEvent(created);
    } catch (error) {
      alert(`Unable to create tournament: ${error?.message || 'Unknown error'}`);
    }
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
        <label style={label}>Tournament Format</label>
        <select value={format} onChange={e => setFormat(e.target.value)} style={inputStyle}>
          <option value={SWISS_FORMAT}>1v1v1 Swiss</option>
          <option value={ELIMINATION_FORMAT}>1v1v1 Knockout</option>
        </select>
      </div>
      <div style={formGroup}>
        <label style={{ ...label, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={publicEnabled} onChange={e => setPublicEnabled(e.target.checked)} />
          Enable public live tournament page
        </label>
        <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Anyone with the live link can view standings and match progress. No login is required.</div>
      </div>
      {format === SWISS_FORMAT && (
        <div style={formGroup}>
          <label style={label}>Total Rounds</label>
          <input type="number" min="1" value={rounds} onChange={e => setRounds(e.target.value)} style={smallInput} />
        </div>
      )}
      <div style={formGroup}>
        <label style={label}>Player Roster (One name per line)</label>
        <textarea placeholder="Player 1\nPlayer 2..." value={pastedNames} onChange={e => setPastedNames(e.target.value)} rows={8} style={textArea} />
        <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '6px' }}>
          1v1v1 matches are automatically balanced with Imposter placeholders when the roster is not divisible by 3.
        </div>
      </div>
      <button onClick={handleCreate} style={primaryBtn}>Start Tournament</button>
    </div>
  );
}
