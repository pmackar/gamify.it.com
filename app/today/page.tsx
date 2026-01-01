'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTodayStore } from '@/lib/today/store';
import { Task, Project, Category, ViewType } from '@/lib/today/types';
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

export default function TodayPage() {
  const store = useTodayStore();
  const [mounted, setMounted] = useState(false);
  const { setTheme: setNavBarTheme } = useNavBar();

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

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

  useEffect(() => {
    setMounted(true);
    store.loadState();
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

  // Theme effect - sync with navbar
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', store.theme);
      setNavBarTheme(store.theme);
    }
  }, [mounted, store.theme, setNavBarTheme]);

  // Reset navbar theme on unmount
  useEffect(() => {
    return () => setNavBarTheme('dark');
  }, [setNavBarTheme]);

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

    if (/\btoday\b/i.test(text)) {
      date = new Date(now);
      date.setHours(23, 59, 0, 0);
      remaining = text.replace(/\btoday\b/i, '').trim();
    } else if (/\btomorrow\b/i.test(text) || /\btmr\b/i.test(text)) {
      date = new Date(now);
      date.setDate(date.getDate() + 1);
      date.setHours(23, 59, 0, 0);
      remaining = text.replace(/\b(tomorrow|tmr)\b/i, '').trim();
    } else if (/\bnext\s*week\b/i.test(text)) {
      date = new Date(now);
      date.setDate(date.getDate() + 7);
      date.setHours(23, 59, 0, 0);
      remaining = text.replace(/\bnext\s*week\b/i, '').trim();
    }

    remaining = remaining.replace(/\s+/g, ' ').trim();
    return { date: date ? date.toISOString() : null, remaining };
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
    { id: 'stats', title: 'View Stats', icon: '📊', shortcut: '5', category: 'Navigation', action: () => setShowStatsModal(true) },
    { id: 'new-task', title: 'Quick Add Task', icon: '✨', shortcut: 'N', category: 'Create', action: () => quickAddRef.current?.focus() },
    { id: 'full-task', title: 'Full Task Modal', icon: '➕', shortcut: 'A', category: 'Create', action: () => openTaskModal() },
    { id: 'new-project', title: 'New Project', icon: '📁', shortcut: 'P', category: 'Create', action: () => openProjectModal() },
    { id: 'new-category', title: 'New Category', icon: '🏷️', shortcut: 'C', category: 'Create', action: () => openCategoryModal() },
    { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: '⌨️', shortcut: '?', category: 'Help', action: () => setShowShortcutsModal(true) },
    { id: 'theme-light', title: 'Light Theme', icon: '☀️', category: 'Theme', action: () => store.setTheme('light') },
    { id: 'theme-dark', title: 'Dark Theme', icon: '🌙', category: 'Theme', action: () => store.setTheme('dark') }
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
          --bg-primary: #ffffff;
          --bg-secondary: #fafafa;
          --bg-tertiary: #f3f4f6;
          --bg-dark: #1a1a1a;
          --text-primary: #111827;
          --text-secondary: #4b5563;
          --text-tertiary: #9ca3af;
          --border: #e8e8e8;
          --accent: #f97316;
          --accent-light: #fed7aa;
          --accent-hover: #ea580c;
          --success: #22c55e;
          --warning: #f59e0b;
          --danger: #ef4444;
        }

        [data-theme="dark"] {
          --bg-primary: #1a1a1a;
          --bg-secondary: #242424;
          --bg-tertiary: #333333;
          --text-primary: #f9fafb;
          --text-secondary: #d1d5db;
          --text-tertiary: #888888;
          --border: #333333;
        }

        [data-theme="terminal"] {
          --bg-primary: #0a0a0a;
          --bg-secondary: #111111;
          --bg-tertiary: #1a1a1a;
          --text-primary: #00ff00;
          --text-secondary: #00cc00;
          --text-tertiary: #008800;
          --border: #003300;
          --accent: #00ff00;
          --accent-light: #003300;
        }

        .today-app {
          display: flex;
          min-height: 100vh;
          padding-top: 66px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        @media (max-width: 768px) {
          .today-app {
            padding-top: 56px;
          }
        }

        .today-sidebar {
          width: 260px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .today-sidebar {
            display: none;
          }
        }

        .sidebar-header {
          padding: 16px;
        }

        .character-card {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
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
          border-radius: 50%;
          background: linear-gradient(135deg, #e8e8e8, #d4d4d4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          position: relative;
          border: 2px solid var(--border);
        }

        .level-badge {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--accent);
          color: white;
          font-size: 9px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-primary);
        }

        .character-info {
          flex: 1;
        }

        .character-rank {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--accent);
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
          color: var(--accent);
        }

        .xp-bar {
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
        }

        .xp-bar-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .theme-pills {
          display: flex;
          gap: 4px;
          margin-bottom: 12px;
          background: var(--bg-tertiary);
          padding: 4px;
          border-radius: 8px;
        }

        .theme-pill {
          flex: 1;
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 500;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .theme-pill:hover {
          color: var(--text-primary);
        }

        .theme-pill.active {
          background: var(--bg-primary);
          color: var(--text-primary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        [data-theme="terminal"] .theme-pill.active {
          color: var(--accent);
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

        .sidebar-nav {
          flex: 1;
          padding: 16px;
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
          background: var(--accent-light);
          color: var(--accent);
        }

        [data-theme="dark"] .nav-item.active,
        [data-theme="terminal"] .nav-item.active {
          background: rgba(249, 115, 22, 0.15);
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

        .main-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-title {
          font-size: 24px;
          font-weight: 700;
        }

        .header-subtitle {
          font-size: 14px;
          color: var(--text-tertiary);
        }

        .header-actions {
          display: flex;
          gap: 8px;
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
          padding: 16px 24px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-tertiary);
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .task-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
          transition: all 0.15s ease;
        }

        .task-card:last-child {
          border-bottom: none;
        }

        .task-card:hover {
          background: var(--bg-tertiary);
          margin: 0 -16px;
          padding: 14px 16px;
          border-radius: 8px;
          border-bottom-color: transparent;
        }

        .task-card.completed {
          opacity: 0.5;
        }

        .task-card.keyboard-selected {
          background: var(--accent-light);
          margin: 0 -16px;
          padding: 14px 16px;
          border-radius: 8px;
          border-bottom-color: transparent;
        }

        [data-theme="dark"] .task-card.keyboard-selected,
        [data-theme="terminal"] .task-card.keyboard-selected {
          background: rgba(249, 115, 22, 0.1);
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

        /* Floating quick add */
        .floating-quick-add {
          position: fixed;
          bottom: 0;
          left: 260px;
          right: 0;
          z-index: 100;
          padding: 0 24px 24px;
          pointer-events: none;
        }

        .floating-quick-add::before {
          content: '';
          position: absolute;
          top: -60px;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(to bottom,
            transparent 0%,
            var(--bg-primary) 100%
          );
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .floating-quick-add {
            display: none;
          }
        }

        .floating-quick-add-inner {
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: auto;
          background: var(--bg-primary);
          padding: 14px 20px;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        [data-theme="dark"] .floating-quick-add-inner,
        [data-theme="terminal"] .floating-quick-add-inner {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .floating-quick-add-icon {
          color: var(--accent);
          font-size: 16px;
          opacity: 0.7;
        }

        .floating-quick-add-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          padding: 2px 0;
        }

        .floating-quick-add-input::placeholder {
          color: var(--text-tertiary);
        }

        .task-delete-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 14px;
          opacity: 0.5;
          transition: opacity 0.15s ease;
        }

        .task-delete-btn:hover {
          opacity: 1;
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
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          background: var(--bg-primary);
          color: var(--text-primary);
          outline: none;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          border-color: var(--accent);
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

        .mobile-panel.active {
          transform: translateY(0);
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
      `}</style>

      <div className="today-app">
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

              <div className="theme-pills">
                <button
                  className={`theme-pill ${store.theme === 'light' ? 'active' : ''}`}
                  onClick={() => store.setTheme('light')}
                >
                  ☀️ Light
                </button>
                <button
                  className={`theme-pill ${store.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => store.setTheme('dark')}
                >
                  🌙 Dark
                </button>
                <button
                  className={`theme-pill ${store.theme === 'terminal' ? 'active' : ''}`}
                  onClick={() => store.setTheme('terminal')}
                >
                  💻 Term
                </button>
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
          <header className="main-header">
            <div>
              <h1 className="header-title">{viewInfo.title}</h1>
              <p className="header-subtitle">{viewInfo.subtitle}</p>
            </div>
            <div className="header-actions">
              <button className="btn btn-ghost" onClick={() => setShowStatsModal(true)}>
                📊 Stats
              </button>
              <button className="btn btn-primary" onClick={() => openTaskModal()}>
                + Add Task
              </button>
            </div>
          </header>

          <div className="task-list">
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  {store.currentView === 'completed' ? '🎉' : '📋'}
                </div>
                <p>
                  {store.currentView === 'completed'
                    ? 'No completed tasks yet'
                    : 'No tasks here. Add one to get started!'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const project = store.projects.find((p) => p.id === task.project_id);
                const dueInfo = formatDueDate(task.due_date);
                const xpPreview = calculateXPPreview(task, store.profile.current_streak);
                const tierInfo = TIERS[task.tier];
                const isSelected = index === selectedTaskIndex;

                return (
                  <div
                    key={task.id}
                    ref={isSelected ? (el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) : undefined}
                    className={`task-card ${task.is_completed ? 'completed' : ''} ${
                      task.priority ? `priority-${task.priority.toLowerCase()}` : ''
                    } ${isSelected ? 'keyboard-selected' : ''}`}
                  >
                    <div
                      className={`task-checkbox ${task.is_completed ? 'checked' : ''}`}
                      onClick={() => handleToggleComplete(task.id)}
                    >
                      {task.is_completed && '✓'}
                    </div>
                    <div className="task-content" onClick={() => openTaskModal(task)}>
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        {project && <span>📁 {project.name}</span>}
                        {dueInfo && (
                          <span className={`task-due ${dueInfo.class}`}>📅 {dueInfo.text}</span>
                        )}
                        <span className={`tier-badge ${task.tier}`}>{tierInfo.name}</span>
                        {!task.is_completed && (
                          <span className="task-xp">+{xpPreview} XP</span>
                        )}
                        {task.is_completed && task.xp_earned > 0 && (
                          <span className="task-xp">Earned {task.xp_earned} XP</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="task-delete-btn"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Floating Quick Add (desktop only) */}
          <div className="floating-quick-add">
            <div className="floating-quick-add-inner">
              <span className="floating-quick-add-icon">✨</span>
              <input
                ref={quickAddRef}
                type="text"
                className="floating-quick-add-input"
                placeholder="Press N to add a task..."
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={(e) => {
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
                    quickAddRef.current?.blur();
                  }
                }}
              />
            </div>
          </div>
        </main>

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
          <button className="mobile-nav-btn" onClick={() => openTaskModal()}>
            <span className="mobile-nav-icon">➕</span>
            Add
          </button>
          <button
            className={`mobile-nav-btn ${mobilePanel === 'projects' ? 'active' : ''}`}
            onClick={() => setMobilePanel(mobilePanel === 'projects' ? null : 'projects')}
          >
            <span className="mobile-nav-icon">📁</span>
            Projects
          </button>
          <button
            className={`mobile-nav-btn ${mobilePanel === 'profile' ? 'active' : ''}`}
            onClick={() => setMobilePanel(mobilePanel === 'profile' ? null : 'profile')}
          >
            <span className="mobile-nav-icon">👤</span>
            Profile
          </button>
        </nav>

        {/* Mobile Panel Overlay */}
        <div
          className={`mobile-panel-overlay ${mobilePanel ? 'active' : ''}`}
          onClick={() => setMobilePanel(null)}
        />

        {/* Mobile Projects Panel */}
        <div className={`mobile-panel ${mobilePanel === 'projects' ? 'active' : ''}`}>
          <div className="mobile-panel-header">
            <span className="mobile-panel-title">Projects</span>
            <button className="mobile-panel-close" onClick={() => setMobilePanel(null)}>×</button>
          </div>
          {store.projects.map((project) => (
            <div
              key={project.id}
              className="mobile-panel-item"
              onClick={() => {
                store.setView(`project-${project.id}`);
                setMobilePanel(null);
              }}
            >
              📁 {project.name}
            </div>
          ))}
          <div className="mobile-panel-item" onClick={() => { openProjectModal(); setMobilePanel(null); }}>
            ➕ New Project
          </div>
        </div>

        {/* Mobile Profile Panel */}
        <div className={`mobile-panel ${mobilePanel === 'profile' ? 'active' : ''}`}>
          <div className="mobile-panel-header">
            <span className="mobile-panel-title">Profile</span>
            <button className="mobile-panel-close" onClick={() => setMobilePanel(null)}>×</button>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48 }}>{rankInfo.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
              Level {store.profile.level}
            </div>
            <div style={{ color: 'var(--text-tertiary)' }}>{rankInfo.rank}</div>
            <div className="xp-bar" style={{ margin: '16px 0' }}>
              <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
              {store.profile.xp} / {store.profile.xp_to_next} XP
            </div>
          </div>
          <div className="mobile-panel-item" onClick={() => { setShowStatsModal(true); setMobilePanel(null); }}>
            📊 View Stats & Achievements
          </div>
          <div className="mobile-panel-item" onClick={() => { store.setView('completed'); setMobilePanel(null); }}>
            ✅ Completed Tasks
          </div>
          <div
            className="mobile-panel-item"
            onClick={() => store.setTheme(store.theme === 'light' ? 'dark' : 'light')}
          >
            {store.theme === 'light' ? '🌙' : '☀️'} {store.theme === 'light' ? 'Dark' : 'Light'} Mode
          </div>
        </div>
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

              <h3 style={{ marginBottom: 12 }}>
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
