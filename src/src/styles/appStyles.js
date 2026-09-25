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
  background: '#0f172a',
  color: '#e2e8f0',
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
  color: '#f8fafc',
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
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '700'
};
export const subgroupList = { paddingLeft: '6px', marginTop: '8px' };
export const itemList = { display: 'grid', gap: '8px', padding: '10px 14px', background: '#0f172a', borderRadius: '12px' };
export const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.75)',
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
  background: '#111827',
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
  background: '#475569',
  color: 'white',
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
  color: '#cbd5e1',
  borderBottom: '1px solid #334155'
};
export const filterTableRow = {
  borderBottom: '1px solid #334155'
};
export const filterTableCell = {
  padding: '12px 14px',
  color: '#e2e8f0',
  fontSize: '0.95rem'
};
export const modalActions = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  justifyContent: 'flex-end'
};
export const modalActionBtn = {
  background: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #475569',
  padding: '10px 16px',
  borderRadius: '10px',
  cursor: 'pointer'
};
export const resultContainer = { marginTop: '30px', padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #3b82f6', textAlign: 'center' };
export const resultBadge = { background: '#3b82f6', color: 'white', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', marginBottom: '15px' };
export const resultList = { display: 'flex', flexDirection: 'column', gap: '10px' };
export const resultItem = { fontSize: '1.2rem', fontWeight: 'bold' };
export const partType = { color: '#64748b', fontSize: '0.8rem', marginRight: '10px', textTransform: 'uppercase' };
export const deckGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '15px',
  marginTop: '30px'
};

export const deckCard = {
  background: '#1e293b',
  padding: '15px',
  borderRadius: '10px',
  border: '1px solid #475569'
};

export const deckBtn = {
  background: '#8b5cf6', // Purple color for Deck building
  color: 'white',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 'bold',
  cursor: 'pointer',
  flex: 1
};



export const appContainer = { minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '20px 10px', fontFamily: 'system-ui' };
export const contentWrapper = { maxWidth: '1000px', margin: '0 auto' };
export const heroSection = { textAlign: 'center', padding: '80px 0' };
export const heroTitle = { fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '800', marginBottom: '40px' };
export const brandSpan = { display: 'block', color: '#3b82f6', fontSize: '1.5rem', marginTop: '10px' };
export const buttonGroup = { display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '320px', margin: '0 auto' };
export const primaryBtn = { background: '#2563eb', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' };
export const secondaryBtn = { background: '#334155', color: '#f8fafc', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' };
export const accentBtn = { background: '#1e293b', color: '#10b981', padding: '16px', borderRadius: '12px', border: '1px solid #10b981', fontWeight: '700', cursor: 'pointer' };
export const card = { background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' };
export const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' };
export const smallInput = { ...inputStyle, width: '80px' };
export const miniInput = { background: '#0f172a', border: '1px solid #3b82f6', color: 'white', borderRadius: '4px', width: '50px', textAlign: 'center', fontSize: '0.8rem' };
export const textArea = { ...inputStyle, resize: 'vertical' };
export const backBtn = { background: 'transparent', color: '#3b82f6', border: 'none', cursor: 'pointer', marginBottom: '20px', fontWeight: '600' };
export const historyCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', marginBottom: '10px' };
export const historyName = { fontWeight: '700', fontSize: '1.1rem' };
export const historyMeta = { color: '#64748b', fontSize: '0.85rem' };
export const openBtn = { background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' };
export const stickyHeader = { position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #334155', zIndex: 100, padding: '10px 15px' };
export const headerContent = { maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
export const headerTitle = { margin: 0, fontSize: '1.1rem', color: '#3b82f6' };
export const utilBtn = { background: '#334155', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', flexWrap: 'wrap', gap: '10px' };
export const roundScrollArea = { display: 'flex', flexDirection: 'column', gap: '50px', padding: '40px 0' };
export const currentRound = { opacity: 1 , scrollMarginTop: '80px'};
export const completedRound = { opacity: 0.4, filter: 'grayscale(0.8)' };
export const roundHeader = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' };
export const roundBadge = { background: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' };
export const statusTag = { fontSize: '0.75rem', color: '#64748b' };
export const matchGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
export const matchCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' };
export const matchLabel = { fontSize: '0.6rem', fontWeight: '800', color: '#64748b', marginBottom: '10px' };
export const matchRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' };
export const roundActionBtn = { ...primaryBtn, margin: '20px auto', display: 'block', width: '100%', maxWidth: '400px' };
export const stickyButtonContainer = { position: 'sticky', bottom: '20px', margin: '20px auto', zIndex: 50, display: 'flex', justifyContent: 'center' };
export const standingContainer = { background: '#1e293b', padding: '25px', borderRadius: '20px', border: '2px solid #2563eb' };
export const standingsTable = { width: '100%', borderCollapse: 'collapse' };
export const th = { padding: '10px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #334155' };
export const thLeft = { ...th, textAlign: 'left' };
export const thCenter = { ...th, textAlign: 'center' };
export const tr = { borderBottom: '1px solid #334155' };
export const tdRank = { padding: '12px', textAlign: 'center', fontWeight: '800', color: '#3b82f6' };
export const tdName = { padding: '12px', fontWeight: '600' };
export const tdCenter = { padding: '12px', textAlign: 'center' };
export const tdBH = { ...tdCenter, color: '#94a3b8' };
export const sectionTitle = { fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px' };
export const label = { fontSize: '0.85rem', color: '#94a3b8' };
export const formGroup = { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px' };
export const listContainer = { display: 'flex', flexDirection: 'column' };
export const pName = { fontWeight: '500' };
export const activeLayout = { paddingTop: '60px' };

export const playBtn = { width: '100%', marginTop: 'auto', padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
export const editBtn = { ...playBtn, background: '#334155', color: '#94a3b8' };
export const scoreDisplay = { fontWeight: 'bold', color: '#3b82f6', fontSize: '1.2rem' };

export const matchLinkRow = { display: 'flex', gap: '6px', marginBottom: '12px' };
export const matchLinkBtn = { flex: 1, padding: '7px 8px', borderRadius: '7px', border: '1px solid #475569', background: '#0f172a', color: '#cbd5e1', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' };

export const libraryContainer = { padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'white' };
export const tableSection = { marginBottom: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '15px' };
export const tableHeaderRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' };
export const filterRowStyle = { display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' };
export const filterSelectStyle = { background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' };
export const searchBarStyle = { background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px 12px', borderRadius: '6px', width: '200px' };
export const tableWrapper = { overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' };
export const partsTable = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
export const thStyle = { padding: '12px', borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' };
export const tdStyle = { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' };
export const tdNameStyle = { ...tdStyle, fontWeight: 'bold', color: '#6366f1' };
export const badgeStyle = { background: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' };
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
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'white',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'background 0.2s'
};
