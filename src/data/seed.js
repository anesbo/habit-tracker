const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const dayOffset = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };

export const seedHabits = [
  {
    id: crypto.randomUUID(),
    title: 'Drink Water',
    description: 'Hit hydration target',
    icon: '💧',
    color: '#0f766e',
    category: 'Health',
    type: 'count',
    frequency: 'daily',
    targetCount: 8,
    targetUnit: 'glasses',
    allowSkip: true,
    isNegativeHabit: false,
    area: 'Morning',
    reminderTimes: ['09:00', '14:00', '19:00'],
    startDate: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
    subtasks: ['Carry bottle', 'Refill at noon'],
    archived: false,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: 'Deep Study',
    description: 'Focused learning session',
    icon: '📚',
    color: '#7c3aed',
    category: 'Study',
    type: 'timer',
    frequency: 'daily',
    targetCount: 60,
    targetUnit: 'minutes',
    allowSkip: true,
    isNegativeHabit: false,
    area: 'Evening',
    reminderTimes: ['18:00'],
    startDate: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
    subtasks: ['Phone away', 'Open lesson'],
    archived: false,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: 'No Junk Food',
    description: 'Avoid unhealthy snacks',
    icon: '🚫',
    color: '#dc2626',
    category: 'Health',
    type: 'boolean',
    frequency: 'daily',
    targetCount: 1,
    targetUnit: 'day',
    allowSkip: false,
    isNegativeHabit: true,
    area: 'All day',
    reminderTimes: ['12:00'],
    startDate: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
    subtasks: ['Meal prep'],
    archived: false,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: 'Walk 8k Steps',
    description: 'Daily movement target',
    icon: '🚶',
    color: '#f59e0b',
    category: 'Fitness',
    type: 'count',
    frequency: 'daily',
    targetCount: 8000,
    targetUnit: 'steps',
    allowSkip: true,
    isNegativeHabit: false,
    area: 'Afternoon',
    reminderTimes: ['17:00'],
    startDate: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
    subtasks: ['10-min morning walk'],
    archived: false,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString()
  }
];

export const seedLogs = {};
for (const habit of seedHabits) {
  seedLogs[habit.id] = {};
  for (let i = 0; i < 14; i++) {
    const d = dayOffset(i);
    const completed = Math.random() > 0.25;
    seedLogs[habit.id][d] = {
      status: completed ? 'completed' : (Math.random() > 0.7 ? 'skipped' : 'missed'),
      count: habit.type === 'count' ? Math.floor(habit.targetCount * (0.5 + Math.random() * 0.6)) : habit.targetCount,
      note: i % 5 === 0 ? 'Good progress today' : '',
      mood: ['😀','🙂','😐','😣'][Math.floor(Math.random()*4)],
      skipped: !completed && Math.random() > 0.7
    };
  }
}

export const seedNotes = [
  { id: crypto.randomUUID(), date: iso(today), habitTitle: 'Deep Study', text: 'Felt focused after removing distractions.' },
  { id: crypto.randomUUID(), date: dayOffset(1), habitTitle: 'Drink Water', text: 'Reached target before evening.' }
];
