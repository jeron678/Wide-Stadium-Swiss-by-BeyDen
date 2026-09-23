// Shared application styles and Blade Randomizer styles.
export const getPartColor = (type) => {
  if (type === 'Ratchet') return '#fbbf24';
  if (type.includes('Bit')) return '#34d399';
  if (type.includes('Blade') || type.includes('Chip')) return '#60a5fa';
  return '#ffffff';
};

// Additional Styles for your CSS-in-JS
export const filterGrid = { 
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
  gap: '10px', 
  marginBottom: '20px' 
};
export const checkboxLabel = { fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };
export const groupWrapper = { borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '12px' };
export const groupHeader = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  border: '1px solid #334155',
  borderRadius: '12px',
  padding: '12px 14px',
  cursor: 'pointer',
  textAlign: 'left'
};
export const subgroupWrapper = { marginTop: '10px', paddingLeft: '12px' };
export const subgroupHeader = {
  display: 'flex',
  justifyContent: 'space-between', // Pushes title to left, checkbox to right
  alignItems: 'center',
  padding: '10px 15px',
  background: 'rgba(255, 255, 255, 0.05)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  color: 'var(--text-h)',
  fontWeight: '600',
  fontSize: '0.9rem'
};
export const selectAllContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '4px 8px',
  borderRadius: '6px',
  background: 'rgba(255, 255, 255, 0.03)',
  cursor: 'pointer',
  transition: 'background 0.2s'
};
export const selectAllText = {
  fontSize: '0.7rem',
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '700'
};
export const subgroupList = { paddingLeft: '6px', marginTop: '8px' };
export const itemList = { display: 'grid', gap: '8px', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '12px' };
export const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'color-mix(in srgb, var(--bg) 78%, transparent)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};
export const modalDialog = {
  width: 'min(620px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: 'var(--surface)',
  border: '1px solid #374151',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 18px 60px rgba(15, 23, 42, 0.55)'
};
export const modalHeader = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  marginBottom: '18px'
};
export const modalCloseBtn = {
  border: 'none',
  background: 'var(--border)',
  color: 'var(--text-h)',
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  cursor: 'pointer'
};
export const filterTable = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '20px'
};
export const filterTableHeader = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: '0.95rem',
  color: 'var(--text)',
  borderBottom: '1px solid #334155'
};
export const filterTableRow = {
  borderBottom: '1px solid #334155'
};
export const filterTableCell = {
  padding: '12px 14px',
  color: 'var(--text)',
  fontSize: '0.95rem'
};
export const modalActions = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  justifyContent: 'flex-end'
};
export const modalActionBtn = {
  background: 'var(--surface-2)',
  color: 'var(--text-h)',
  border: '1px solid #475569',
  padding: '10px 16px',
  borderRadius: '10px',
  cursor: 'pointer'
};
export const resultContainer = { marginTop: '30px', padding: '20px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid #3b82f6', textAlign: 'center' };
export const resultBadge = { background: 'var(--accent)', color: 'var(--text-h)', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', marginBottom: '15px' };
export const resultList = { display: 'flex', flexDirection: 'column', gap: '10px' };
export const resultItem = { fontSize: '1.2rem', fontWeight: 'bold' };
export const partType = { color: 'var(--muted)', fontSize: '0.8rem', marginRight: '10px', textTransform: 'uppercase' };
export const deckGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '15px',
  marginTop: '30px'
};

export const deckCard = {
  background: 'var(--surface-3)',
  padding: '15px',
  borderRadius: '10px',
  border: '1px solid #475569'
};

export const deckBtn = {
  background: '#7c5ce6', // Purple color for Deck building
  color: 'var(--text-h)',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 'bold',
  cursor: 'pointer',
  flex: 1
};



export const appContainer = { minHeight: '100vh', background: 'var(--surface-2)', color: 'var(--text-h)', padding: '20px 10px', fontFamily: 'system-ui' };
export const contentWrapper = { maxWidth: '1000px', margin: '0 auto' };
export const heroSection = { textAlign: 'center', padding: '80px 0' };
export const heroTitle = { fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '800', marginBottom: '40px' };
export const brandSpan = { display: 'block', color: 'var(--accent)', fontSize: '1.5rem', marginTop: '10px' };
export const buttonGroup = { display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '320px', margin: '0 auto' };
export const primaryBtn = { background: 'var(--accent-strong)', color: 'var(--text-h)', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' };
export const secondaryBtn = { background: 'var(--border)', color: 'var(--text-h)', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' };
export const accentBtn = { background: 'var(--surface-3)', color: 'var(--success)', padding: '16px', borderRadius: '12px', border: '1px solid #10b981', fontWeight: '700', cursor: 'pointer' };
export const card = { background: 'var(--surface-3)', padding: '30px', borderRadius: '16px', border: '1px solid #334155' };
export const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: 'var(--surface-2)', color: 'var(--text-h)' };
export const smallInput = { ...inputStyle, width: '80px' };
export const miniInput = { background: 'var(--surface-2)', border: '1px solid #3b82f6', color: 'var(--text-h)', borderRadius: '4px', width: '50px', textAlign: 'center', fontSize: '0.8rem' };
export const textArea = { ...inputStyle, resize: 'vertical' };
export const backBtn = { background: 'transparent', color: 'var(--accent)', border: 'none', cursor: 'pointer', marginBottom: '20px', fontWeight: '600' };
export const historyCard = { background: 'var(--surface-3)', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', marginBottom: '10px' };
export const historyName = { fontWeight: '700', fontSize: '1.1rem' };
export const historyMeta = { color: 'var(--muted)', fontSize: '0.85rem' };
export const openBtn = { background: 'var(--accent)', color: 'var(--text-h)', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' };
export const stickyHeader = { position: 'relative', width: '100%', boxSizing: 'border-box', background: 'color-mix(in srgb, var(--surface) 96%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', zIndex: 10, padding: '10px 15px', marginBottom: '12px' };
export const headerContent = { maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
export const headerTitle = { margin: 0, fontSize: '1.1rem', color: 'var(--accent)' };
export const utilBtn = { background: 'var(--border)', color: 'var(--text-h)', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', flexWrap: 'wrap', gap: '10px' };
export const roundScrollArea = { display: 'flex', flexDirection: 'column', gap: '50px', padding: '40px 0' };
export const currentRound = { opacity: 1 , scrollMarginTop: '20px'};
export const completedRound = { opacity: 0.4, filter: 'grayscale(0.8)' };
export const roundHeader = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' };
export const roundBadge = { background: 'var(--accent-strong)', color: 'var(--text-h)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' };
export const statusTag = { fontSize: '0.75rem', color: 'var(--muted)' };
export const matchGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
export const matchCard = { background: 'var(--surface-3)', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' };
export const matchLabel = { fontSize: '0.6rem', fontWeight: '800', color: 'var(--muted)', marginBottom: '10px' };
export const matchRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' };
export const roundActionBtn = { ...primaryBtn, margin: '20px auto', display: 'block', width: '100%', maxWidth: '400px' };
export const stickyButtonContainer = { position: 'sticky', bottom: '20px', margin: '20px auto', zIndex: 50, display: 'flex', justifyContent: 'center' };
export const standingContainer = { background: 'var(--surface-3)', padding: '25px', borderRadius: '20px', border: '2px solid #2563eb' };
export const standingsTable = { width: '100%', borderCollapse: 'collapse' };
export const th = { padding: '10px', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #334155' };
export const thLeft = { ...th, textAlign: 'left' };
export const thCenter = { ...th, textAlign: 'center' };
export const tr = { borderBottom: '1px solid #334155' };
export const tdRank = { padding: '12px', textAlign: 'center', fontWeight: '800', color: 'var(--accent)' };
export const tdName = { padding: '12px', fontWeight: '600' };
export const tdCenter = { padding: '12px', textAlign: 'center' };
export const tdBH = { ...tdCenter, color: 'var(--muted)' };
export const sectionTitle = { fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px' };
export const label = { fontSize: '0.85rem', color: 'var(--muted)' };
export const formGroup = { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px' };
export const listContainer = { display: 'flex', flexDirection: 'column' };
export const pName = { fontWeight: '500' };
export const activeLayout = { minHeight: '100vh', paddingTop: '12px' };

export const playBtn = { width: '100%', marginTop: 'auto', padding: '10px', background: 'var(--success)', color: 'var(--text-h)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
export const editBtn = { ...playBtn, background: 'var(--border)', color: 'var(--muted)' };
export const scoreDisplay = { fontWeight: 'bold', color: 'var(--accent)', fontSize: '1.2rem' };

export const matchLinkRow = { display: 'flex', gap: '6px', marginBottom: '12px' };
export const matchLinkBtn = { flex: 1, padding: '7px 8px', borderRadius: '7px', border: '1px solid #475569', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' };

export const libraryContainer = { padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-h)' };
export const tableSection = { marginBottom: '40px', background: 'color-mix(in srgb, var(--surface-3) 70%, transparent)', borderRadius: '12px', padding: '15px' };
export const tableHeaderRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' };
export const filterRowStyle = { display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' };
export const filterSelectStyle = { background: 'var(--surface-3)', border: '1px solid #334155', color: 'var(--text-h)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' };
export const searchBarStyle = { background: 'var(--surface-3)', border: '1px solid #334155', color: 'var(--text-h)', padding: '8px 12px', borderRadius: '6px', width: '200px' };
export const tableWrapper = { overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' };
export const partsTable = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
export const thStyle = { padding: '12px', borderBottom: '2px solid #334155', color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' };
export const tdStyle = { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' };
export const tdNameStyle = { ...tdStyle, fontWeight: 'bold', color: '#5366d9' };
export const badgeStyle = { background: 'var(--border)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' };
export const trStyle = { transition: 'background 0.2s' };
export const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  marginBottom: '30px',
  paddingBottom: '15px',
  borderBottom: '1px solid rgba(255,255,255,0.1)'
};

export const backBtnStyle = {
  padding: '8px 16px',
  background: 'color-mix(in srgb, var(--border) 70%, transparent)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'var(--text-h)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'background 0.2s'
};
