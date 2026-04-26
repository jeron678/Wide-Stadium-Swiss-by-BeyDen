import React, { useState, useEffect } from 'react';

export default function App() {
  const [inputNames, setInputNames] = useState('');
  const [players, setPlayers] = useState([]);
  const [round, setRound] = useState(0);
  const [matches, setMatches] = useState([]);

  // 1. Initialize Tournament
  const startTournament = () => {
    const playerList = inputNames.split('\n')
      .map(n => n.trim())
      .filter(n => n !== "")
      .map(name => ({ name, score: 0, wins: 0, id: Math.random() }));
    
    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    setPlayers(shuffled);
    setRound(1);
    generateMatches(shuffled);
  };

  // 2. 1v1v1 Matching Logic
  const generateMatches = (currentPlayers) => {
    // Sort by score (Swiss: winners play winners)
    const sorted = [...currentPlayers].sort((a, b) => b.score - a.score);
    const newMatches = [];
    
    for (let i = 0; i < sorted.length; i += 3) {
      const group = sorted.slice(i, i + 3);
      newMatches.push({
        id: i,
        members: group.map(p => ({ ...p, currentRoundScore: 0 })),
        submitted: false
      });
    }
    setMatches(newMatches);
  };

  // 3. Update Individual Score
  const updateScore = (matchId, playerIdx, val) => {
    const updated = [...matches];
    updated[matchId].members[playerIdx].currentRoundScore = parseInt(val) || 0;
    setMatches(updated);
  };

  // 4. Submit Round
  const nextRound = () => {
    const updatedPlayers = [...players];
    
    matches.forEach(m => {
      const highest = Math.max(...m.members.map(p => p.currentRoundScore));
      m.members.forEach(member => {
        const pIdx = updatedPlayers.findIndex(p => p.name === member.name);
        updatedPlayers[pIdx].score += member.currentRoundScore;
        if (member.currentRoundScore === highest && highest > 0) {
          updatedPlayers[pIdx].wins += 1;
        }
      });
    });

    setPlayers(updatedPlayers);
    setRound(prev => prev + 1);
    generateMatches(updatedPlayers);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto' }}>
      <h1>1v1v1 Swiss Manager</h1>
      
      {round === 0 ? (
        <div>
          <textarea 
            placeholder="Enter names (one per line)" 
            value={inputNames}
            onChange={(e) => setInputNames(e.target.value)}
            rows={10} style={{ width: '100%' }}
          />
          <button onClick={startTournament} style={{ marginTop: '10px', padding: '10px' }}>
            Start Round 1 (Random Shuffle)
          </button>
        </div>
      ) : (
        <div>
          <h2>Round {round}</h2>
          {matches.map((m, mIdx) => (
            <div key={mIdx} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px' }}>
              <h4>Match {mIdx + 1}</h4>
              {m.members.map((p, pIdx) => (
                <div key={pIdx} style={{ marginBottom: '5px' }}>
                  <span>{p.name}: </span>
                  <input 
                    type="number" 
                    onChange={(e) => updateScore(mIdx, pIdx, e.target.value)}
                    style={{ width: '50px' }}
                  />
                </div>
              ))}
            </div>
          ))}
          <button onClick={nextRound} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none' }}>
            Submit Round & Generate Next
          </button>
          
          <h3 style={{ marginTop: '30px' }}>Standings</h3>
          <ul>
            {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
              <li key={i}>{p.name} — Total: {p.score} (Wins: {p.wins})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}