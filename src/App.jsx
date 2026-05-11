import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { seedHabits, seedLogs, seedNotes } from './data/seed';
import { uploadCloudBackup, downloadCloudBackup } from './lib/cloudBackup'

const STORAGE_KEY = 'habitboard-react-v2';
const defaultTheme = {
  name: 'Mono Light',
  bg: '#f5f5f5',
  panel: '#ffffff',
  panel2: '#ececec',
  text: '#111111',
  muted: '#5f5f5f',
  border: '#222222',
  accent: '#111111',
  accent2: '#8c8c8c',
  success: '#2f7d32',
  warning: '#a06a00',
  danger: '#9f2d2d'
};
const darkTheme = {
  name: 'Mono Dark',
  bg: '#0f0f10',
  panel: '#171718',
  panel2: '#232325',
  text: '#f5f5f5',
  muted: '#b1b1b1',
  border: '#d7d7d7',
  accent: '#ffffff',
  accent2: '#767676',
  success: '#5bc46d',
  warning: '#e0ad42',
  danger: '#ef7d7d'
};
const shortDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const moods = ['😀','🙂','😐','😣','😭'];
const todayIso = () => new Date().toISOString().slice(0, 10);
const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const monthLabel = (date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return {
    habits: seedHabits,
    logs: seedLogs,
    notes: seedNotes,
    moodByDate: { [todayIso()]: '🙂' },
    selectedMonth: new Date().toISOString().slice(0, 7),
    settings: {
      themeMode: 'light',
      theme: defaultTheme
    }
  };
}

function getDaysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(y, m - 1, i + 1);
    return { iso: d.toISOString().slice(0, 10), day: i + 1, weekDay: shortDays[d.getDay()] };
  });
}

function getLog(logs, habitId, date) {
  return logs?.[habitId]?.[date] || { status: 'pending', count: 0, note: '', mood: '', skipped: false };
}

function calcCompletionRate(habit, logs, monthDays) {
  const logsInMonth = monthDays.map(d => getLog(logs, habit.id, d.iso));
  const completed = logsInMonth.filter(l => l.status === 'completed' || l.skipped).length;
  return monthDays.length ? Math.round((completed / monthDays.length) * 100) : 0;
}

function calcCurrentStreak(habit, logs, monthDays) {
  let streak = 0;
  for (let i = monthDays.length - 1; i >= 0; i--) {
    const log = getLog(logs, habit.id, monthDays[i].iso);
    if (log.status === 'completed' || log.skipped) streak++;
    else break;
  }
  return streak;
}

function bestHabits(habits, logs, monthDays) {
  return [...habits]
    .map(h => ({ title: h.title, rate: calcCompletionRate(h, logs, monthDays) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);
}

function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [selectedHabitId, setSelectedHabitId] = useState(seedHabits[0].id);
  const [showModal, setShowModal] = useState(false);
  const [journal, setJournal] = useState('');
  const [importText, setImportText] = useState('');
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const emptyForm = {
    title: '', description: '', icon: '✨', color: '#183c78', category: 'Health', type: 'boolean', frequency: 'daily', targetCount: 1,
    targetUnit: 'times', allowSkip: true, isNegativeHabit: false, area: 'Morning', reminderTimes: '09:00', startDate: todayIso(), subtasks: ''
  };
  const [form, setForm] = useState(emptyForm);
  const [editingHabitId, setEditingHabitId] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const t = state.settings.theme;
    const root = document.documentElement;
    Object.entries({
      '--bg': t.bg,
      '--panel': t.panel,
      '--panel-2': t.panel2,
      '--text': t.text,
      '--muted': t.muted,
      '--border': t.border,
      '--accent': t.accent,
      '--accent-2': t.accent2,
      '--success': t.success,
      '--warning': t.warning,
      '--danger': t.danger
    }).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [state.settings.theme]);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const monthDays = useMemo(() => getDaysInMonth(state.selectedMonth), [state.selectedMonth]);
  const visibleHabits = useMemo(() => state.habits
    .filter(h => !h.archived)
    .filter(h => h.title.toLowerCase().includes(search.toLowerCase()) || h.category.toLowerCase().includes(search.toLowerCase())), [state.habits, search]);
  const selectedHabit = visibleHabits.find(h => h.id === selectedHabitId) || visibleHabits[0];

  const todaySummary = useMemo(() => {
    const today = todayIso();
    const complete = visibleHabits.filter(h => getLog(state.logs, h.id, today).status === 'completed').length;
    const all = visibleHabits.length || 1;
    return { complete, rate: Math.round((complete / all) * 100) };
  }, [visibleHabits, state.logs]);

  const top5 = useMemo(() => bestHabits(visibleHabits, state.logs, monthDays), [visibleHabits, state.logs, monthDays]);
  const longestStreak = useMemo(() => Math.max(0, ...visibleHabits.map(h => calcCurrentStreak(h, state.logs, monthDays))), [visibleHabits, state.logs, monthDays]);
  const currentBest = useMemo(() => [...visibleHabits].sort((a,b) => calcCurrentStreak(b, state.logs, monthDays) - calcCurrentStreak(a, state.logs, monthDays))[0], [visibleHabits, state.logs, monthDays]);

  const weekGroups = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < monthDays.length; i += 7) chunks.push(monthDays.slice(i, i + 7));
    return chunks;
  }, [monthDays]);

  const weeklyBars = useMemo(() => weekGroups.map((week, index) => ({
    name: `W${index + 1}`,
    completed: visibleHabits.reduce((sum, habit) => sum + week.filter(d => getLog(state.logs, habit.id, d.iso).status === 'completed').length, 0)
  })), [weekGroups, visibleHabits, state.logs]);

  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const completed = visibleHabits.filter(h => getLog(state.logs, h.id, iso).status === 'completed').length;
    return { label: shortDays[d.getDay()], date: iso, completed };
  }), [visibleHabits, state.logs]);

  const monthlyLine = useMemo(() => monthDays.map(d => ({
    day: d.day,
    completed: visibleHabits.filter(h => getLog(state.logs, h.id, d.iso).status === 'completed').length
  })), [monthDays, visibleHabits, state.logs]);

  const pieData = useMemo(() => [
    { name: 'Completed', value: todaySummary.complete },
    { name: 'Pending', value: Math.max(visibleHabits.length - todaySummary.complete, 0) }
  ], [todaySummary, visibleHabits]);

  function cycleCell(habitId, date) {
    setState(prev => {
      const current = getLog(prev.logs, habitId, date);
      const next = current.status === 'pending' ? 'completed' : current.status === 'completed' ? 'skipped' : current.status === 'skipped' ? 'missed' : 'pending';
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [habitId]: {
            ...(prev.logs[habitId] || {}),
            [date]: { ...current, status: next, skipped: next === 'skipped' }
          }
        }
      };
    });
  }

  function saveJournal() {
    if (!journal.trim()) return;
    setState(prev => ({
      ...prev,
      notes: [{ id: crypto.randomUUID(), date: todayIso(), habitTitle: selectedHabit?.title || 'General', text: journal }, ...prev.notes]
    }));
    setJournal('');
  }

  function saveHabit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const normalized = {
      ...form,
      reminderTimes: typeof form.reminderTimes === 'string' ? form.reminderTimes.split(',').map(s => s.trim()).filter(Boolean) : form.reminderTimes,
      subtasks: typeof form.subtasks === 'string' ? form.subtasks.split(',').map(s => s.trim()).filter(Boolean) : form.subtasks,
      updatedAt: new Date().toISOString()
    };
    if (editingHabitId) {
      setState(prev => ({
        ...prev,
        habits: prev.habits.map(h => h.id === editingHabitId ? { ...h, ...normalized } : h)
      }));
      setSelectedHabitId(editingHabitId);
    } else {
      const habit = {
        id: crypto.randomUUID(),
        ...normalized,
        archived: false,
        createdAt: new Date().toISOString()
      };
      setState(prev => ({ ...prev, habits: [habit, ...prev.habits] }));
      setSelectedHabitId(habit.id);
    }
    setShowModal(false);
    setEditingHabitId(null);
    setForm(emptyForm);
  }

  function startEditHabit(habit) {
    setEditingHabitId(habit.id);
    setForm({
      ...habit,
      reminderTimes: Array.isArray(habit.reminderTimes) ? habit.reminderTimes.join(', ') : habit.reminderTimes || '',
      subtasks: Array.isArray(habit.subtasks) ? habit.subtasks.join(', ') : habit.subtasks || ''
    });
    setShowModal(true);
  }

  function deleteHabit(habitId) {
    const confirmed = window.confirm('Delete this habit? This will remove the habit from the board.');
    if (!confirmed) return;
    setState(prev => {
      const nextHabits = prev.habits.filter(h => h.id !== habitId);
      const nextLogs = { ...prev.logs };
      delete nextLogs[habitId];
      return { ...prev, habits: nextHabits, logs: nextLogs };
    });
    if (selectedHabitId === habitId) {
      const remaining = state.habits.filter(h => h.id !== habitId);
      setSelectedHabitId(remaining[0]?.id || null);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'habitboard-data.json';
    a.click();
  }

  function importJson() {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.habits || !parsed.logs) throw new Error('Invalid file');
      setState(parsed);
      setImportText('');
      alert('JSON imported successfully');
    } catch {
      alert('Invalid JSON format');
    }
  }

  function applyPreset(mode) {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        themeMode: mode,
        theme: mode === 'dark' ? darkTheme : defaultTheme
      }
    }));
  }

  function updateThemeField(key, value) {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: { ...prev.settings.theme, [key]: value }
      }
    }));
  }

  async function installApp() {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      await installPromptEvent.userChoice.catch(() => null);
      setInstallPromptEvent(null);
    } else {
      setShowInstallHelp(true);
    }
  }


  async function handleCloudSave() {
  try {
    await uploadCloudBackup(state)
    alert('Saved to Supabase successfully.')
  } catch (error) {
    console.error(error)
    alert('Cloud save failed.')
  }
}

async function handleCloudLoad() {
  try {
    const cloudState = await downloadCloudBackup()
    setState(cloudState)
    alert('Loaded from Supabase successfully.')
  } catch (error) {
    console.error(error)
    alert('Cloud load failed.')
  }
}



  return (
    <div className="sheet-shell">
      <aside className="left-rail">
        <div className="brand-box">
          <h1>HabitBoard</h1>
          <p className="muted">Spreadsheet-style tracker</p>
        </div>
        <button className={page==='dashboard' ? 'rail-btn active' : 'rail-btn'} onClick={() => setPage('dashboard')}>Dashboard</button>
        <button className={page==='settings' ? 'rail-btn active' : 'rail-btn'} onClick={() => setPage('settings')}>Settings</button>
        <button className={page==='annual' ? 'rail-btn active' : 'rail-btn'} onClick={() => setPage('annual')}>Annual</button>
        <button className="accent-btn" onClick={() => { setEditingHabitId(null); setForm(emptyForm); setShowModal(true); }}>+ Add habit</button>
        <button onClick={exportJson}>Export JSON</button>
      </aside>

      <main className="sheet-main">
        <header className="hero-banner">
          <div>
            <h2>Interactive Monthly Habit & Goal Tracker</h2>
            <p>See habits, progress, weekly trends, notes, and top streaks in one page.</p>
          </div>
          <div className="hero-controls">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search habits..." />
            <input type="month" value={state.selectedMonth} onChange={e => setState(prev => ({ ...prev, selectedMonth: e.target.value }))} />
            <button className="install-btn" onClick={installApp}>{installPromptEvent ? 'Install App' : 'How to Install'}</button>
          </div>
        </header>

        {showInstallHelp && (
          <section className="panel-box install-help">
            <div className="panel-title">Install HabitBoard</div>
            <div className="install-help-body">
              <p><strong>Desktop:</strong> open the app in Chrome or Edge and click the install icon in the address bar, or use the Install App button if it appears.</p>
              <p><strong>Android:</strong> open in Chrome, tap the browser menu, then choose Add to Home screen or Install App.</p>
              <p><strong>iPhone/iPad:</strong> open in Safari, tap Share, then choose Add to Home Screen.</p>
              <button onClick={() => setShowInstallHelp(false)}>Close</button>
            </div>
          </section>
        )}

        {page === 'dashboard' && (
          <>
            <section className="excel-frame main-board">
              <div className="board-top-chart panel-box">
                <div className="panel-title">{monthLabel(new Date(`${state.selectedMonth}-01`))}</div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={monthlyLine}>
                    <XAxis dataKey="day" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="completed" stroke="var(--accent)" fill="var(--accent-2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="left-habits panel-box">
                <div className="panel-title">Daily Habits</div>
                <div className="habit-side-list">
                  {visibleHabits.map(h => (
                    <div key={h.id} className={selectedHabitId===h.id ? 'habit-link-row active' : 'habit-link-row'}>
                      <button className="habit-link main" onClick={() => setSelectedHabitId(h.id)}>
                        <span>{h.icon}</span>
                        <span>{h.title}</span>
                      </button>
                      <div className="mini-actions">
                        <button title="Rename/Edit" onClick={() => startEditHabit(h)}>✎</button>
                        <button title="Delete" onClick={() => deleteHabit(h.id)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="matrix-zone panel-box">
                <div className="weeks-strip">
                  {weekGroups.map((_, i) => <span key={i}>Week {i + 1}</span>)}
                </div>
                <div className="matrix-scroll">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th className="sticky-col">Habit</th>
                        {monthDays.map(day => <th key={day.iso}>{day.day}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleHabits.map(habit => (
                        <tr key={habit.id}>
                          <td className="sticky-col row-head" onClick={() => setSelectedHabitId(habit.id)}>
                            <div className="row-head-wrap">
                              <span className="row-dot" style={{ background: habit.color }}></span>
                              <span>{habit.title}</span>
                            </div>
                          </td>
                          {monthDays.map(day => {
                            const log = getLog(state.logs, habit.id, day.iso);
                            return (
                              <td key={day.iso}>
                                <button className={`cell ${log.status}`} onClick={() => cycleCell(habit.id, day.iso)}>
                                  {log.status === 'completed' ? '✓' : log.status === 'skipped' ? '–' : log.status === 'missed' ? '✕' : ''}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="right-metrics">
                <div className="panel-box small-box donut-box">
                  <div className="panel-title">Progress</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2}>
                        <Cell fill="var(--accent)" />
                        <Cell fill="var(--panel-2)" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="center-rate">{todaySummary.rate}%</div>
                </div>
                <div className="panel-box small-box">
                  <div className="panel-title">Top 5 Habits</div>
                  {top5.map(item => <div key={item.title} className="small-row"><span>{item.rate}%</span><span>{item.title}</span></div>)}
                </div>
                <div className="panel-box small-box">
                  <div className="panel-title">Longest Streak</div>
                  <div className="metric-big">{longestStreak} Days</div>
                </div>
                <div className="panel-box small-box">
                  <div className="panel-title">Best Current</div>
                  <div className="metric-big">{currentBest ? currentBest.title : '—'}</div>
                </div>
                <div className="panel-box small-box notes-box">
                  <div className="panel-title">Important Notes</div>
                  {state.notes.slice(0,4).map(note => <div key={note.id} className="small-note"><strong>{formatDate(note.date)}</strong> {note.text}</div>)}
                </div>
              </div>

              <div className="bottom-left panel-box">
                <div className="panel-title">Weekly Habit Progress</div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={weeklyBars}>
                    <XAxis dataKey="name" />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="completed" fill="var(--accent-2)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bottom-goals panel-box">
                <div className="panel-title">Weekly Goals</div>
                <div className="goal-grid">
                  {weekGroups.map((week, idx) => (
                    <div className="goal-col" key={idx}>
                      <strong>Week {idx + 1}</strong>
                      {visibleHabits.slice(0,4).map(h => <label key={h.id}><input type="checkbox" readOnly checked={calcCompletionRate(h, state.logs, week) > 50} /> {h.title}</label>)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bottom-notes panel-box">
                <div className="panel-title">Notes / Reflections</div>
                <div className="mood-row">
                  {moods.map(m => <button key={m} className="mood-mini" onClick={() => setState(prev => ({ ...prev, moodByDate: { ...prev.moodByDate, [todayIso()]: m } }))}>{m}</button>)}
                </div>
                <textarea placeholder="Write a note for today..." value={journal} onChange={e => setJournal(e.target.value)} />
                <button className="accent-btn wide" onClick={saveJournal}>Save note</button>
              </div>
            </section>

            <section className="chart-strip">
              {last7.map((item) => (
                <div className="panel-box mini-chart" key={item.date}>
                  <div className="panel-title">{item.label}</div>
                  <div className="mini-chart-body">
                    <div className="mini-bar-track">
                      <div className="mini-bar-fill" style={{ width: `${Math.max(8, Math.min(100, visibleHabits.length ? (item.completed / visibleHabits.length) * 100 : 0))}%` }}></div>
                    </div>
                    <div className="mini-stat">{item.completed}</div>
                  </div>
                  <div className="mini-foot">{item.completed} done</div>
                </div>
              ))}
            </section>

            <section className="extra-charts">
              <div className="panel-box extra-chart">
                <div className="panel-title">Daily Completion Trend</div>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={monthlyLine}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="completed" stroke="var(--accent)" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="panel-box extra-chart">
                <div className="panel-title">Weekly Progress</div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={weeklyBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" fill="var(--accent)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="panel-box extra-chart">
                <div className="panel-title">Selected Habit Trend</div>
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={monthDays.map(d => ({ day: d.day, value: getLog(state.logs, selectedHabit?.id, d.iso).status === 'completed' ? 1 : 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area dataKey="value" stroke="var(--accent)" fill="var(--accent-2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="panel-box extra-chart">
                <div className="panel-title">Habit Completion Rate</div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={visibleHabits.map(h => ({ name: h.title, rate: calcCompletionRate(h, state.logs, monthDays) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" fill="var(--accent-2)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

        {page === 'settings' && (
          <section className="settings-layout">
            <div className="panel-box settings-box">
              <div className="panel-title">Theme Personalization</div>
              <div className="preset-row">
                <button onClick={() => applyPreset('light')}>Mono Light</button>
                <button onClick={() => applyPreset('dark')}>Mono Dark</button>
              </div>
              <div className="theme-grid">
                {[
                  ['bg','Background'],['panel','Panel'],['panel2','Panel 2'],['text','Text'],['muted','Muted'],['border','Border'],['accent','Accent'],['accent2','Accent 2'],['success','Success'],['warning','Warning'],['danger','Danger']
                ].map(([key,label]) => (
                  <label key={key} className="theme-field">
                    <span>{label}</span>
                    <input type="color" value={state.settings.theme[key]} onChange={e => updateThemeField(key, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
            

            <div className="panel-box settings-box">
              <div className="panel-title">JSON Export / Import</div>
              <p className="muted">All data can be exported as a JSON file and imported back later.</p>
              <button className="accent-btn" onClick={exportJson}>Export JSON File</button>
              <textarea placeholder="Paste exported JSON here to import..." value={importText} onChange={e => setImportText(e.target.value)} />
              <button onClick={importJson}>Import JSON</button>
              
            </div>

            <div className="panel-box settings-box">
              <div className="panel-title">Live Preview Notes</div>
              <ul className="info-list">
                <li>The dashboard now uses a spreadsheet-like board style inspired by your references.</li>
                <li>The theme is fully customizable from settings.</li>
                <li>Your information stays exportable as JSON at any time.</li>
              </ul>
              <button onClick={handleCloudSave}>Save to Cloud</button>
              <button onClick={handleCloudLoad}>Load from Cloud</button>
            </div>
          </section>
        )}

        {page === 'annual' && (
          <section className="panel-box annual-box">
            <div className="panel-title">Annual Dashboard Overview</div>
            <div className="annual-grid">
              <div className="annual-card">
                <h3>Monthly Completion</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={Array.from({ length: 12 }, (_, i) => ({ month: shortDays[(i % 7)], value: Math.floor(60 + Math.random()*40) }))}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--accent)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="annual-card">
                <h3>Last 7 Days</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={last7}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="completed" stroke="var(--accent)" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={saveHabit}>
              <div className="panel-title">{editingHabitId ? 'Edit Habit' : 'Add Habit'}</div>
              <div className="modal-grid">
                <input required placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <input placeholder="Emoji" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                <input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="boolean">Yes / No</option>
                  <option value="count">Numeric</option>
                  <option value="timer">Timer</option>
                </select>
                <input type="number" value={form.targetCount} onChange={e => setForm({ ...form, targetCount: +e.target.value })} />
                <input placeholder="Target unit" value={form.targetUnit} onChange={e => setForm({ ...form, targetUnit: e.target.value })} />
                <input placeholder="Area" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
                <input placeholder="Reminder times, separated by commas" value={form.reminderTimes} onChange={e => setForm({ ...form, reminderTimes: e.target.value })} />
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <input placeholder="Subtasks, separated by commas" value={form.subtasks} onChange={e => setForm({ ...form, subtasks: e.target.value })} />
              <div className="check-row">
                <label><input type="checkbox" checked={form.allowSkip} onChange={e => setForm({ ...form, allowSkip: e.target.checked })} /> Allow skip</label>
                <label><input type="checkbox" checked={form.isNegativeHabit} onChange={e => setForm({ ...form, isNegativeHabit: e.target.checked })} /> Negative habit</label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="accent-btn" type="submit">{editingHabitId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
