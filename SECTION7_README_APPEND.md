
## Section 7 — Tournament Backup & Recovery

This section adds a safe tournament snapshot and recovery workflow.

### New capabilities

- Download the active tournament as a versioned JSON backup.
- Backup includes the roster, match history, scores, tournament format, and current state.
- Validate backup schema/version before restore.
- Restore a backup as a **new tournament**, rather than overwriting the source event.
- Generate a fresh event ID during restore.
- Remove server-managed revision/timestamp fields from restored snapshots so the new event starts cleanly.
- Access **Backup / Restore** directly from the active tournament screen.

### New files

- `src/eventBackup.js` — backup schema, validation, serialization, restore helpers, and safe filenames.
- `src/eventBackup.test.js` — backup/restore regression tests.
- `src/views/EventBackupPanel.jsx` — browser UI for downloading and restoring tournament backups.

### Safety model

Restore never updates the existing event. The selected JSON is validated first, then inserted through the existing `createEvent` service as a new event. This keeps the original tournament and its revision history intact.

### Backup format

```json
{
  "schema": "beyden-event-backup",
  "version": 1,
  "exportedAt": "...",
  "event": { "...": "tournament snapshot" }
}
```

### Validation

The Section 7 backup tests cover snapshot creation, serialization/parsing, malformed backup rejection, clean new-event restoration, and safe filename generation.

As with previous sections, a full Vite production build should be run on a normal development machine with the project's npm dependencies installed.
