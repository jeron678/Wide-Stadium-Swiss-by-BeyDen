import React from 'react'
import { ScoreboardView } from './App.jsx'

export default function ScoreboardApp() {
  const handleExit = () => {
    window.location.href = '/'
  }

  return (
    <ScoreboardView
      setView={handleExit}
      activeMatch={null}
      event_id={null}
    />
  )
}