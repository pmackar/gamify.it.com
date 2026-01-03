'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTodayStore } from '@/lib/today/store';
import { Task, Project, Category, ViewType, RecurrenceRule, RecurrenceFrequency } from '@/lib/today/types';
import {
  calculateXPPreview,
  formatDueDate,
  TIERS,
  DIFFICULTIES,
  PRIORITIES,
  ACHIEVEMENTS,
  getRankForLevel
} from '@/lib/today/data';
import { useNavBar } from '@/components/NavBarContext';
import AccountabilityPartners from '@/components/social/AccountabilityPartners';

// Pixel Particles Effect
interface Particle { id: number; x: number; y: number; size: number; color: string; speed: number; opacity: number; delay: number; }

const PixelParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const colors = ['#FFD700', '#5fbf8a', '#ff6b6b', '#5CC9F5', '#a855f7'];
    const newParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 25 + 20,
        opacity: Math.random() * 0.3 + 0.1,
        delay: Math.random() * 15
      });
    }
    setParticles(newParticles);
  }, []);
  return (
    <div className="particles-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="pixel-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.opacity,
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
    </div>
  );
};

export default function TodayApp() {
  const store = useTodayStore();
  const [mounted, setMounted] = useState(false);
  const { setCenterContent } = useNavBar();

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Edit states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: '' as 'High' | 'Medium' | 'Low' | '',
    tier: 'tier3' as 'tier1' | 'tier2' | 'tier3',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard' | 'epic',
    due_date: '',
    project_id: '',
    category_id: ''
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    start_date: '',
    due_date: ''
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#6366f1'
  });

  // Quick add
  const [quickAddValue, setQuickAddValue] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);

  // Autocomplete for quick add
  const [suggestions, setSuggestions] = useState<Array<{ type: string; value: string; label: string; icon?: string }>>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeToken, setActiveToken] = useState<{ type: string; start: number; query: string } | null>(null);

  // Command palette
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Mobile panel
  const [mobilePanel, setMobilePanel] = useState<'projects' | 'categories' | 'profile' | null>(null);

  // Task selection for keyboard navigation
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(-1);

  // Shortcuts modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Quick actions menu
  const [quickActionTaskId, setQuickActionTaskId] = useState<string | null>(null);

  // Drag & drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Multi-select for bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    store.loadState();
    // Fetch from server after local state is loaded
    store.fetchFromServer();

    // Check if user has seen the tutorial
    const hasSeenTutorial = localStorage.getItem('dayquest_tutorial_complete');
    if (!hasSeenTutorial) {
      // Small delay so the app renders first
      setTimeout(() => setShowTutorial(true), 500);
    }
  }, []);

  // Sync on page unload
  useEffect(() => {
    const handleUnload = () => {
      const state = useTodayStore.getState();
      if (state.pendingSync) {
        // Use sendBeacon for reliable last-chance sync
        navigator.sendBeacon('/api/today/sync', JSON.stringify({
          data: {
            profile: state.profile,
            tasks: state.tasks,
            projects: state.projects,
            categories: state.categories,
            daily_stats: state.daily_stats,
            personal_records: state.personal_records,
          },
        }));
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Reset selection when view changes
  useEffect(() => {
    setSelectedTaskIndex(-1);
  }, [store.currentView]);

  // Get filtered tasks for keyboard navigation
  const getFilteredTasksForNav = useCallback(() => {
    return store.getFilteredTasks();
  }, [store]);

  // Get selected task
  const getSelectedTask = useCallback(() => {
    const tasks = getFilteredTasksForNav();
    if (selectedTaskIndex < 0 || selectedTaskIndex >= tasks.length) return null;
    return tasks[selectedTaskIndex];
  }, [getFilteredTasksForNav, selectedTaskIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
      const key = e.key.toLowerCase();

      // Command palette shortcuts
      if (showCommandPalette) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCommandPalette(false);
        }
        return;
      }

      // Open command palette
      if (isMeta && key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
        setCommandQuery('');
        setCommandIndex(0);
        return;
      }

      // ⌘↵ to save in modals
      if (isMeta && e.key === 'Enter') {
        if (showTaskModal) {
          e.preventDefault();
          saveTask();
          return;
        }
        if (showProjectModal) {
          e.preventDefault();
          saveProject();
          return;
        }
        if (showCategoryModal) {
          e.preventDefault();
          saveCategory();
          return;
        }
      }

      // Close modals
      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        setShowTaskModal(false);
        setShowProjectModal(false);
        setShowCategoryModal(false);
        setShowStatsModal(false);
        setSelectedTaskIndex(-1);
        return;
      }

      if (isInput) return;

      // Check if any modal is open
      const isModalOpen = showTaskModal || showProjectModal || showCategoryModal || showStatsModal || showShortcutsModal;
      if (isModalOpen) return;

      const tasks = getFilteredTasksForNav();

      // Navigation and action shortcuts
      switch (key) {
        case '1':
        case 'i':
          e.preventDefault();
          store.setView('inbox');
          break;
        case '2':
        case 't':
          e.preventDefault();
          store.setView('today');
          break;
        case '3':
        case 'u':
          e.preventDefault();
          store.setView('upcoming');
          break;
        case '4':
          e.preventDefault();
          store.setView('completed');
          break;
        case '5':
          e.preventDefault();
          setShowStatsModal(true);
          break;
        case 'n':
          e.preventDefault();
          quickAddRef.current?.focus();
          break;
        case 'a':
          e.preventDefault();
          openTaskModal();
          break;
        case 'p':
          e.preventDefault();
          openProjectModal();
          break;
        case 'c':
          e.preventDefault();
          openCategoryModal();
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsModal(true);
          break;
        // Task navigation
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          if (tasks.length > 0) {
            setSelectedTaskIndex(prev => Math.min(prev + 1, tasks.length - 1));
          }
          break;
        case 'k':
        case 'arrowup':
          e.preventDefault();
          if (tasks.length > 0) {
            setSelectedTaskIndex(prev => prev <= 0 ? 0 : prev - 1);
          }
          break;
        // Task actions on selected
        case ' ':
          e.preventDefault();
          const taskToToggle = getSelectedTask();
          if (taskToToggle) {
            handleToggleComplete(taskToToggle.id);
          }
          break;
        case 'e':
          e.preventDefault();
          const taskToEdit = getSelectedTask();
          if (taskToEdit) {
            openTaskModal(taskToEdit);
          }
          break;
        case 'backspace':
        case 'delete':
          e.preventDefault();
          const taskToDelete = getSelectedTask();
          if (taskToDelete) {
            handleDeleteTask(taskToDelete.id);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted, showCommandPalette, showTaskModal, showProjectModal, showCategoryModal, showStatsModal, showShortcutsModal, store, getFilteredTasksForNav, getSelectedTask]);

  // Autocomplete logic for quick add
  const updateSuggestions = useCallback((value: string, cursorPos: number) => {
    // Find the token at cursor position
    const beforeCursor = value.slice(0, cursorPos);

    // Check for tokens: @ (project), # (category), ! (priority), ~ (difficulty), ^ (tier)
    const tokenMatch = beforeCursor.match(/[@#!~^](\S*)$/);

    if (!tokenMatch) {
      setSuggestions([]);
      setActiveToken(null);
      return;
    }

    const tokenChar = tokenMatch[0][0];
    const query = tokenMatch[1].toLowerCase();
    const tokenStart = beforeCursor.lastIndexOf(tokenChar);

    let newSuggestions: Array<{ type: string; value: string; label: string; icon?: string }> = [];

    if (tokenChar === '@') {
      // Project suggestions
      const matchingProjects = store.projects
        .filter(p => p.name.toLowerCase().includes(query))
        .map(p => ({ type: 'project', value: p.name.replace(/\s+/g, '-'), label: p.name, icon: '📁' }));

      // Check if there's an exact match
      const exactMatch = store.projects.some(p => p.name.toLowerCase() === query.toLowerCase());

      // Add "Create new" option if query has content and no exact match
      if (query.length > 0 && !exactMatch) {
        const createName = query.charAt(0).toUpperCase() + query.slice(1);
        matchingProjects.push({
          type: 'create-project',
          value: createName.replace(/\s+/g, '-'),
          label: `+ Create "${createName}"`,
          icon: '➕'
        });
      }

      newSuggestions = matchingProjects;
      setActiveToken({ type: 'project', start: tokenStart, query });
    } else if (tokenChar === '#') {
      // Category suggestions
      const matchingCategories = store.categories
        .filter(c => c.name.toLowerCase().includes(query))
        .map(c => ({ type: 'category', value: c.name.replace(/\s+/g, '-'), label: c.name, icon: '🏷️' }));

      // Check if there's an exact match
      const exactMatch = store.categories.some(c => c.name.toLowerCase() === query.toLowerCase());

      // Add "Create new" option if query has content and no exact match
      if (query.length > 0 && !exactMatch) {
        const createName = query.charAt(0).toUpperCase() + query.slice(1);
        matchingCategories.push({
          type: 'create-category',
          value: createName.replace(/\s+/g, '-'),
          label: `+ Create "${createName}"`,
          icon: '➕'
        });
      }

      newSuggestions = matchingCategories;
      setActiveToken({ type: 'category', start: tokenStart, query });
    } else if (tokenChar === '!') {
      // Priority suggestions
      const priorities = [
        { value: 'high', label: 'High Priority', icon: '🔴' },
        { value: 'medium', label: 'Medium Priority', icon: '🟡' },
        { value: 'low', label: 'Low Priority', icon: '🟢' }
      ];
      newSuggestions = priorities
        .filter(p => p.label.toLowerCase().includes(query) || p.value.includes(query))
        .map(p => ({ type: 'priority', ...p }));
      setActiveToken({ type: 'priority', start: tokenStart, query });
    } else if (tokenChar === '~') {
      // Difficulty suggestions
      const difficulties = [
        { value: 'easy', label: 'Easy (1x XP)', icon: '😊' },
        { value: 'medium', label: 'Medium (1.5x XP)', icon: '😐' },
        { value: 'hard', label: 'Hard (2x XP)', icon: '😤' },
        { value: 'epic', label: 'Epic (3x XP)', icon: '🔥' }
      ];
      newSuggestions = difficulties
        .filter(d => d.label.toLowerCase().includes(query) || d.value.includes(query))
        .map(d => ({ type: 'difficulty', ...d }));
      setActiveToken({ type: 'difficulty', start: tokenStart, query });
    } else if (tokenChar === '^') {
      // Tier suggestions
      const tiers = [
        { value: 'quick', label: 'Quick Task (1x)', icon: '⚡' },
        { value: 'standard', label: 'Standard Task (2x)', icon: '📋' },
        { value: 'major', label: 'Major Task (3x)', icon: '🎯' }
      ];
      newSuggestions = tiers
        .filter(t => t.label.toLowerCase().includes(query) || t.value.includes(query))
        .map(t => ({ type: 'tier', ...t }));
      setActiveToken({ type: 'tier', start: tokenStart, query });
    }

    setSuggestions(newSuggestions);
    setSuggestionIndex(0);
  }, [store.projects, store.categories]);

  const selectSuggestion = useCallback((suggestion: typeof suggestions[0]) => {
    if (!activeToken || !quickAddRef.current) return;

    const input = quickAddRef.current;
    const value = quickAddValue;
    const tokenChar = value[activeToken.start];

    // Handle creating new project/category
    if (suggestion.type === 'create-project') {
      const projectName = suggestion.value.replace(/-/g, ' ');
      store.addProject({ name: projectName, description: '' });
    } else if (suggestion.type === 'create-category') {
      const categoryName = suggestion.value.replace(/-/g, ' ');
      store.addCategory({ name: categoryName, color: '#6366f1' });
    }

    // Replace the token with the selected value
    const before = value.slice(0, activeToken.start);
    const after = value.slice(input.selectionStart || value.length);
    const newValue = `${before}${tokenChar}${suggestion.value} ${after.trimStart()}`;

    setQuickAddValue(newValue);
    setSuggestions([]);
    setActiveToken(null);

    // Move cursor after the inserted value
    setTimeout(() => {
      const newPos = before.length + 1 + suggestion.value.length + 1;
      input.setSelectionRange(newPos, newPos);
      input.focus();
    }, 0);
  }, [activeToken, quickAddValue, store]);

  const openTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority || '',
        tier: task.tier,
        difficulty: task.difficulty,
        due_date: task.due_date ? task.due_date.slice(0, 16) : '',
        project_id: task.project_id || '',
        category_id: task.category_id || ''
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        priority: '',
        tier: 'tier3',
        difficulty: 'medium',
        due_date: '',
        project_id: '',
        category_id: ''
      });
    }
    setShowTaskModal(true);
  };

  const openProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        description: project.description || '',
        start_date: project.start_date || '',
        due_date: project.due_date || ''
      });
    } else {
      setEditingProject(null);
      setProjectForm({ name: '', description: '', start_date: '', due_date: '' });
    }
    setShowProjectModal(true);
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, color: category.color });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', color: '#6366f1' });
    }
    setShowCategoryModal(true);
  };

  const saveTask = () => {
    if (!taskForm.title.trim()) {
      store.showToast('Please enter a task title', 'error');
      return;
    }

    const data = {
      title: taskForm.title,
      description: taskForm.description || undefined,
      priority: taskForm.priority || undefined,
      tier: taskForm.tier,
      difficulty: taskForm.difficulty,
      due_date: taskForm.due_date || undefined,
      project_id: taskForm.project_id || undefined,
      category_id: taskForm.category_id || undefined
    };

    if (editingTask) {
      store.updateTask(editingTask.id, data);
      store.showToast('Task updated', 'success');
    } else {
      store.createTask(data);
      store.showToast('Task created', 'success');
    }

    setShowTaskModal(false);
  };

  const saveProject = () => {
    if (!projectForm.name.trim()) {
      store.showToast('Please enter a project name', 'error');
      return;
    }

    if (editingProject) {
      store.updateProject(editingProject.id, projectForm);
      store.showToast('Project updated', 'success');
    } else {
      store.createProject(projectForm);
      store.showToast('Project created', 'success');
    }

    setShowProjectModal(false);
  };

  const saveCategory = () => {
    if (!categoryForm.name.trim()) {
      store.showToast('Please enter a category name', 'error');
      return;
    }

    if (editingCategory) {
      store.updateCategory(editingCategory.id, categoryForm);
      store.showToast('Category updated', 'success');
    } else {
      store.createCategory(categoryForm);
      store.showToast('Category created', 'success');
    }

    setShowCategoryModal(false);
  };

  const handleQuickAdd = () => {
    const parsed = parseQuickAdd(quickAddValue.trim());
    if (!parsed.title) {
      store.showToast('Please enter a task title', 'error');
      return;
    }

    store.createTask(parsed);
    setQuickAddValue('');

    let msg = 'Task created!';
    if (parsed.project_id) {
      const proj = store.projects.find((p) => p.id === parsed.project_id);
      if (proj) msg += ` in ${proj.name}`;
    }
    store.showToast(msg, 'success');
  };

  const parseQuickAdd = (text: string): Partial<Task> => {
    let title = text;
    const result: Partial<Task> = {
      tier: 'tier3',
      difficulty: 'medium'
    };

    // Parse @project
    const projectMatch = title.match(/@(\S+)/);
    if (projectMatch) {
      const projectName = projectMatch[1].toLowerCase().replace(/-/g, ' ');
      const project = store.projects.find(
        (p) =>
          p.name.toLowerCase() === projectName ||
          p.name.toLowerCase().startsWith(projectName)
      );
      if (project) result.project_id = project.id;
      title = title.replace(/@\S+/, '').trim();
    }

    // Parse #category
    const categoryMatch = title.match(/#(\S+)/);
    if (categoryMatch) {
      const categoryName = categoryMatch[1].toLowerCase().replace(/-/g, ' ');
      const category = store.categories.find(
        (c) =>
          c.name.toLowerCase() === categoryName ||
          c.name.toLowerCase().startsWith(categoryName)
      );
      if (category) result.category_id = category.id;
      title = title.replace(/#\S+/, '').trim();
    }

    // Parse !priority
    const priorityMatch = title.match(/!(\S+)/);
    if (priorityMatch) {
      const p = priorityMatch[1].toLowerCase();
      if (p === 'high' || p === '1' || p === 'h') result.priority = 'High';
      else if (p === 'medium' || p === '2' || p === 'm') result.priority = 'Medium';
      else if (p === 'low' || p === '3' || p === 'l') result.priority = 'Low';
      title = title.replace(/!\S+/, '').trim();
    }

    // Parse ~difficulty
    const difficultyMatch = title.match(/~(\S+)/);
    if (difficultyMatch) {
      const d = difficultyMatch[1].toLowerCase();
      if (d === 'easy' || d === 'e') result.difficulty = 'easy';
      else if (d === 'hard' || d === 'h') result.difficulty = 'hard';
      else if (d === 'epic' || d === 'x') result.difficulty = 'epic';
      title = title.replace(/~\S+/, '').trim();
    }

    // Parse ^tier
    const tierMatch = title.match(/\^(\S+)/);
    if (tierMatch) {
      const t = tierMatch[1].toLowerCase();
      if (t === 'major' || t === 'm' || t === '3') result.tier = 'tier1';
      else if (t === 'standard' || t === 's' || t === '2') result.tier = 'tier2';
      title = title.replace(/\^\S+/, '').trim();
    }

    // Parse recurrence first (before due date, as recurrence often implies a due date)
    const recurrenceResult = parseRecurrence(title);
    if (recurrenceResult.rule) {
      result.recurrence_rule = recurrenceResult.rule;
      title = recurrenceResult.remaining;
      // Set initial due date to today if not already specified
      if (!result.due_date) {
        const today = new Date();
        today.setHours(23, 59, 0, 0);
        result.due_date = today.toISOString();
      }
    }

    // Parse due dates
    const dueResult = parseDueDate(title);
    if (dueResult.date) {
      result.due_date = dueResult.date;
      title = dueResult.remaining;
    }

    result.title = title.trim();
    return result;
  };

  const parseDueDate = (text: string): { date: string | null; remaining: string } => {
    const now = new Date();
    let date: Date | null = null;
    let remaining = text;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const setEndOfDay = (d: Date) => {
      d.setHours(23, 59, 0, 0);
      return d;
    };

    const getNextDayOfWeek = (dayIndex: number, nextWeek: boolean = false): Date => {
      const result = new Date(now);
      const currentDay = result.getDay();
      let daysToAdd = dayIndex - currentDay;
      if (daysToAdd <= 0 || nextWeek) daysToAdd += 7;
      if (nextWeek && daysToAdd < 7) daysToAdd += 7;
      result.setDate(result.getDate() + daysToAdd);
      return setEndOfDay(result);
    };

    // 1. Simple keywords: today, tomorrow, yesterday
    if (/\btoday\b/i.test(text)) {
      date = setEndOfDay(new Date(now));
      remaining = text.replace(/\btoday\b/i, '').trim();
    } else if (/\b(tomorrow|tmr)\b/i.test(text)) {
      date = new Date(now);
      date.setDate(date.getDate() + 1);
      date = setEndOfDay(date);
      remaining = text.replace(/\b(tomorrow|tmr)\b/i, '').trim();
    } else if (/\byesterday\b/i.test(text)) {
      date = new Date(now);
      date.setDate(date.getDate() - 1);
      date = setEndOfDay(date);
      remaining = text.replace(/\byesterday\b/i, '').trim();
    }

    // 2. Next week/month
    else if (/\bnext\s*week\b/i.test(text)) {
      date = new Date(now);
      date.setDate(date.getDate() + 7);
      date = setEndOfDay(date);
      remaining = text.replace(/\bnext\s*week\b/i, '').trim();
    } else if (/\bnext\s*month\b/i.test(text)) {
      date = new Date(now);
      date.setMonth(date.getMonth() + 1);
      date = setEndOfDay(date);
      remaining = text.replace(/\bnext\s*month\b/i, '').trim();
    }

    // 3. Day names: "friday", "next friday", "this monday"
    else {
      const nextDayMatch = text.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
      const thisDayMatch = text.match(/\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
      const dayMatch = text.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);

      if (nextDayMatch) {
        const dayIndex = dayNames.indexOf(nextDayMatch[1].toLowerCase());
        date = getNextDayOfWeek(dayIndex, true);
        remaining = text.replace(nextDayMatch[0], '').trim();
      } else if (thisDayMatch) {
        const dayIndex = dayNames.indexOf(thisDayMatch[1].toLowerCase());
        date = getNextDayOfWeek(dayIndex, false);
        remaining = text.replace(thisDayMatch[0], '').trim();
      } else if (dayMatch && !text.match(/\bin\s+\d+\s+day/i)) {
        const dayIndex = dayNames.indexOf(dayMatch[1].toLowerCase());
        date = getNextDayOfWeek(dayIndex, false);
        remaining = text.replace(dayMatch[0], '').trim();
      }

      // 4. Relative: "in 3 days", "in 2 weeks", "in a month"
      else {
        const inDaysMatch = text.match(/\bin\s+(\d+|a|an)\s*(day|days)\b/i);
        const inWeeksMatch = text.match(/\bin\s+(\d+|a|an)\s*(week|weeks)\b/i);
        const inMonthsMatch = text.match(/\bin\s+(\d+|a|an)\s*(month|months)\b/i);

        if (inDaysMatch) {
          const num = /^(a|an)$/i.test(inDaysMatch[1]) ? 1 : parseInt(inDaysMatch[1]);
          date = new Date(now);
          date.setDate(date.getDate() + num);
          date = setEndOfDay(date);
          remaining = text.replace(inDaysMatch[0], '').trim();
        } else if (inWeeksMatch) {
          const num = /^(a|an)$/i.test(inWeeksMatch[1]) ? 1 : parseInt(inWeeksMatch[1]);
          date = new Date(now);
          date.setDate(date.getDate() + num * 7);
          date = setEndOfDay(date);
          remaining = text.replace(inWeeksMatch[0], '').trim();
        } else if (inMonthsMatch) {
          const num = /^(a|an)$/i.test(inMonthsMatch[1]) ? 1 : parseInt(inMonthsMatch[1]);
          date = new Date(now);
          date.setMonth(date.getMonth() + num);
          date = setEndOfDay(date);
          remaining = text.replace(inMonthsMatch[0], '').trim();
        }

        // 5. Contextual: "end of week", "end of month", "eow", "eom"
        else if (/\b(end\s*of\s*week|eow)\b/i.test(text)) {
          date = new Date(now);
          const daysUntilSunday = 7 - date.getDay();
          date.setDate(date.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
          date = setEndOfDay(date);
          remaining = text.replace(/\b(end\s*of\s*week|eow)\b/i, '').trim();
        } else if (/\b(end\s*of\s*month|eom)\b/i.test(text)) {
          date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          date = setEndOfDay(date);
          remaining = text.replace(/\b(end\s*of\s*month|eom)\b/i, '').trim();
        } else if (/\b(end\s*of\s*year|eoy)\b/i.test(text)) {
          date = new Date(now.getFullYear(), 11, 31);
          date = setEndOfDay(date);
          remaining = text.replace(/\b(end\s*of\s*year|eoy)\b/i, '').trim();
        }

        // 6. Absolute dates: "dec 25", "december 25", "12/25", "12-25", "2026-01-15"
        else {
          // ISO format: 2026-01-15
          const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
          // US format: 12/25 or 12-25 or 12/25/2026
          const usMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
          // Month name: dec 25, december 25th
          const monthNameMatch = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/i);

          if (isoMatch) {
            const year = parseInt(isoMatch[1]);
            const month = parseInt(isoMatch[2]) - 1;
            const day = parseInt(isoMatch[3]);
            date = new Date(year, month, day);
            date = setEndOfDay(date);
            remaining = text.replace(isoMatch[0], '').trim();
          } else if (monthNameMatch) {
            const monthStr = monthNameMatch[1].toLowerCase().slice(0, 3);
            const monthIndex = monthNames.indexOf(monthStr);
            const day = parseInt(monthNameMatch[2]);
            const year = monthNameMatch[3] ? parseInt(monthNameMatch[3]) : now.getFullYear();
            date = new Date(year, monthIndex, day);
            // If date is in the past this year, assume next year
            if (!monthNameMatch[3] && date < now) {
              date.setFullYear(date.getFullYear() + 1);
            }
            date = setEndOfDay(date);
            remaining = text.replace(monthNameMatch[0], '').trim();
          } else if (usMatch) {
            const month = parseInt(usMatch[1]) - 1;
            const day = parseInt(usMatch[2]);
            let year = now.getFullYear();
            if (usMatch[3]) {
              year = parseInt(usMatch[3]);
              if (year < 100) year += 2000;
            }
            date = new Date(year, month, day);
            // If date is in the past this year and no year specified, assume next year
            if (!usMatch[3] && date < now) {
              date.setFullYear(date.getFullYear() + 1);
            }
            date = setEndOfDay(date);
            remaining = text.replace(usMatch[0], '').trim();
          }
        }
      }
    }

    remaining = remaining.replace(/\s+/g, ' ').trim();
    return { date: date ? date.toISOString() : null, remaining };
  };

  // Parse recurrence patterns from text
  const parseRecurrence = (text: string): { rule: RecurrenceRule | null; remaining: string } => {
    let remaining = text;
    let rule: RecurrenceRule | null = null;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Pattern: "every day" or "daily"
    if (/\b(every\s*day|daily)\b/i.test(text)) {
      rule = { frequency: 'daily', interval: 1 };
      remaining = text.replace(/\b(every\s*day|daily)\b/i, '').trim();
    }
    // Pattern: "every N days"
    else if (/\bevery\s+(\d+)\s*days?\b/i.test(text)) {
      const match = text.match(/\bevery\s+(\d+)\s*days?\b/i)!;
      rule = { frequency: 'daily', interval: parseInt(match[1]) };
      remaining = text.replace(match[0], '').trim();
    }
    // Pattern: "weekly" or "every week"
    else if (/\b(weekly|every\s*week)\b/i.test(text)) {
      rule = { frequency: 'weekly', interval: 1 };
      remaining = text.replace(/\b(weekly|every\s*week)\b/i, '').trim();
    }
    // Pattern: "every N weeks"
    else if (/\bevery\s+(\d+)\s*weeks?\b/i.test(text)) {
      const match = text.match(/\bevery\s+(\d+)\s*weeks?\b/i)!;
      rule = { frequency: 'weekly', interval: parseInt(match[1]) };
      remaining = text.replace(match[0], '').trim();
    }
    // Pattern: "every monday", "every tuesday", "every mon,wed,fri"
    else if (/\bevery\s+((?:(?:sun|mon|tue|wed|thu|fri|sat)(?:day)?(?:\s*,\s*)?)+)\b/i.test(text)) {
      const match = text.match(/\bevery\s+((?:(?:sun|mon|tue|wed|thu|fri|sat)(?:day)?(?:\s*,\s*)?)+)\b/i)!;
      const daysStr = match[1].toLowerCase();
      const daysOfWeek: number[] = [];

      dayNames.forEach((day, index) => {
        if (daysStr.includes(day.slice(0, 3))) {
          daysOfWeek.push(index);
        }
      });

      if (daysOfWeek.length > 0) {
        rule = { frequency: 'weekly', interval: 1, daysOfWeek };
        remaining = text.replace(match[0], '').trim();
      }
    }
    // Pattern: "every weekday"
    else if (/\bevery\s*weekday\b/i.test(text)) {
      rule = { frequency: 'weekly', interval: 1, daysOfWeek: [1, 2, 3, 4, 5] };
      remaining = text.replace(/\bevery\s*weekday\b/i, '').trim();
    }
    // Pattern: "every weekend"
    else if (/\bevery\s*weekend\b/i.test(text)) {
      rule = { frequency: 'weekly', interval: 1, daysOfWeek: [0, 6] };
      remaining = text.replace(/\bevery\s*weekend\b/i, '').trim();
    }
    // Pattern: "monthly" or "every month"
    else if (/\b(monthly|every\s*month)\b/i.test(text)) {
      rule = { frequency: 'monthly', interval: 1, dayOfMonth: new Date().getDate() };
      remaining = text.replace(/\b(monthly|every\s*month)\b/i, '').trim();
    }
    // Pattern: "every N months"
    else if (/\bevery\s+(\d+)\s*months?\b/i.test(text)) {
      const match = text.match(/\bevery\s+(\d+)\s*months?\b/i)!;
      rule = { frequency: 'monthly', interval: parseInt(match[1]), dayOfMonth: new Date().getDate() };
      remaining = text.replace(match[0], '').trim();
    }
    // Pattern: "every 1st", "every 15th"
    else if (/\bevery\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*(?:the\s*)?month)?\b/i.test(text)) {
      const match = text.match(/\bevery\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*(?:the\s*)?month)?\b/i)!;
      rule = { frequency: 'monthly', interval: 1, dayOfMonth: parseInt(match[1]) };
      remaining = text.replace(match[0], '').trim();
    }
    // Pattern: "yearly" or "every year" or "annually"
    else if (/\b(yearly|annually|every\s*year)\b/i.test(text)) {
      rule = { frequency: 'yearly', interval: 1 };
      remaining = text.replace(/\b(yearly|annually|every\s*year)\b/i, '').trim();
    }

    remaining = remaining.replace(/\s+/g, ' ').trim();
    return { rule, remaining };
  };

  const handleToggleComplete = (taskId: string) => {
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const result = store.toggleTaskComplete(taskId);

    if (!task.is_completed && result.xpEarned > 0) {
      store.showToast(`+${result.xpEarned} XP earned!`, 'success');

      if (result.leveledUp) {
        setTimeout(() => {
          store.showToast(`Level Up! You're now level ${store.profile.level}!`, 'success');
        }, 500);
      }
    } else if (result.xpEarned < 0) {
      store.showToast(`${result.xpEarned} XP revoked`, 'error');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Delete this task?')) {
      store.deleteTask(taskId);
      store.showToast('Task deleted', 'success');
    }
  };

  // Quick date actions
  const handleQuickDateAction = (taskId: string, action: 'today' | 'tomorrow' | 'next-week' | 'remove') => {
    const now = new Date();
    let dueDate: string | undefined;

    switch (action) {
      case 'today':
        now.setHours(23, 59, 0, 0);
        dueDate = now.toISOString();
        break;
      case 'tomorrow':
        now.setDate(now.getDate() + 1);
        now.setHours(23, 59, 0, 0);
        dueDate = now.toISOString();
        break;
      case 'next-week':
        now.setDate(now.getDate() + 7);
        now.setHours(23, 59, 0, 0);
        dueDate = now.toISOString();
        break;
      case 'remove':
        dueDate = undefined;
        break;
    }

    store.updateTask(taskId, { due_date: dueDate });
    setQuickActionTaskId(null);

    const actionLabels = {
      'today': 'Scheduled for today',
      'tomorrow': 'Scheduled for tomorrow',
      'next-week': 'Scheduled for next week',
      'remove': 'Due date removed'
    };
    store.showToast(actionLabels[action], 'success');
  };

  // Format recurrence rule for display
  const formatRecurrence = (rule: RecurrenceRule | null | undefined): string | null => {
    if (!rule) return null;
    const { frequency, interval, daysOfWeek, dayOfMonth } = rule;

    if (frequency === 'daily') {
      return interval === 1 ? 'Daily' : `Every ${interval} days`;
    }
    if (frequency === 'weekly') {
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const days = daysOfWeek.map(d => dayNames[d]).join(', ');
        return `Every ${days}`;
      }
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
    }
    if (frequency === 'monthly') {
      if (dayOfMonth) {
        return `Monthly on ${dayOfMonth}${['st','nd','rd'][dayOfMonth-1] || 'th'}`;
      }
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;
    }
    if (frequency === 'yearly') {
      return interval === 1 ? 'Yearly' : `Every ${interval} years`;
    }
    return null;
  };

  // Defer task to someday
  const handleDeferTask = (taskId: string) => {
    store.deferTask(taskId);
    setQuickActionTaskId(null);
    store.showToast('Moved to Someday', 'info');
  };

  // Undefer task (bring back from someday)
  const handleUndeferTask = (taskId: string) => {
    store.undeferTask(taskId);
    setQuickActionTaskId(null);
    store.showToast('Moved back to Inbox', 'success');
  };

  // Tutorial handlers
  const tutorialSteps = [
    {
      title: 'Welcome to Day Quest! ⚔️',
      content: 'Transform your tasks into quests and level up your productivity. Every completed task earns you XP!',
      icon: '🎮'
    },
    {
      title: 'Earn XP & Level Up 📈',
      content: 'Complete tasks to earn XP. Harder tasks and maintaining streaks give bonus XP. Watch your character grow as you level up!',
      icon: '⭐'
    },
    {
      title: 'Quick Add Tasks ✨',
      content: 'Add tasks quickly with shortcuts:\n• @project - Assign to project\n• #category - Add category\n• !high/medium/low - Set priority\n• ~easy/hard/epic - Set difficulty\n• "tomorrow", "next week" - Set due date\n• "daily", "every monday" - Make recurring',
      icon: '⌨️'
    },
    {
      title: 'Task Difficulty & Tiers 🎯',
      content: 'Set difficulty (Easy → Epic) and tier (Minor → Major) to earn more XP for challenging tasks. Epic tasks are "Boss Battles"!',
      icon: '🏆'
    },
    {
      title: 'Daily Quests & Streaks 🔥',
      content: 'Complete daily quests for bonus XP. Maintain your streak by completing tasks every day. Longer streaks = bigger XP multiplier!',
      icon: '📅'
    },
    {
      title: 'Ready to Begin! 🚀',
      content: 'Start by adding your first task. Press Cmd+K for the command palette, or just start typing in the quick add bar. Good luck, adventurer!',
      icon: '✅'
    }
  ];

  const handleTutorialNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handleTutorialPrev = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const completeTutorial = () => {
    localStorage.setItem('dayquest_tutorial_complete', 'true');
    setShowTutorial(false);
    setTutorialStep(0);
    store.showToast('Welcome to Day Quest! Add your first task to begin.', 'success');
  };

  const skipTutorial = () => {
    localStorage.setItem('dayquest_tutorial_complete', 'true');
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const toggleQuickActionMenu = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickActionTaskId(quickActionTaskId === taskId ? null : taskId);
  };

  // Close quick action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setQuickActionTaskId(null);
    if (quickActionTaskId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [quickActionTaskId]);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    // Add a slight delay to show the drag visual
    const target = e.target as HTMLElement;
    setTimeout(() => target.classList.add('dragging'), 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (taskId !== draggedTaskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const sourceTaskId = e.dataTransfer.getData('text/plain');

    if (sourceTaskId && sourceTaskId !== targetTaskId) {
      // Get current task order based on view
      const currentTasks = filteredTasks;
      const taskIds = currentTasks.map(t => t.id);

      const sourceIndex = taskIds.indexOf(sourceTaskId);
      const targetIndex = taskIds.indexOf(targetTaskId);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Remove source and insert at target position
        taskIds.splice(sourceIndex, 1);
        taskIds.splice(targetIndex, 0, sourceTaskId);

        store.reorderTasks(taskIds);
        store.showToast('Task reordered', 'success');
      }
    }

    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  // Bulk selection handlers
  const handleTaskSelect = (taskId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.shiftKey && lastSelectedIndex !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const tasksInRange = filteredTasks.slice(start, end + 1);
      const newSelected = new Set(selectedTaskIds);
      tasksInRange.forEach(t => newSelected.add(t.id));
      setSelectedTaskIds(newSelected);
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle individual selection
      const newSelected = new Set(selectedTaskIds);
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId);
      } else {
        newSelected.add(taskId);
      }
      setSelectedTaskIds(newSelected);
      setLastSelectedIndex(index);
    } else {
      // Single selection (clear others)
      if (selectedTaskIds.has(taskId) && selectedTaskIds.size === 1) {
        setSelectedTaskIds(new Set());
        setLastSelectedIndex(null);
      } else {
        setSelectedTaskIds(new Set([taskId]));
        setLastSelectedIndex(index);
      }
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredTasks.filter(t => !t.is_completed).map(t => t.id);
    setSelectedTaskIds(new Set(allIds));
    setLastSelectedIndex(null);
  };

  const clearSelection = () => {
    setSelectedTaskIds(new Set());
    setLastSelectedIndex(null);
    setShowBulkMenu(false);
  };

  const handleBulkComplete = () => {
    selectedTaskIds.forEach(id => {
      const task = store.tasks.find(t => t.id === id);
      if (task && !task.is_completed) {
        store.toggleTaskComplete(id);
      }
    });
    store.showToast(`Completed ${selectedTaskIds.size} tasks`, 'success');
    clearSelection();
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedTaskIds.size} tasks?`)) {
      selectedTaskIds.forEach(id => store.deleteTask(id));
      store.showToast(`Deleted ${selectedTaskIds.size} tasks`, 'success');
      clearSelection();
    }
  };

  const handleBulkSetDate = (action: 'today' | 'tomorrow' | 'next-week' | 'remove') => {
    const now = new Date();
    let dueDate: string | undefined;

    switch (action) {
      case 'today':
        now.setHours(23, 59, 0, 0);
        dueDate = now.toISOString();
        break;
      case 'tomorrow':
        now.setDate(now.getDate() + 1);
        now.setHours(23, 59, 0, 0);
        dueDate = now.toISOString();
        break;
      case 'next-week':
        now.setDate(now.getDate() + 7);
        now.setHours(23, 59, 0, 0);
        dueDate = now.toISOString();
        break;
      case 'remove':
        dueDate = undefined;
        break;
    }

    selectedTaskIds.forEach(id => store.updateTask(id, { due_date: dueDate }));
    const labels = { 'today': 'today', 'tomorrow': 'tomorrow', 'next-week': 'next week', 'remove': 'no date' };
    store.showToast(`Set ${selectedTaskIds.size} tasks to ${labels[action]}`, 'success');
    clearSelection();
  };

  // Clear selection when view changes
  useEffect(() => {
    clearSelection();
  }, [store.currentView]);

  const handleDeleteProject = (projectId: string) => {
    const project = store.projects.find((p) => p.id === projectId);
    if (project && confirm(`Delete project "${project.name}"?`)) {
      store.deleteProject(projectId);
      store.showToast('Project deleted', 'success');
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = store.categories.find((c) => c.id === categoryId);
    if (category && confirm(`Delete category "${category.name}"?`)) {
      store.deleteCategory(categoryId);
      store.showToast('Category deleted', 'success');
    }
  };

  // Commands for palette
  const commands = [
    { id: 'inbox', title: 'Go to Inbox', icon: '📥', shortcut: '1/I', category: 'Navigation', action: () => store.setView('inbox') },
    { id: 'today', title: 'Go to Today', icon: '📅', shortcut: '2/T', category: 'Navigation', action: () => store.setView('today') },
    { id: 'upcoming', title: 'Go to Upcoming', icon: '📆', shortcut: '3/U', category: 'Navigation', action: () => store.setView('upcoming') },
    { id: 'completed', title: 'Go to Completed', icon: '✅', shortcut: '4', category: 'Navigation', action: () => store.setView('completed') },
    { id: 'someday', title: 'Go to Someday', icon: '💭', shortcut: '5', category: 'Navigation', action: () => store.setView('someday') },
    { id: 'stats', title: 'View Stats', icon: '📊', shortcut: '6', category: 'Navigation', action: () => setShowStatsModal(true) },
    { id: 'new-task', title: 'Quick Add Task', icon: '✨', shortcut: 'N', category: 'Create', action: () => quickAddRef.current?.focus() },
    { id: 'full-task', title: 'Full Task Modal', icon: '➕', shortcut: 'A', category: 'Create', action: () => openTaskModal() },
    { id: 'new-project', title: 'New Project', icon: '📁', shortcut: 'P', category: 'Create', action: () => openProjectModal() },
    { id: 'new-category', title: 'New Category', icon: '🏷️', shortcut: 'C', category: 'Create', action: () => openCategoryModal() },
    { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: '⌨️', shortcut: '?', category: 'Help', action: () => setShowShortcutsModal(true) }
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(commandQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(commandQuery.toLowerCase())
  );

  const executeCommand = (cmd: typeof commands[0]) => {
    setShowCommandPalette(false);
    cmd.action();
  };

  const getViewInfo = () => {
    const view = store.currentView;
    if (view === 'inbox') return { title: 'Inbox', subtitle: 'All your tasks' };
    if (view === 'today') return { title: 'Today', subtitle: 'Tasks due today' };
    if (view === 'upcoming') return { title: 'Upcoming', subtitle: 'Future tasks' };
    if (view === 'completed') return { title: 'Completed', subtitle: 'Finished tasks' };
    if (view === 'someday') return { title: 'Someday', subtitle: 'Deferred tasks for later' };
    if (view.startsWith('project-')) {
      const project = store.projects.find((p) => p.id === view.replace('project-', ''));
      if (project) return { title: project.name, subtitle: 'Project tasks' };
    }
    if (view.startsWith('category-')) {
      const category = store.categories.find((c) => c.id === view.replace('category-', ''));
      if (category) return { title: category.name, subtitle: 'Category tasks' };
    }
    return { title: 'Tasks', subtitle: '' };
  };

  const viewInfo = getViewInfo();
  const filteredTasks = store.getFilteredTasks();
  const rankInfo = getRankForLevel(store.profile.level);
  const xpPercent = Math.min((store.profile.xp / store.profile.xp_to_next) * 100, 100);

  const inboxCount = store.tasks.filter((t) => !t.is_completed).length;
  const todayDate = new Date();
  todayDate.setHours(23, 59, 59, 999);
  const todayCount = store.tasks.filter(
    (t) => !t.is_completed && t.due_date && new Date(t.due_date) <= todayDate
  ).length;

  // Categorize tasks for Today view - separate overdue from due today
  const categorizeTodayTasks = () => {
    if (store.currentView !== 'today') return { overdue: [], dueToday: [], all: filteredTasks };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdue: typeof filteredTasks = [];
    const dueToday: typeof filteredTasks = [];

    filteredTasks.forEach((task) => {
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < now) {
          overdue.push(task);
        } else {
          dueToday.push(task);
        }
      } else {
        dueToday.push(task);
      }
    });

    return { overdue, dueToday, all: filteredTasks };
  };

  const taskCategories = categorizeTodayTasks();

  // Update navbar content with view info and actions
  useEffect(() => {
    if (!mounted) return;

    setCenterContent(
      <div className="nav-today-header">
        <span className="nav-today-view">{viewInfo.title}</span>
        <span className="nav-today-subtitle">{viewInfo.subtitle}</span>
      </div>
    );
  }, [mounted, viewInfo.title, viewInfo.subtitle, setCenterContent]);

  // Clean up navbar content on unmount
  useEffect(() => {
    return () => setCenterContent(null);
  }, [setCenterContent]);

  if (!mounted) {
    return (
      <div className="today-loading">
        <div className="today-loading-spinner" />
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        :root {
          /* Day Quest Theme - Uses universal theme system */
          /* App-specific accent from globals.css */
          --accent: var(--app-today);
          --accent-glow: var(--app-today-glow);
          --accent-hover: var(--app-today-dark);

          /* Map local vars to theme system for dark/light/terminal support */
          --bg-primary: var(--theme-bg-base);
          --bg-secondary: var(--theme-bg-elevated);
          --bg-tertiary: var(--theme-bg-tertiary);
          --bg-card: var(--theme-bg-card);
          --bg-card-hover: var(--theme-bg-card-hover);
          --text-primary: var(--theme-text-primary);
          --text-secondary: var(--theme-text-secondary);
          --text-tertiary: var(--theme-text-muted);
          --border: var(--theme-border);
          --border-light: var(--theme-border-light);
          --gold: var(--theme-gold);
          --gold-glow: var(--theme-gold-glow);
          --teal: var(--theme-success);
          --teal-glow: rgba(95, 191, 138, 0.3);
          --success: var(--theme-success);
          --warning: var(--theme-gold);
          --danger: var(--theme-danger);
        }

        /* Pixel Particles */
        .particles-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .pixel-particle {
          position: absolute;
          image-rendering: pixelated;
          animation: float-up linear infinite;
        }

        @keyframes float-up {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }

        .today-app {
          display: flex;
          min-height: 100vh;
          min-height: 100dvh;
          padding-top: var(--content-top);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .today-sidebar {
          width: 260px;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 40;
          padding-top: var(--content-top, 60px);
        }

        @media (max-width: 768px) {
          .today-sidebar {
            display: none;
          }
        }

        .sidebar-header {
          padding: 16px;
          flex-shrink: 0;
        }

        .character-card {
          background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2);
        }

        .character-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .character-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--gold), #FFA500);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          position: relative;
          border: 2px solid var(--gold);
          box-shadow: 0 0 15px var(--gold-glow);
        }

        .level-badge {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(180deg, var(--gold), #E6A000);
          color: #1a1a1a;
          font-size: 8px;
          font-weight: 700;
          font-family: 'Press Start 2P', monospace;
          min-width: 24px;
          height: 18px;
          padding: 0 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 0 #996600;
        }

        .character-info {
          flex: 1;
        }

        .character-rank {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--teal);
          text-shadow: 0 0 8px var(--teal-glow);
        }

        .character-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .xp-section {
          margin-bottom: 12px;
        }

        .xp-label {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          margin-bottom: 6px;
        }

        .xp-value {
          color: var(--gold);
          text-shadow: 0 0 8px var(--gold-glow);
        }

        .xp-bar {
          height: 6px;
          background: var(--border);
          border-radius: 3px;
          overflow: hidden;
        }

        .xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent) 0%, var(--teal) 100%);
          border-radius: 3px;
          transition: width 0.3s ease;
          box-shadow: 0 0 8px var(--accent-glow);
        }

        .stat-badges {
          display: flex;
          gap: 8px;
        }

        .stat-badge {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .stat-badge-icon {
          font-size: 14px;
        }

        .stat-badge-value {
          color: var(--text-primary);
        }

        .stat-badge-label {
          font-size: 9px;
          text-transform: uppercase;
          color: var(--text-tertiary);
          letter-spacing: 0.5px;
        }

        /* Daily Quests Widget */
        .daily-quests-widget {
          margin: 0 16px 16px;
          background: linear-gradient(180deg, rgba(92, 201, 245, 0.1) 0%, rgba(92, 201, 245, 0.05) 100%);
          border: 1px solid rgba(92, 201, 245, 0.2);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 0 20px rgba(92, 201, 245, 0.1);
        }

        .daily-quests-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .daily-quests-icon {
          font-size: 16px;
        }

        .daily-quests-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--accent);
          text-shadow: 0 0 8px var(--accent-glow);
        }

        .daily-quests-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .daily-quest-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .daily-quest-item:hover {
          border-color: var(--border-light);
          background: var(--bg-secondary);
        }

        .daily-quest-item.completed {
          background: rgba(80, 200, 120, 0.1);
          border-color: rgba(80, 200, 120, 0.3);
        }

        .daily-quest-check {
          min-width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 2px solid var(--border-light);
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-tertiary);
        }

        .daily-quest-item.completed .daily-quest-check {
          background: linear-gradient(135deg, var(--success), #40a060);
          border-color: var(--success);
          color: white;
          font-size: 12px;
          box-shadow: 0 0 10px rgba(80, 200, 120, 0.4);
        }

        .daily-quest-info {
          flex: 1;
          min-width: 0;
        }

        .daily-quest-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .daily-quest-item.completed .daily-quest-title {
          color: var(--success);
        }

        .daily-quest-desc {
          font-size: 9px;
          color: var(--text-tertiary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .daily-quest-xp {
          font-size: 10px;
          font-weight: 700;
          color: var(--gold);
          text-shadow: 0 0 6px var(--gold-glow);
          white-space: nowrap;
        }

        .daily-quest-item.completed .daily-quest-xp {
          color: var(--success);
          text-shadow: 0 0 6px rgba(80, 200, 120, 0.4);
        }

        .daily-quests-bonus {
          margin-top: 10px;
          padding: 10px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 180, 0, 0.1) 100%);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--gold);
          text-align: center;
          text-shadow: 0 0 8px var(--gold-glow);
          animation: quest-bonus-glow 2s ease-in-out infinite;
        }

        @keyframes quest-bonus-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.2); }
          50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.4); }
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
        }

        .nav-section {
          margin-bottom: 16px;
        }

        .nav-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nav-section-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 2px;
          font-size: 14px;
          opacity: 0.7;
        }

        .nav-section-btn:hover {
          opacity: 1;
          color: var(--accent);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }

        .nav-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: rgba(92, 201, 245, 0.15);
          color: var(--accent);
        }

        .nav-item-icon {
          width: 20px;
          text-align: center;
        }

        .nav-item-count {
          margin-left: auto;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-tertiary);
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .nav-item.active .nav-item-count {
          background: var(--accent);
          color: white;
        }

        .category-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          margin-top: auto;
        }

        .sidebar-footer-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-secondary);
          transition: all 0.15s ease;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
        }

        .sidebar-footer-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .sidebar-footer-icon {
          font-size: 16px;
        }

        .nav-item-count {
          margin-left: auto;
          font-size: 12px;
          color: var(--text-tertiary);
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .nav-item.active .nav-item-count {
          background: rgba(255,255,255,0.2);
          color: white;
        }

        .nav-project-item,
        .nav-category-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-item-actions {
          display: none;
          gap: 4px;
        }

        .nav-project-item:hover .nav-item-actions,
        .nav-category-item:hover .nav-item-actions {
          display: flex;
        }

        .nav-action-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          font-size: 12px;
          opacity: 0.6;
        }

        .nav-action-btn:hover {
          opacity: 1;
        }

        .category-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .today-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Desktop: offset main content for fixed sidebar, match navbar padding */
        @media (min-width: 769px) {
          .today-main {
            margin-left: 260px;
            padding-right: 16px;
          }
        }

        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }

        .btn-primary {
          background: var(--accent);
          color: white;
        }

        .btn-primary:hover {
          background: var(--accent-hover);
        }

        .btn-ghost {
          background: transparent;
          color: var(--text-secondary);
        }

        .btn-ghost:hover {
          background: var(--bg-tertiary);
        }

        .kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          font-size: 10px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 4px;
        }

        .task-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px 100px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-tertiary);
        }

        .empty-state-icon {
          font-size: 56px;
          margin-bottom: 16px;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 14px;
          color: var(--text-tertiary);
          margin-bottom: 20px;
        }

        .empty-state-tips {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .empty-state-tips .tip {
          font-size: 12px;
          color: var(--text-tertiary);
          background: var(--bg-tertiary);
          padding: 8px 12px;
          border-radius: 8px;
        }

        .empty-state-tips kbd,
        .empty-state-tips code {
          display: inline-block;
          padding: 2px 6px;
          font-size: 11px;
          font-family: monospace;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 4px;
          color: var(--accent);
        }

        .task-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          transition: all 0.15s ease;
        }

        .task-card:last-child {
          border-bottom: none;
        }

        .task-card:hover {
          background: var(--bg-tertiary);
          border-radius: 8px;
          border-bottom-color: transparent;
        }

        .task-card.completed {
          opacity: 0.5;
        }

        .task-card.keyboard-selected {
          background: rgba(92, 201, 245, 0.1);
          border-radius: 8px;
          border-bottom-color: transparent;
        }

        /* Today view section headers */
        .task-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .task-section-header.overdue {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.05);
          border-bottom-color: rgba(239, 68, 68, 0.2);
        }

        .task-section-header.today {
          color: var(--accent);
        }

        .section-icon {
          font-size: 14px;
        }

        .section-title {
          flex: 1;
        }

        .section-count {
          padding: 2px 8px;
          font-size: 11px;
          background: var(--bg-tertiary);
          border-radius: 10px;
        }

        .task-section-header.overdue .section-count {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
        }

        /* Overdue task card styling */
        .task-card.overdue {
          background: rgba(239, 68, 68, 0.03);
          border-left: 3px solid var(--danger);
        }

        .task-card.overdue:hover {
          background: rgba(239, 68, 68, 0.08);
        }

        .task-card.overdue .task-checkbox {
          border-color: var(--danger);
        }

        /* Drag & drop styles */
        .task-card[draggable="true"] {
          cursor: grab;
        }

        .task-card[draggable="true"]:active {
          cursor: grabbing;
        }

        .task-card.dragging {
          opacity: 0.5;
          background: var(--bg-tertiary);
        }

        .task-card.drag-over {
          border-top: 2px solid var(--accent);
          margin-top: -2px;
        }

        .task-card.drag-over::before {
          content: '';
          position: absolute;
          top: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
        }

        /* Bulk selection */
        .task-card.bulk-selected {
          background: rgba(92, 201, 245, 0.08);
          border-left: 3px solid var(--accent);
        }

        .task-checkbox.bulk-selected {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Bulk action bar */
        .bulk-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(92, 201, 245, 0.1), rgba(92, 201, 245, 0.05));
          border-bottom: 1px solid var(--accent);
          gap: 16px;
          flex-wrap: wrap;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .bulk-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bulk-count {
          font-weight: 600;
          color: var(--accent);
        }

        .bulk-select-all,
        .bulk-clear {
          background: none;
          border: none;
          font-size: 12px;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px 8px;
        }

        .bulk-select-all:hover,
        .bulk-clear:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }

        .bulk-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .bulk-actions button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          font-size: 13px;
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .bulk-actions button:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border-color: var(--text-tertiary);
        }

        .bulk-actions button.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: var(--danger);
          color: var(--danger);
        }

        .task-checkbox {
          width: 22px;
          height: 22px;
          border: 2px solid var(--accent);
          border-radius: 50%;
          cursor: pointer;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          margin-top: 2px;
        }

        .task-checkbox:hover {
          border-color: var(--accent);
        }

        .task-checkbox.checked {
          background: var(--success);
          border-color: var(--success);
          color: white;
        }

        .task-content {
          flex: 1;
          min-width: 0;
          cursor: pointer;
        }

        .task-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .task-card.completed .task-title {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .task-recurrence {
          color: var(--accent);
          font-weight: 500;
        }

        .task-subtasks {
          color: var(--teal);
          font-weight: 500;
        }

        .task-project {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-tertiary);
        }

        .task-project-icon {
          font-size: 11px;
        }

        .tier-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .task-xp {
          color: var(--success);
          font-weight: 600;
          font-size: 11px;
        }

        .task-delete-btn {
          opacity: 0;
          transition: opacity 0.15s ease;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          font-size: 16px;
          color: var(--text-tertiary);
        }

        .task-card:hover .task-delete-btn {
          opacity: 0.6;
        }

        .task-delete-btn:hover {
          opacity: 1 !important;
          color: var(--danger);
        }

        /* Task quick actions */
        .task-actions {
          position: relative;
          display: flex;
          align-items: center;
        }

        .task-more-btn {
          opacity: 0;
          transition: opacity 0.15s ease;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 18px;
          font-weight: bold;
          color: var(--text-tertiary);
          letter-spacing: 2px;
        }

        .task-card:hover .task-more-btn {
          opacity: 0.6;
        }

        .task-more-btn:hover {
          opacity: 1 !important;
          color: var(--text-primary);
        }

        .quick-action-menu {
          position: absolute;
          top: 100%;
          right: 0;
          min-width: 160px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px;
          z-index: 300;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          animation: fadeInScale 0.12s ease;
        }

        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .quick-action-menu button {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          border: none;
          background: none;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 6px;
          text-align: left;
          transition: background 0.1s ease, color 0.1s ease;
        }

        .quick-action-menu button:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .quick-action-menu button.danger:hover {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
        }

        .quick-action-divider {
          height: 1px;
          background: var(--border);
          margin: 6px 0;
        }

        /* Floating quick add - gamify-today style */
        .quick-add-container {
          position: fixed;
          bottom: 24px;
          left: 280px;
          right: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 24px;
          pointer-events: none;
          z-index: 200;
        }

        @media (max-width: 768px) {
          .quick-add-container {
            display: none;
          }
        }

        .quick-add-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          max-width: 600px;
          padding: 14px 18px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          pointer-events: auto;
          transition: all 0.15s ease;
        }

        .quick-add-wrapper:focus-within {
          border-color: var(--accent);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 3px var(--accent-glow);
        }

        .quick-add-icon {
          color: var(--accent);
          font-size: 16px;
          opacity: 0.6;
        }

        .quick-add-input {
          flex: 1;
          border: none;
          background: transparent !important;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          caret-color: var(--accent);
          -webkit-appearance: none;
          -webkit-text-fill-color: var(--text-primary);
        }

        .quick-add-input::placeholder {
          color: var(--text-tertiary);
          -webkit-text-fill-color: var(--text-tertiary);
          opacity: 1;
        }

        .quick-add-input:-webkit-autofill,
        .quick-add-input:-webkit-autofill:hover,
        .quick-add-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px var(--bg-primary) inset !important;
          -webkit-text-fill-color: var(--text-primary) !important;
          background-color: transparent !important;
        }

        /* Autocomplete dropdown - above input */
        .quick-add-autocomplete {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px);
          transition: all 0.15s ease;
          pointer-events: none;
        }

        .quick-add-autocomplete.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          pointer-events: auto;
        }

        .autocomplete-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .autocomplete-item:hover {
          background: var(--bg-secondary);
        }

        .autocomplete-item.selected {
          background: var(--accent);
          color: white;
        }

        .autocomplete-item.create-new {
          border-top: 1px solid var(--border);
          color: var(--accent);
          font-weight: 500;
        }

        .autocomplete-item.create-new .autocomplete-icon {
          color: var(--accent);
        }

        .autocomplete-item.create-new.selected {
          background: var(--accent);
          color: white;
        }

        .autocomplete-item.create-new.selected .autocomplete-icon {
          color: white;
        }

        .autocomplete-icon {
          font-size: 16px;
          width: 24px;
          text-align: center;
        }

        .autocomplete-label {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }

        .autocomplete-value {
          font-family: monospace;
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .autocomplete-item.selected .autocomplete-value {
          color: rgba(255, 255, 255, 0.7);
        }

        /* Keyboard hints below input */
        .quick-add-hints {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-tertiary);
          opacity: 0;
          transition: opacity 0.15s ease;
          pointer-events: none;
        }

        .quick-add-wrapper:focus-within + .quick-add-hints {
          opacity: 1;
        }

        .quick-add-hint-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .quick-add-hints .kbd {
          padding: 2px 5px;
          font-size: 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 3px;
        }

        .hint-divider {
          color: var(--border);
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: var(--bg-primary);
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-tertiary);
        }

        .modal-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 14px;
          background-color: var(--bg-secondary) !important;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          -webkit-appearance: none;
          -webkit-text-fill-color: var(--text-primary);
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: var(--text-tertiary);
          -webkit-text-fill-color: var(--text-tertiary);
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }

        .form-input:-webkit-autofill,
        .form-input:-webkit-autofill:hover,
        .form-input:-webkit-autofill:focus,
        .form-textarea:-webkit-autofill,
        .form-textarea:-webkit-autofill:hover,
        .form-textarea:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px var(--bg-secondary) inset !important;
          -webkit-text-fill-color: var(--text-primary) !important;
        }

        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .xp-preview {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          font-size: 14px;
          margin-top: 16px;
        }

        .xp-preview-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--accent);
        }

        .modal-footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }

        /* Command Palette */
        .command-palette {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 100px;
          z-index: 1100;
        }

        .command-palette-content {
          background: var(--bg-primary);
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .command-palette-input {
          width: 100%;
          padding: 16px 20px;
          border: none;
          border-bottom: 1px solid var(--border);
          font-size: 16px;
          background: var(--bg-primary);
          color: var(--text-primary);
          outline: none;
        }

        .command-palette-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .command-section-title {
          padding: 12px 20px 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }

        .command-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .command-item:hover,
        .command-item.selected {
          background: var(--bg-tertiary);
        }

        .command-item-icon {
          font-size: 18px;
        }

        .command-item-title {
          flex: 1;
          font-size: 14px;
        }

        .command-item-shortcut {
          font-size: 11px;
          color: var(--text-tertiary);
          background: var(--bg-secondary);
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid var(--border);
        }

        /* Stats Modal */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--bg-tertiary);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--accent);
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-top: 4px;
        }

        /* Streak Badges */
        .streak-badges {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .streak-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          transition: all 0.15s ease;
        }

        .streak-badge.active {
          background: linear-gradient(135deg, rgba(92, 201, 245, 0.1), rgba(92, 201, 245, 0.05));
          border: 1px solid rgba(92, 201, 245, 0.3);
        }

        .streak-badge.inactive {
          opacity: 0.5;
        }

        .streak-badge-icon {
          font-size: 24px;
        }

        .streak-badge-info {
          display: flex;
          flex-direction: column;
        }

        .streak-badge-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .streak-badge-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
        }

        .streak-badge.active .streak-badge-value {
          color: var(--success);
        }

        .streak-badge-best {
          font-size: 11px;
          font-weight: 400;
          color: var(--text-tertiary);
        }

        .achievement-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .achievement-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 8px;
          background: var(--bg-tertiary);
        }

        .achievement-item.locked {
          opacity: 0.5;
        }

        .achievement-icon {
          font-size: 24px;
        }

        .achievement-info {
          flex: 1;
        }

        .achievement-name {
          font-weight: 600;
          font-size: 14px;
        }

        .achievement-desc {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .achievement-xp {
          font-size: 12px;
          color: var(--accent);
          font-weight: 600;
        }

        /* Shortcuts Modal */
        .shortcuts-modal {
          max-width: 600px;
        }

        .shortcuts-content {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        @media (max-width: 600px) {
          .shortcuts-content {
            grid-template-columns: 1fr;
          }
        }

        .shortcuts-section {
          background: var(--bg-tertiary);
          border-radius: 12px;
          padding: 16px;
        }

        .shortcuts-section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          margin-bottom: 12px;
        }

        .shortcut-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 13px;
        }

        .shortcut-keys {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-tertiary);
        }

        .shortcut-keys .kbd {
          min-width: 22px;
        }

        /* Tutorial Modal */
        .tutorial-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .tutorial-modal {
          background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
          border: 2px solid var(--accent);
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          position: relative;
          box-shadow: 0 0 60px var(--accent-glow), 0 20px 40px rgba(0, 0, 0, 0.5);
          animation: tutorialSlideUp 0.4s ease;
        }

        @keyframes tutorialSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tutorial-skip {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-tertiary);
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tutorial-skip:hover {
          color: var(--text-primary);
          border-color: var(--text-tertiary);
        }

        .tutorial-icon {
          font-size: 64px;
          margin-bottom: 16px;
          animation: tutorialBounce 2s ease-in-out infinite;
        }

        @keyframes tutorialBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .tutorial-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 18px;
          color: var(--accent);
          margin: 0 0 20px;
          text-shadow: 0 0 20px var(--accent-glow);
          line-height: 1.4;
        }

        .tutorial-content {
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.8;
          margin-bottom: 28px;
        }

        .tutorial-content p {
          margin: 8px 0;
        }

        .tutorial-progress {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 28px;
        }

        .tutorial-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--border);
          transition: all 0.3s ease;
        }

        .tutorial-dot.active {
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow);
          transform: scale(1.2);
        }

        .tutorial-dot.completed {
          background: var(--success);
        }

        .tutorial-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .tutorial-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 12px;
          padding: 14px 28px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .tutorial-btn.primary {
          background: linear-gradient(135deg, var(--accent), var(--accent-dark, #3b9ecf));
          color: white;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3), 0 0 20px var(--accent-glow);
        }

        .tutorial-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 rgba(0, 0, 0, 0.3), 0 0 30px var(--accent-glow);
        }

        .tutorial-btn.primary:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
        }

        .tutorial-btn.secondary {
          background: transparent;
          color: var(--text-secondary);
          border: 2px solid var(--border);
        }

        .tutorial-btn.secondary:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        @media (max-width: 600px) {
          .tutorial-modal {
            padding: 30px 24px;
          }

          .tutorial-icon {
            font-size: 48px;
          }

          .tutorial-title {
            font-size: 14px;
          }

          .tutorial-content {
            font-size: 14px;
          }

          .tutorial-btn {
            font-size: 10px;
            padding: 12px 20px;
          }
        }

        /* Toast */
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1200;
        }

        .toast {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.2s ease;
        }

        .toast.success {
          border-left: 3px solid var(--success);
        }

        .toast.error {
          border-left: 3px solid var(--danger);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Mobile */
        .mobile-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
          padding: 8px;
          z-index: 100;
        }

        @media (max-width: 768px) {
          .mobile-nav {
            display: flex;
            justify-content: space-around;
          }

          .task-list {
            padding-bottom: 80px;
          }
        }

        .mobile-nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 10px;
          cursor: pointer;
        }

        .mobile-nav-btn.active {
          color: var(--accent);
        }

        .mobile-nav-icon {
          font-size: 20px;
        }

        /* Loading */
        .today-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg-primary);
        }

        .today-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Mobile Panel */
        .mobile-panel-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 200;
        }

        .mobile-panel-overlay.active {
          display: block;
        }

        .mobile-panel {
          display: none;
          position: fixed;
          bottom: 60px;
          left: 0;
          right: 0;
          background: var(--bg-primary);
          border-radius: 20px 20px 0 0;
          padding: 20px;
          max-height: 60vh;
          overflow-y: auto;
          transform: translateY(100%);
          transition: transform 0.3s ease;
          z-index: 201;
        }

        @media (max-width: 768px) {
          .mobile-panel.active {
            display: block;
            transform: translateY(0);
          }
        }

        .mobile-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .mobile-panel-title {
          font-size: 18px;
          font-weight: 600;
        }

        .mobile-panel-close {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-tertiary);
          cursor: pointer;
        }

        .mobile-panel-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .mobile-panel-item:hover {
          background: var(--bg-tertiary);
        }

        @media (max-width: 768px) {
          .mobile-panel-overlay.active + .mobile-panel {
            display: block;
          }
        }

        /* Hide mobile FAB on desktop */
        .mobile-fab {
          display: none;
        }

        /* ==========================================
           MOBILE REDESIGN - Clean, Touch-Friendly UI
           ========================================== */
        @media (max-width: 768px) {
          /* App container */
          .today-app {
            padding-top: var(--content-top);
            min-height: 100vh;
            min-height: 100dvh;
            padding-bottom: env(safe-area-inset-bottom, 0);
          }

          /* Main content area */
          .today-main {
            padding-bottom: 90px;
          }

          /* Task list - space for nav + quick add */
          .task-list {
            padding: 12px 16px calc(120px + env(safe-area-inset-bottom, 0));
          }

          .task-card {
            padding: 14px 0;
          }

          .task-title {
            font-size: 15px;
          }

          .task-meta {
            font-size: 11px;
            gap: 6px;
          }

          .task-checkbox {
            width: 22px;
            height: 22px;
          }

          /* Empty state */
          .empty-state {
            padding: 60px 20px;
          }

          .empty-state-icon {
            font-size: 48px;
          }

          .empty-state p {
            font-size: 14px;
          }

          /* Mobile Bottom Navigation - Compact */
          .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--bg-primary);
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-around;
            padding: 4px 0;
            padding-bottom: max(4px, env(safe-area-inset-bottom, 0));
            z-index: 9999;
          }

          .mobile-nav-btn {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 6px 4px;
            background: none;
            border: none;
            color: var(--text-tertiary);
            font-size: 9px;
            font-weight: 500;
            cursor: pointer;
            transition: color 0.15s ease;
          }

          .mobile-nav-btn.active {
            color: var(--accent);
          }

          .mobile-nav-icon {
            font-size: 18px;
          }

          /* Mobile Quick Add - HIDDEN on mobile */
          .quick-add-container {
            display: none !important;
          }

          /* Mobile Add Button in Nav */
          .mobile-nav-add {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%);
            border: none;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px var(--accent-glow);
            margin-top: -24px;
            font-size: 20px;
          }

          .mobile-nav-add:active {
            transform: scale(0.95);
          }

          /* Mobile panels - slide up from bottom */
          .mobile-panel {
            border-radius: 16px 16px 0 0;
            padding: 16px;
            max-height: 70vh;
          }

          .mobile-panel-header {
            margin-bottom: 12px;
          }

          .mobile-panel-title {
            font-size: 16px;
          }

          .mobile-panel-item {
            padding: 12px;
            font-size: 14px;
            border-radius: 8px;
          }

          /* Modals on mobile */
          .modal {
            width: 100%;
            max-width: 100%;
            height: 100%;
            max-height: 100%;
            border-radius: 0;
            margin: 0;
          }

          .modal-header {
            padding: 16px;
          }

          .modal-body {
            padding: 16px;
          }

          .modal-footer {
            padding: 16px;
          }

          .form-input,
          .form-textarea,
          .form-select {
            font-size: 16px;
            padding: 12px;
          }
        }
      `}</style>

      <div className="today-app">
        <PixelParticles />

        {/* Sidebar */}
        <aside className="today-sidebar">
          <div className="sidebar-header">
            <div className="character-card">
              <div className="character-top">
                <div className="character-avatar">
                  {rankInfo.icon}
                  <span className="level-badge">{store.profile.level}</span>
                </div>
                <div className="character-info">
                  <div className="character-rank">{rankInfo.rank.toUpperCase()}</div>
                  <div className="character-title">Task Warrior</div>
                </div>
              </div>

              <div className="xp-section">
                <div className="xp-label">
                  <span>EXPERIENCE</span>
                  <span className="xp-value">{store.profile.xp} / {store.profile.xp_to_next}</span>
                </div>
                <div className="xp-bar">
                  <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
                </div>
              </div>

              <div className="stat-badges">
                <div className="stat-badge">
                  <span className="stat-badge-icon">🔥</span>
                  <div>
                    <div className="stat-badge-value">{store.profile.current_streak}</div>
                    <div className="stat-badge-label">Streak</div>
                  </div>
                </div>
                <div className="stat-badge">
                  <span className="stat-badge-icon">✅</span>
                  <div>
                    <div className="stat-badge-value">{todayCount}</div>
                    <div className="stat-badge-label">Today</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Quests Widget */}
          <div className="daily-quests-widget">
            <div className="daily-quests-header">
              <span className="daily-quests-icon">⚔️</span>
              <span className="daily-quests-title">Daily Quests</span>
            </div>
            <div className="daily-quests-list">
              {store.getDailyQuests().quests.map((quest) => (
                <div key={quest.id} className={`daily-quest-item ${quest.completed ? 'completed' : ''}`}>
                  <div className="daily-quest-check">
                    {quest.completed ? '✓' : `${quest.progress}/${quest.target}`}
                  </div>
                  <div className="daily-quest-info">
                    <div className="daily-quest-title">{quest.title}</div>
                    <div className="daily-quest-desc">{quest.description}</div>
                  </div>
                  <div className="daily-quest-xp">+{quest.xp_reward}</div>
                </div>
              ))}
            </div>
            {store.getDailyQuests().quests.every(q => q.completed) && (
              <div className="daily-quests-bonus">
                ✨ All quests complete! +50 XP bonus
              </div>
            )}
          </div>

          {/* Accountability Partners */}
          <AccountabilityPartners />

          <nav className="sidebar-nav">
            <div className="nav-section">
              <NavItem
                icon="📥"
                label="Inbox"
                count={inboxCount}
                active={store.currentView === 'inbox'}
                onClick={() => store.setView('inbox')}
              />
              <NavItem
                icon="📅"
                label="Today"
                count={todayCount}
                active={store.currentView === 'today'}
                onClick={() => store.setView('today')}
              />
              <NavItem
                icon="📆"
                label="Upcoming"
                active={store.currentView === 'upcoming'}
                onClick={() => store.setView('upcoming')}
              />
              <NavItem
                icon="✅"
                label="Completed"
                active={store.currentView === 'completed'}
                onClick={() => store.setView('completed')}
              />
              <NavItem
                icon="💭"
                label="Someday"
                count={store.tasks.filter((t) => t.is_someday && !t.is_completed).length}
                active={store.currentView === 'someday'}
                onClick={() => store.setView('someday')}
              />
            </div>

            <div className="nav-section">
              <div className="nav-section-header">
                Projects
                <button className="nav-section-btn" onClick={() => openProjectModal()}>+</button>
              </div>
              {store.projects.map((project) => {
                const taskCount = store.tasks.filter(
                  (t) => t.project_id === project.id && !t.is_completed
                ).length;
                return (
                  <div key={project.id} className="nav-project-item">
                    <NavItem
                      icon="📁"
                      label={project.name}
                      count={taskCount}
                      active={store.currentView === `project-${project.id}`}
                      onClick={() => store.setView(`project-${project.id}`)}
                    />
                    <div className="nav-item-actions">
                      <button
                        className="nav-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProjectModal(project);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="nav-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="nav-section">
              <div className="nav-section-header">
                Categories
                <button className="nav-section-btn" onClick={() => openCategoryModal()}>+</button>
              </div>
              {store.categories.map((category) => (
                <div key={category.id} className="nav-category-item">
                  <NavItem
                    icon={<span className="category-dot" style={{ background: category.color }} />}
                    label={category.name}
                    active={store.currentView === `category-${category.id}`}
                    onClick={() => store.setView(`category-${category.id}`)}
                  />
                  <div className="nav-item-actions">
                    <button
                      className="nav-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCategoryModal(category);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      className="nav-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="sidebar-footer">
            <button className="sidebar-footer-item" onClick={() => setShowStatsModal(true)}>
              <span className="sidebar-footer-icon">📊</span>
              Stats & Achievements
            </button>
            <button className="sidebar-footer-item" onClick={() => setShowShortcutsModal(true)}>
              <span className="sidebar-footer-icon">⌨️</span>
              Keyboard Shortcuts
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="today-main">
          {/* Bulk Action Bar */}
          {selectedTaskIds.size > 0 && (
            <div className="bulk-action-bar">
              <div className="bulk-info">
                <span className="bulk-count">{selectedTaskIds.size} selected</span>
                <button className="bulk-select-all" onClick={handleSelectAll}>Select all</button>
                <button className="bulk-clear" onClick={clearSelection}>Clear</button>
              </div>
              <div className="bulk-actions">
                <button onClick={handleBulkComplete} title="Complete selected">
                  ✅ Complete
                </button>
                <button onClick={() => handleBulkSetDate('today')} title="Due today">
                  📅 Today
                </button>
                <button onClick={() => handleBulkSetDate('tomorrow')} title="Due tomorrow">
                  🌅 Tomorrow
                </button>
                <button onClick={() => handleBulkSetDate('next-week')} title="Due next week">
                  📆 Next week
                </button>
                <button className="danger" onClick={handleBulkDelete} title="Delete selected">
                  🗑️ Delete
                </button>
              </div>
            </div>
          )}
          <div className="task-list">
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                {store.currentView === 'inbox' && (
                  <>
                    <div className="empty-state-icon">✨</div>
                    <h3>Inbox Zero!</h3>
                    <p>All caught up. Time to plan your next adventure.</p>
                    <div className="empty-state-tips">
                      <span className="tip">💡 Press <kbd>N</kbd> to add a new quest</span>
                    </div>
                  </>
                )}
                {store.currentView === 'today' && (
                  <>
                    <div className="empty-state-icon">🏖️</div>
                    <h3>No quests today</h3>
                    <p>Your day is clear. Add some tasks or enjoy the break!</p>
                    <div className="empty-state-tips">
                      <span className="tip">💡 Type <code>today</code> or <code>tmr</code> when adding tasks</span>
                    </div>
                  </>
                )}
                {store.currentView === 'upcoming' && (
                  <>
                    <div className="empty-state-icon">🗓️</div>
                    <h3>Nothing scheduled</h3>
                    <p>Plan ahead by adding due dates to your tasks.</p>
                    <div className="empty-state-tips">
                      <span className="tip">💡 Try: <code>friday</code>, <code>next week</code>, <code>dec 25</code></span>
                    </div>
                  </>
                )}
                {store.currentView === 'completed' && (
                  <>
                    <div className="empty-state-icon">⚔️</div>
                    <h3>No victories yet</h3>
                    <p>Complete your first quest to earn XP!</p>
                    <div className="empty-state-tips">
                      <span className="tip">💡 Harder tasks give more XP. Try <code>^epic</code> tier!</span>
                    </div>
                  </>
                )}
                {store.currentView.startsWith('project-') && (
                  <>
                    <div className="empty-state-icon">📁</div>
                    <h3>Empty project</h3>
                    <p>This project awaits its first quest.</p>
                    <div className="empty-state-tips">
                      <span className="tip">💡 Use <code>@project-name</code> to add tasks here</span>
                    </div>
                  </>
                )}
                {store.currentView.startsWith('category-') && (
                  <>
                    <div className="empty-state-icon">🏷️</div>
                    <h3>Empty category</h3>
                    <p>No tasks with this label yet.</p>
                    <div className="empty-state-tips">
                      <span className="tip">💡 Use <code>#category-name</code> to tag tasks</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Render sectioned view for Today, flat list for others */}
                {store.currentView === 'today' && taskCategories.overdue.length > 0 && (
                  <>
                    <div className="task-section-header overdue">
                      <span className="section-icon">⚠️</span>
                      <span className="section-title">Overdue</span>
                      <span className="section-count">{taskCategories.overdue.length}</span>
                    </div>
                    {taskCategories.overdue.map((task, index) => {
                      const project = store.projects.find((p) => p.id === task.project_id);
                      const dueInfo = formatDueDate(task.due_date);
                      const xpPreview = calculateXPPreview(task, store.profile.current_streak);
                      const tierInfo = TIERS[task.tier];
                      const globalIndex = index;
                      const isSelected = globalIndex === selectedTaskIndex;

                      return (
                        <div
                          key={task.id}
                          ref={isSelected ? (el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) : undefined}
                          className={`task-card overdue ${task.priority ? `priority-${task.priority.toLowerCase()}` : ''} ${isSelected ? 'keyboard-selected' : ''}`}
                        >
                          <div className={`task-checkbox`} onClick={() => handleToggleComplete(task.id)} />
                          <div className="task-content" onClick={() => openTaskModal(task)}>
                            <div className="task-title">{task.title}</div>
                            <div className="task-meta">
                              {project && <span>📁 {project.name}</span>}
                              {dueInfo && <span className={`task-due ${dueInfo.class}`}>📅 {dueInfo.text}</span>}
                              {task.recurrence_rule && <span className="task-recurrence">🔄 {formatRecurrence(task.recurrence_rule)}</span>}
                              {(() => {
                                const progress = store.getSubtaskProgress(task.id);
                                return progress.total > 0 ? <span className="task-subtasks">📋 {progress.completed}/{progress.total}</span> : null;
                              })()}
                              <span className={`tier-badge ${task.tier}`}>{tierInfo.name}</span>
                              <span className="task-xp">+{xpPreview} XP</span>
                            </div>
                          </div>
                          <div className="task-actions">
                            <button className="task-more-btn" onClick={(e) => toggleQuickActionMenu(task.id, e)} title="Quick actions">⋯</button>
                            {quickActionTaskId === task.id && (
                              <div className="quick-action-menu" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleQuickDateAction(task.id, 'today')}>📅 Do today</button>
                                <button onClick={() => handleQuickDateAction(task.id, 'tomorrow')}>🌅 Do tomorrow</button>
                                <button onClick={() => handleQuickDateAction(task.id, 'next-week')}>📆 Next week</button>
                                {task.due_date && <button onClick={() => handleQuickDateAction(task.id, 'remove')}>❌ Remove date</button>}
                                {!task.is_someday && <button onClick={() => handleDeferTask(task.id)}>💭 Someday</button>}
                                {task.is_someday && <button onClick={() => handleUndeferTask(task.id)}>📥 Move to Inbox</button>}
                                <div className="quick-action-divider" />
                                <button onClick={() => { openTaskModal(task); setQuickActionTaskId(null); }}>✏️ Edit task</button>
                                <button className="danger" onClick={() => { handleDeleteTask(task.id); setQuickActionTaskId(null); }}>🗑️ Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {store.currentView === 'today' && taskCategories.dueToday.length > 0 && (
                  <>
                    <div className="task-section-header today">
                      <span className="section-icon">📅</span>
                      <span className="section-title">Due Today</span>
                      <span className="section-count">{taskCategories.dueToday.length}</span>
                    </div>
                    {taskCategories.dueToday.map((task, index) => {
                      const project = store.projects.find((p) => p.id === task.project_id);
                      const dueInfo = formatDueDate(task.due_date);
                      const xpPreview = calculateXPPreview(task, store.profile.current_streak);
                      const tierInfo = TIERS[task.tier];
                      const globalIndex = taskCategories.overdue.length + index;
                      const isSelected = globalIndex === selectedTaskIndex;

                      return (
                        <div
                          key={task.id}
                          ref={isSelected ? (el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) : undefined}
                          className={`task-card ${task.priority ? `priority-${task.priority.toLowerCase()}` : ''} ${isSelected ? 'keyboard-selected' : ''}`}
                        >
                          <div className={`task-checkbox`} onClick={() => handleToggleComplete(task.id)} />
                          <div className="task-content" onClick={() => openTaskModal(task)}>
                            <div className="task-title">{task.title}</div>
                            <div className="task-meta">
                              {project && <span>📁 {project.name}</span>}
                              {dueInfo && <span className={`task-due ${dueInfo.class}`}>📅 {dueInfo.text}</span>}
                              {task.recurrence_rule && <span className="task-recurrence">🔄 {formatRecurrence(task.recurrence_rule)}</span>}
                              {(() => {
                                const progress = store.getSubtaskProgress(task.id);
                                return progress.total > 0 ? <span className="task-subtasks">📋 {progress.completed}/{progress.total}</span> : null;
                              })()}
                              <span className={`tier-badge ${task.tier}`}>{tierInfo.name}</span>
                              <span className="task-xp">+{xpPreview} XP</span>
                            </div>
                          </div>
                          <div className="task-actions">
                            <button className="task-more-btn" onClick={(e) => toggleQuickActionMenu(task.id, e)} title="Quick actions">⋯</button>
                            {quickActionTaskId === task.id && (
                              <div className="quick-action-menu" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleQuickDateAction(task.id, 'today')}>📅 Do today</button>
                                <button onClick={() => handleQuickDateAction(task.id, 'tomorrow')}>🌅 Do tomorrow</button>
                                <button onClick={() => handleQuickDateAction(task.id, 'next-week')}>📆 Next week</button>
                                {task.due_date && <button onClick={() => handleQuickDateAction(task.id, 'remove')}>❌ Remove date</button>}
                                {!task.is_someday && <button onClick={() => handleDeferTask(task.id)}>💭 Someday</button>}
                                {task.is_someday && <button onClick={() => handleUndeferTask(task.id)}>📥 Move to Inbox</button>}
                                <div className="quick-action-divider" />
                                <button onClick={() => { openTaskModal(task); setQuickActionTaskId(null); }}>✏️ Edit task</button>
                                <button className="danger" onClick={() => { handleDeleteTask(task.id); setQuickActionTaskId(null); }}>🗑️ Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {/* Standard flat list for non-Today views */}
                {store.currentView !== 'today' && filteredTasks.map((task, index) => {
                  const project = store.projects.find((p) => p.id === task.project_id);
                  const dueInfo = formatDueDate(task.due_date);
                  const xpPreview = calculateXPPreview(task, store.profile.current_streak);
                  const tierInfo = TIERS[task.tier];
                  const isKeyboardSelected = index === selectedTaskIndex;
                  const isBulkSelected = selectedTaskIds.has(task.id);

                  return (
                    <div
                      key={task.id}
                      ref={isKeyboardSelected ? (el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) : undefined}
                      className={`task-card ${task.is_completed ? 'completed' : ''} ${
                        task.priority ? `priority-${task.priority.toLowerCase()}` : ''
                      } ${isKeyboardSelected ? 'keyboard-selected' : ''} ${isBulkSelected ? 'bulk-selected' : ''} ${draggedTaskId === task.id ? 'dragging' : ''} ${dragOverTaskId === task.id ? 'drag-over' : ''}`}
                      draggable={!task.is_completed}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, task.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, task.id)}
                    >
                      <div
                        className={`task-checkbox ${task.is_completed ? 'checked' : ''} ${isBulkSelected ? 'bulk-selected' : ''}`}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || selectedTaskIds.size > 0) {
                            handleTaskSelect(task.id, index, e);
                          } else {
                            handleToggleComplete(task.id);
                          }
                        }}
                      >
                        {task.is_completed ? '✓' : isBulkSelected ? '✓' : ''}
                      </div>
                      <div className="task-content" onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey) {
                          handleTaskSelect(task.id, index, e);
                        } else {
                          openTaskModal(task);
                        }
                      }}>
                        <div className="task-title">{task.title}</div>
                        <div className="task-meta">
                          {project && <span>📁 {project.name}</span>}
                          {dueInfo && (
                            <span className={`task-due ${dueInfo.class}`}>📅 {dueInfo.text}</span>
                          )}
                          {task.recurrence_rule && <span className="task-recurrence">🔄 {formatRecurrence(task.recurrence_rule)}</span>}
                          {(() => {
                            const progress = store.getSubtaskProgress(task.id);
                            return progress.total > 0 ? <span className="task-subtasks">📋 {progress.completed}/{progress.total}</span> : null;
                          })()}
                          <span className={`tier-badge ${task.tier}`}>{tierInfo.name}</span>
                          {!task.is_completed && (
                            <span className="task-xp">+{xpPreview} XP</span>
                          )}
                          {task.is_completed && task.xp_earned > 0 && (
                            <span className="task-xp">Earned {task.xp_earned} XP</span>
                          )}
                        </div>
                      </div>
                      <div className="task-actions">
                        <button
                          className="task-more-btn"
                          onClick={(e) => toggleQuickActionMenu(task.id, e)}
                          title="Quick actions"
                        >
                          ⋯
                        </button>
                        {quickActionTaskId === task.id && (
                          <div className="quick-action-menu" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleQuickDateAction(task.id, 'today')}>
                              📅 Do today
                            </button>
                            <button onClick={() => handleQuickDateAction(task.id, 'tomorrow')}>
                              🌅 Do tomorrow
                            </button>
                            <button onClick={() => handleQuickDateAction(task.id, 'next-week')}>
                              📆 Next week
                            </button>
                            {task.due_date && (
                              <button onClick={() => handleQuickDateAction(task.id, 'remove')}>
                                ❌ Remove date
                              </button>
                            )}
                            <div className="quick-action-divider" />
                            <button onClick={() => { openTaskModal(task); setQuickActionTaskId(null); }}>
                              ✏️ Edit task
                            </button>
                            <button className="danger" onClick={() => { handleDeleteTask(task.id); setQuickActionTaskId(null); }}>
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

        </main>

        {/* Floating Quick Add - gamify-today style */}
        <div className="quick-add-container">
          <div className="quick-add-wrapper">
            {/* Autocomplete dropdown */}
            <div className={`quick-add-autocomplete ${suggestions.length > 0 ? 'visible' : ''}`}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.value}`}
                  className={`autocomplete-item ${index === suggestionIndex ? 'selected' : ''} ${suggestion.type.startsWith('create-') ? 'create-new' : ''}`}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <span className="autocomplete-icon">{suggestion.icon}</span>
                  <span className="autocomplete-label">{suggestion.label}</span>
                  <span className="autocomplete-value">
                    {(suggestion.type === 'project' || suggestion.type === 'create-project') ? '@' :
                     (suggestion.type === 'category' || suggestion.type === 'create-category') ? '#' :
                     suggestion.type === 'priority' ? '!' :
                     suggestion.type === 'difficulty' ? '~' : '^'}
                    {suggestion.type.startsWith('create-') ? '' : suggestion.value}
                  </span>
                </div>
              ))}
            </div>

            <span className="quick-add-icon">✨</span>
            <input
              ref={quickAddRef}
              type="text"
              className="quick-add-input"
              placeholder="Press N to add a task..."
              value={quickAddValue}
              onChange={(e) => {
                setQuickAddValue(e.target.value);
                updateSuggestions(e.target.value, e.target.selectionStart || 0);
              }}
              onKeyDown={(e) => {
                // Handle suggestions navigation
                if (suggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSuggestionIndex(i => Math.min(i + 1, suggestions.length - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSuggestionIndex(i => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    selectSuggestion(suggestions[suggestionIndex]);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSuggestions([]);
                    setActiveToken(null);
                    return;
                  }
                }

                // Normal input handling
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  openTaskModal();
                  quickAddRef.current?.blur();
                }
                if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleQuickAdd();
                }
                if (e.key === 'Escape') {
                  setQuickAddValue('');
                  setSuggestions([]);
                  quickAddRef.current?.blur();
                }
              }}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => {
                  setSuggestions([]);
                  setActiveToken(null);
                }, 150);
              }}
            />
          </div>
          <div className="quick-add-hints">
            <div className="quick-add-hint-group"><span className="kbd">↵</span> add</div>
            <div className="quick-add-hint-group"><span className="kbd">⌘↵</span> modal</div>
            <span className="hint-divider">|</span>
            <div className="quick-add-hint-group"><span className="kbd">@</span> project</div>
            <div className="quick-add-hint-group"><span className="kbd">#</span> category</div>
            <div className="quick-add-hint-group"><span className="kbd">!</span> priority</div>
            <div className="quick-add-hint-group"><span className="kbd">~</span> difficulty</div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="mobile-nav">
          <button
            className={`mobile-nav-btn ${store.currentView === 'inbox' ? 'active' : ''}`}
            onClick={() => store.setView('inbox')}
          >
            <span className="mobile-nav-icon">📥</span>
            Inbox
          </button>
          <button
            className={`mobile-nav-btn ${store.currentView === 'today' ? 'active' : ''}`}
            onClick={() => store.setView('today')}
          >
            <span className="mobile-nav-icon">📅</span>
            Today
          </button>
          {/* Center Add Button */}
          <button
            className="mobile-nav-add"
            onClick={() => openTaskModal()}
            aria-label="Add task"
          >
            +
          </button>
          <button
            className={`mobile-nav-btn ${store.currentView === 'completed' ? 'active' : ''}`}
            onClick={() => store.setView('completed')}
          >
            <span className="mobile-nav-icon">✅</span>
            Done
          </button>
          <button
            className="mobile-nav-btn"
            onClick={() => setShowStatsModal(true)}
          >
            <span className="mobile-nav-icon">📊</span>
            Stats
          </button>
        </nav>

      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? 'Edit Task' : 'Add Task'}</h2>
              <button className="modal-close" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Add details..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                  >
                    <option value="">None</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tier (XP Multiplier)</label>
                  <select
                    className="form-select"
                    value={taskForm.tier}
                    onChange={(e) => setTaskForm({ ...taskForm, tier: e.target.value as any })}
                  >
                    <option value="tier3">Quick (1x XP)</option>
                    <option value="tier2">Standard (2x XP)</option>
                    <option value="tier1">Major (3x XP)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-select"
                    value={taskForm.difficulty}
                    onChange={(e) => setTaskForm({ ...taskForm, difficulty: e.target.value as any })}
                  >
                    <option value="easy">Easy (1x)</option>
                    <option value="medium">Medium (1.5x)</option>
                    <option value="hard">Hard (2x)</option>
                    <option value="epic">Epic (3x)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Project</label>
                  <select
                    className="form-select"
                    value={taskForm.project_id}
                    onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {store.projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={taskForm.category_id}
                    onChange={(e) => setTaskForm({ ...taskForm, category_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {store.categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="xp-preview">
                <div>Estimated XP</div>
                <div className="xp-preview-value">
                  +{calculateXPPreview(
                    {
                      tier: taskForm.tier,
                      difficulty: taskForm.difficulty,
                      due_date: taskForm.due_date || null
                    },
                    store.profile.current_streak
                  )} XP
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveTask}>
                {editingTask ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button className="modal-close" onClick={() => setShowProjectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Project name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="What's this project about?"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowProjectModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveProject}>
                {editingProject ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Category name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <input
                  type="color"
                  className="form-input"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  style={{ height: 44, padding: 4 }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveCategory}>
                {editingCategory ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="modal-title">Stats & Achievements</h2>
              <button className="modal-close" onClick={() => setShowStatsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{store.profile.total_tasks_completed}</div>
                  <div className="stat-label">Tasks Completed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{store.profile.longest_streak}</div>
                  <div className="stat-label">Longest Streak</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{store.profile.current_streak}</div>
                  <div className="stat-label">Current Streak</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {store.daily_stats.slice(0, 7).reduce((sum, s) => sum + s.xp_earned, 0)}
                  </div>
                  <div className="stat-label">Week XP</div>
                </div>
              </div>

              {/* Streak Badges */}
              <h3 style={{ marginBottom: 12, marginTop: 20 }}>Active Streaks</h3>
              <div className="streak-badges">
                {[
                  { key: 'daily', icon: '🔥', label: 'Daily', streak: store.profile.streaks?.daily },
                  { key: 'inbox_zero', icon: '📥', label: 'Inbox Zero', streak: store.profile.streaks?.inbox_zero },
                  { key: 'early_bird', icon: '🌅', label: 'Early Bird', streak: store.profile.streaks?.early_bird },
                  { key: 'night_owl', icon: '🦉', label: 'Night Owl', streak: store.profile.streaks?.night_owl },
                ].map(({ key, icon, label, streak }) => (
                  <div
                    key={key}
                    className={`streak-badge ${streak?.current && streak.current > 0 ? 'active' : 'inactive'}`}
                  >
                    <span className="streak-badge-icon">{icon}</span>
                    <div className="streak-badge-info">
                      <span className="streak-badge-label">{label}</span>
                      <span className="streak-badge-value">
                        {streak?.current || 0} days
                        {streak?.longest && streak.longest > 0 && (
                          <span className="streak-badge-best"> (best: {streak.longest})</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <h3 style={{ marginBottom: 12, marginTop: 20 }}>
                Achievements ({store.profile.achievements.length}/{ACHIEVEMENTS.length})
              </h3>
              <div className="achievement-list">
                {ACHIEVEMENTS.map((a) => {
                  const unlocked = store.profile.achievements.includes(a.id);
                  return (
                    <div key={a.id} className={`achievement-item ${unlocked ? '' : 'locked'}`}>
                      <div className="achievement-icon">{unlocked ? '🏆' : '🔒'}</div>
                      <div className="achievement-info">
                        <div className="achievement-name">{a.name}</div>
                        <div className="achievement-desc">{a.description}</div>
                      </div>
                      <div className="achievement-xp">+{a.xp} XP</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="command-palette" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette-content" onClick={(e) => e.stopPropagation()}>
            <input
              ref={commandInputRef}
              type="text"
              className="command-palette-input"
              placeholder="Type a command..."
              value={commandQuery}
              onChange={(e) => {
                setCommandQuery(e.target.value);
                setCommandIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setCommandIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setCommandIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredCommands[commandIndex]) {
                    executeCommand(filteredCommands[commandIndex]);
                  }
                } else if (e.key === 'Escape') {
                  setShowCommandPalette(false);
                }
              }}
              autoFocus
            />
            <div className="command-palette-list">
              {filteredCommands.map((cmd, i) => (
                <div
                  key={cmd.id}
                  className={`command-item ${i === commandIndex ? 'selected' : ''}`}
                  onClick={() => executeCommand(cmd)}
                >
                  <span className="command-item-icon">{cmd.icon}</span>
                  <span className="command-item-title">{cmd.title}</span>
                  {cmd.shortcut && <span className="command-item-shortcut">{cmd.shortcut}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="modal-overlay" onClick={() => setShowShortcutsModal(false)}>
          <div className="modal shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Keyboard Shortcuts</h2>
              <button className="modal-close" onClick={() => setShowShortcutsModal(false)}>×</button>
            </div>
            <div className="shortcuts-content">
              <div className="shortcuts-section">
                <h3 className="shortcuts-section-title">Navigation</h3>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">1</span> or <span className="kbd">I</span></span><span>Inbox</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">2</span> or <span className="kbd">T</span></span><span>Today</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">3</span> or <span className="kbd">U</span></span><span>Upcoming</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">4</span></span><span>Completed</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">5</span></span><span>Stats</span></div>
              </div>
              <div className="shortcuts-section">
                <h3 className="shortcuts-section-title">Task Actions</h3>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">J</span> / <span className="kbd">↓</span></span><span>Select next task</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">K</span> / <span className="kbd">↑</span></span><span>Select previous task</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">Space</span></span><span>Toggle complete</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">E</span></span><span>Edit task</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">⌫</span></span><span>Delete task</span></div>
              </div>
              <div className="shortcuts-section">
                <h3 className="shortcuts-section-title">Create</h3>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">N</span></span><span>Quick add task</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">A</span></span><span>Full task modal</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">P</span></span><span>New project</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">C</span></span><span>New category</span></div>
              </div>
              <div className="shortcuts-section">
                <h3 className="shortcuts-section-title">General</h3>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">⌘</span><span className="kbd">K</span></span><span>Command palette</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">⌘</span><span className="kbd">↵</span></span><span>Save (in modal)</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">Esc</span></span><span>Close / Cancel</span></div>
                <div className="shortcut-row"><span className="shortcut-keys"><span className="kbd">?</span></span><span>Show this help</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-modal">
            <button className="tutorial-skip" onClick={skipTutorial}>Skip</button>

            <div className="tutorial-icon">{tutorialSteps[tutorialStep].icon}</div>
            <h2 className="tutorial-title">{tutorialSteps[tutorialStep].title}</h2>
            <div className="tutorial-content">
              {tutorialSteps[tutorialStep].content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            <div className="tutorial-progress">
              {tutorialSteps.map((_, i) => (
                <div
                  key={i}
                  className={`tutorial-dot ${i === tutorialStep ? 'active' : ''} ${i < tutorialStep ? 'completed' : ''}`}
                />
              ))}
            </div>

            <div className="tutorial-actions">
              {tutorialStep > 0 && (
                <button className="tutorial-btn secondary" onClick={handleTutorialPrev}>
                  ← Back
                </button>
              )}
              <button className="tutorial-btn primary" onClick={handleTutorialNext}>
                {tutorialStep === tutorialSteps.length - 1 ? "Let's Go!" : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {store.toastMessage && (
        <div className="toast-container">
          <div className={`toast ${store.toastType}`}>{store.toastMessage}</div>
        </div>
      )}
    </>
  );
}

// NavItem component
function NavItem({
  icon,
  label,
  count,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-item-icon">{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && <span className="nav-item-count">{count}</span>}
    </div>
  );
}
