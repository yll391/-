/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Book, 
  Users, 
  Settings, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Save, 
  Layout, 
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  Search,
  History,
  Zap,
  Sliders,
  GitBranch,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Clock,
  Maximize2,
  Minimize2,
  RefreshCw,
  BookOpen,
  Download,
  ShieldCheck,
  Pin,
  Undo2,
  Redo2,
  Copy,
  Send,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { exportToTxt, exportToPdf } from './utils/exportUtils';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  NovelProject, 
  WorldSetting, 
  Character, 
  WritingRule, 
  Chapter, 
  ContentType,
  PlotLine,
  PlotEvent
} from './types';
import { 
  generateNovelContent, 
  expandChapterContent,
  summarizeChapter, 
  checkConsistency, 
  generateInspiration,
  generateWorldSetting,
  generateCharacter,
  generateWritingRule,
  optimizePrompt,
  planNextChapter,
  extractCharactersFromChapter,
  generateGlobalRecap,
  sendChatToAI
} from './services/geminiService';

const WORLD_SETTING_CATEGORIES = [
  '世界观概览',
  '地理环境',
  '历史背景',
  '力量体系',
  '社会结构',
  '种族文明',
  '科技水平',
  '风土人情',
  '其他'
];

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STORAGE_KEY = 'musewriter_project';
const PROJECTS_STORAGE_KEY = 'musewriter_projects_v2';
const ACTIVE_PROJECT_ID_KEY = 'musewriter_active_id_v2';

const INITIAL_PROJECT: NovelProject = {
  id: '1',
  title: '我的史诗小说',
  worldSettings: [
    { id: 'ws1', title: '世界观概览', content: '一个魔法由记忆驱动的世界。', category: '世界观概览', order: 1 }
  ],
  characters: [
    { id: 'c1', name: '艾拉', description: '一位失去了自己过去的年轻记忆编织者。', traits: ['坚定', '忧郁', '天赋异禀'] }
  ],
  writingRules: [
    { id: 'r1', name: '以小见大', rule: '专注于感官细节和行动，而不是直接的情感陈述。', isActive: true },
    { id: 'r2', name: '节奏控制', rule: '在动作场景中保持句子简短。', isActive: true }
  ],
  chapters: [
    { id: 'ch1', title: '最初的记忆', content: '艾拉站在低语悬崖的边缘...', summary: '艾拉访问了悬崖并发现了一段被遗忘的记忆。', order: 1, isExpanded: true }
  ],
  plotLines: [
    { id: 'pl1', title: '主线剧情', color: '#141414' },
    { id: 'pl2', title: '艾拉的过去', color: '#F27D26' }
  ],
  plotEvents: [
    { id: 'pe1', title: '悬崖边的发现', description: '艾拉在悬崖边发现了一枚古老的徽章。', chapterId: 'ch1', plotLineId: 'pl1', order: 1 }
  ],
  storyRecap: '',
  aiConfig: {
    temperature: 0.7,
    model: 'gemini-3-flash-preview'
  }
};

// --- Utils ---
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("App Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-10 text-center">
          <h1 className="text-2xl font-bold mb-4">软件遇到一点小状况</h1>
          <p className="text-slate-600 mb-6">别担心，你的创作数据已自动保存。点击下方按钮即可恢复。</p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold">一键恢复软件</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SortableChapterItem = ({ chapter, project, onToggle, onAddEvent, onUpdateChapter, onUpdateEvent, onDeleteEvent, setActiveId, setActiveTab, deleteItem, setIsRightSidebarOpen }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const chapterEvents = project.plotEvents
    .filter((e: PlotEvent) => e.chapterId === chapter.id)
    .sort((a: PlotEvent, b: PlotEvent) => a.order - b.order);

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <div className="flex items-center gap-3 bg-white border border-brand-100 rounded-xl p-4 shadow-sm group">
        <button {...attributes} {...listeners} className="text-brand-200 hover:text-brand-400 cursor-grab active:cursor-grabbing">
          <GripVertical size={18} />
        </button>
        <button onClick={() => onToggle(chapter.id)} className="text-brand-400 hover:text-brand-900">
          {chapter.isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <div className="flex-1">
          <input 
            type="text" 
            value={chapter.title}
            onChange={(e) => onUpdateChapter(chapter.id, { title: e.target.value })}
            className="w-full bg-transparent border-none focus:ring-0 font-bold text-brand-900 p-0"
            placeholder="章节标题..."
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setActiveId(chapter.id);
              setActiveTab(ContentType.CHAPTER);
            }}
            className="p-1.5 hover:bg-black hover:text-white rounded-lg text-brand-400 transition-all"
            title="编辑章节"
          >
            <FileText size={16} />
          </button>
          <button 
            onClick={() => deleteItem(ContentType.CHAPTER, chapter.id)}
            className="p-1.5 hover:bg-red-600 hover:text-white rounded-lg text-brand-400 transition-all"
            title="删除章节"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => onAddEvent(chapter.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 bg-black text-white rounded-lg hover:bg-brand-800 transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
          >
            <Plus size={12} /> 添加事件
          </button>
        </div>
      </div>

      <AnimatePresence>
        {chapter.isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-12 mt-2 space-y-2 overflow-hidden"
          >
            {chapterEvents.map((event: PlotEvent) => (
              <div key={event.id} className="flex gap-3 bg-brand-50/50 border border-brand-100/50 rounded-xl p-3 group/event">
                <div className="w-1 bg-brand-200 rounded-full" />
                <div className="flex-1 space-y-1">
                  <input 
                    type="text" 
                    value={event.title}
                    onChange={(e) => onUpdateEvent(event.id, { title: e.target.value })}
                    className="w-full bg-transparent border-none focus:ring-0 font-medium text-sm text-brand-800 p-0"
                    placeholder="事件标题..."
                  />
                  <textarea 
                    value={event.description}
                    onChange={(e) => onUpdateEvent(event.id, { description: e.target.value })}
                    className="w-full bg-brand-50/30 border border-transparent focus:border-brand-200 focus:bg-white rounded-lg p-2 text-xs text-brand-600 focus:ring-0 resize-none transition-all"
                    placeholder="事件描述..."
                    rows={3}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => onDeleteEvent(event.id)}
                    className="opacity-0 group-hover/event:opacity-100 p-1.5 text-brand-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="删除事件"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            <div className="bg-brand-900/5 border border-dashed border-brand-900/20 rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-900 flex items-center gap-2">
                  <FileText size={12} /> 章节大纲 / 核心情节 (扩写依据)
                </span>
                <button 
                  onClick={() => {
                    setActiveId(chapter.id);
                    setActiveTab(ContentType.CHAPTER);
                    setIsRightSidebarOpen(true);
                  }}
                  className="text-[10px] font-bold text-brand-600 hover:text-brand-900 flex items-center gap-1"
                >
                  去编辑 <ChevronRight size={10} />
                </button>
              </div>
              <textarea 
                value={chapter.draft || ''}
                onChange={(e) => onUpdateChapter(chapter.id, { draft: e.target.value })}
                className="w-full bg-white/50 border border-brand-100 rounded-lg p-3 text-xs text-brand-700 focus:ring-0 focus:border-brand-300 resize-none min-h-[100px]"
                placeholder="在这里写下本章的整体大纲，AI 扩写时将以此为准..."
              />
            </div>

            {chapterEvents.length === 0 && (
              <div className="py-4 text-center border border-dashed border-brand-100 rounded-xl">
                <p className="text-xs text-brand-300">暂无具体情节事件</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [projects, setProjects] = useState<NovelProject[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(PROJECTS_STORAGE_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: NovelProject) => ({
            ...INITIAL_PROJECT,
            ...p,
            aiConfig: p.aiConfig || INITIAL_PROJECT.aiConfig
          }));
        }
      }
      // Migration
      const oldSaved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (oldSaved) {
        const oldProject = JSON.parse(oldSaved);
        return [{
          ...INITIAL_PROJECT,
          ...oldProject,
          aiConfig: oldProject.aiConfig || INITIAL_PROJECT.aiConfig
        }];
      }
    } catch (e) {
      console.error('LocalStorage access failed during init', e);
    }
    return [INITIAL_PROJECT];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PROJECT_ID_KEY) : null;
      if (savedId && projects.some(p => p.id === savedId)) return savedId;
    } catch (e) {
      console.error('LocalStorage access failed during active ID init', e);
    }
    return projects[0]?.id || INITIAL_PROJECT.id;
  });

  const project = projects.find(p => p.id === activeProjectId) || projects[0] || INITIAL_PROJECT;

  const setProject = (updater: NovelProject | ((prev: NovelProject) => NovelProject)) => {
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return typeof updater === 'function' ? updater(p) : updater;
      }
      return p;
    }));
  };
  
  const [activeTab, setActiveTab] = useState<ContentType>(ContentType.CHAPTER);
  const [activeId, setActiveId] = useState<string>(project.chapters[0]?.id || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewContent, setReviewContent] = useState('');
  const [showInspirationModal, setShowInspirationModal] = useState(false);
  const [inspirationContent, setInspirationContent] = useState('');
  const [isSidebarSettingsOpen, setIsSidebarSettingsOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString());
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [pendingAiContent, setPendingAiContent] = useState('');
  const [isAiWriting, setIsAiWriting] = useState(false);
  const [displayedPendingContent, setDisplayedPendingContent] = useState('');
  const [aiThought, setAiThought] = useState('');

  // --- AI Chat Sidebar States & Helpers ---
  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    thought?: string;
    timestamp: string;
    isGenerating?: boolean;
    type?: 'continuation' | 'general' | 'outline' | 'consistent' | 'idea';
  }

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `你好！我是你的小说 AI 创作助手。🧠✨\n\n你可以和我探讨大纲、设计人物卡、定制世界设定，或者对我说：\n- *“帮我继续写下一段，看主角如何应对强敌”*\n- *“帮我起几个修仙流世界观的地理环境词汇”*\n- *“帮我润色当前的内容，加重心理活动的起伏描写”* \n\n点击 AI 会话下方的 **【追加到当前章节】** 按钮，就能一键将桥段拼接到你的正文里！`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [collapsedThoughts, setCollapsedThoughts] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRightSidebarOpen && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatMessages, isRightSidebarOpen]);

  const activeChapter = project.chapters.find(c => c.id === activeId);
  const activeWorldSetting = project.worldSettings.find(s => s.id === activeId);
  const activeCharacter = project.characters.find(c => c.id === activeId);
  const activeWritingRule = project.writingRules.find(r => r.id === activeId);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // --- Undo/Redo Logic ---
  const [history, setHistory] = useState<NovelProject[][]>([projects]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setHistory(prev => {
        const currentProjects = projects;
        const lastInHistory = prev[historyIndex];
        
        if (JSON.stringify(lastInHistory) === JSON.stringify(currentProjects)) {
          return prev;
        }

        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(currentProjects);
        
        if (newHistory.length > 50) {
          newHistory.shift();
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        }
        
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [projects, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      isInternalUpdate.current = true;
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setProjects(history[prevIndex]);
      showStatus('已撤回', 'info');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isInternalUpdate.current = true;
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setProjects(history[nextIndex]);
      showStatus('已重做', 'info');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      setLastSaved(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, activeProjectId);
    } catch (e) {
      console.error('Failed to save active project ID to localStorage', e);
    }
  }, [activeProjectId]);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const getWordCount = (text: string) => {
    if (!text) return 0;
    // Count Chinese characters + English words
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/) || []).filter(w => w.length > 0).length;
    return chineseChars + englishWords;
  };

  // --- Actions ---

  const handleInspiration = async (type: 'plot' | 'character' | 'world') => {
    setIsGenerating(true);
    try {
      const result = await generateInspiration(project, type);
      setInspirationContent(result || '未能生成灵感。');
      setShowInspirationModal(true);
      showStatus('灵感已迸发！', 'success');
    } catch (error) {
      console.error(error);
      showStatus('获取灵感失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: generateId(),
      title: '新章节',
      content: '',
      summary: '',
      order: project.chapters.length + 1
    };
    setProject(prev => ({ ...prev, chapters: [...prev.chapters, newChapter] }));
    setActiveId(newChapter.id);
    setActiveTab(ContentType.CHAPTER);
  };

  const moveChapter = (id: string, direction: 'up' | 'down') => {
    setProject(prev => {
      const chapters = [...prev.chapters].sort((a, b) => a.order - b.order);
      const index = chapters.findIndex(c => c.id === id);
      
      if (direction === 'up' && index > 0) {
        const currentChapter = chapters[index];
        const otherChapter = chapters[index - 1];
        const newChapters = prev.chapters.map(c => {
          if (c.id === id) return { ...c, order: otherChapter.order };
          if (c.id === otherChapter.id) return { ...c, order: currentChapter.order };
          return c;
        });
        return { ...prev, chapters: newChapters };
      } else if (direction === 'down' && index < chapters.length - 1) {
        const currentChapter = chapters[index];
        const otherChapter = chapters[index + 1];
        const newChapters = prev.chapters.map(c => {
          if (c.id === id) return { ...c, order: otherChapter.order };
          if (c.id === otherChapter.id) return { ...c, order: currentChapter.order };
          return c;
        });
        return { ...prev, chapters: newChapters };
      }
      return prev;
    });
  };

  const addWorldSetting = () => {
    const newSetting: WorldSetting = {
      id: generateId(),
      title: '新设定',
      content: '',
      category: '其他',
      order: project.worldSettings.length > 0 ? Math.max(...project.worldSettings.map(s => s.order)) + 1 : 1
    };
    setProject(prev => ({ ...prev, worldSettings: [...prev.worldSettings, newSetting] }));
    setActiveId(newSetting.id);
    setActiveTab(ContentType.WORLD_SETTING);
  };

  const moveWorldSetting = (id: string, direction: 'up' | 'down') => {
    setProject(prev => {
      const currentSetting = prev.worldSettings.find(s => s.id === id);
      if (!currentSetting) return prev;

      const category = currentSetting.category || '其他';
      const settingsInCategory = prev.worldSettings
        .filter(s => (s.category || '其他') === category)
        .sort((a, b) => a.order - b.order);
      
      const index = settingsInCategory.findIndex(s => s.id === id);
      
      if (direction === 'up' && index > 0) {
        const otherSetting = settingsInCategory[index - 1];
        const newSettings = prev.worldSettings.map(s => {
          if (s.id === id) return { ...s, order: otherSetting.order };
          if (s.id === otherSetting.id) return { ...s, order: currentSetting.order };
          return s;
        });
        return { ...prev, worldSettings: newSettings };
      } else if (direction === 'down' && index < settingsInCategory.length - 1) {
        const otherSetting = settingsInCategory[index + 1];
        const newSettings = prev.worldSettings.map(s => {
          if (s.id === id) return { ...s, order: otherSetting.order };
          if (s.id === otherSetting.id) return { ...s, order: currentSetting.order };
          return s;
        });
        return { ...prev, worldSettings: newSettings };
      }
      
      return prev;
    });
  };

  const addCharacter = () => {
    const newChar: Character = {
      id: generateId(),
      name: '新角色',
      description: '',
      traits: []
    };
    setProject(prev => ({ ...prev, characters: [...prev.characters, newChar] }));
    setActiveId(newChar.id);
    setActiveTab(ContentType.CHARACTER);
  };

  const addWritingRule = () => {
    const newRule: WritingRule = {
      id: generateId(),
      name: '新规则',
      rule: '',
      isActive: true
    };
    setProject(prev => ({ ...prev, writingRules: [...prev.writingRules, newRule] }));
    setActiveId(newRule.id);
    setActiveTab(ContentType.WRITING_RULE);
  };

  const deleteItem = (type: ContentType, id: string) => {
    if (!confirm('确定要删除吗？此操作不可撤销。')) return;
    setProject(prev => {
      const newProject = { ...prev };
      switch (type) {
        case ContentType.CHAPTER:
          newProject.chapters = prev.chapters.filter(c => c.id !== id);
          break;
        case ContentType.WORLD_SETTING:
          newProject.worldSettings = prev.worldSettings.filter(s => s.id !== id);
          break;
        case ContentType.CHARACTER:
          newProject.characters = prev.characters.filter(c => c.id !== id);
          break;
        case ContentType.WRITING_RULE:
          newProject.writingRules = prev.writingRules.filter(r => r.id !== id);
          break;
      }
      return newProject;
    });
    if (activeId === id) setActiveId('');
  };

  const updateChapter = (id: string, updates: Partial<Chapter>) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const updateWorldSetting = (id: string, updates: Partial<WorldSetting>) => {
    setProject(prev => ({
      ...prev,
      worldSettings: prev.worldSettings.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setProject(prev => ({
      ...prev,
      characters: prev.characters.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const updateWritingRule = (id: string, updates: Partial<WritingRule>) => {
    setProject(prev => ({
      ...prev,
      writingRules: prev.writingRules.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  };

  const handleExtractCharacters = async () => {
    if (!activeId || activeTab !== ContentType.CHAPTER || !activeChapter?.content) {
      showStatus('请先在章节中输入内容。', 'info');
      return;
    }
    
    setIsGenerating(true);
    try {
      const extracted = await extractCharactersFromChapter(project, activeChapter.content);
      if (extracted && extracted.length > 0) {
        setProject(prev => {
          const newCharacters = [...prev.characters];
          extracted.forEach((ext: any) => {
            const existingIndex = newCharacters.findIndex(c => c.name === ext.name);
            if (existingIndex !== -1) {
              const existing = { ...newCharacters[existingIndex] };
              if (existing.description.length < 50) {
                existing.description = ext.description;
              }
              existing.traits = Array.from(new Set([...existing.traits, ...ext.traits]));
              newCharacters[existingIndex] = existing;
            } else {
              newCharacters.push({
                id: generateId(),
                name: ext.name,
                description: ext.description,
                traits: ext.traits
              });
            }
          });
          return { ...prev, characters: newCharacters };
        });
        showStatus(`成功从本章提取并同步了 ${extracted.length} 位角色！`, 'success');
      } else {
        showStatus('未能在本章中识别到新角色。', 'info');
      }
    } catch (error) {
      console.error(error);
      showStatus('角色提取失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiPlanNextChapter = async () => {
    if (!activeId || activeTab !== ContentType.CHAPTER) return;
    
    setIsGenerating(true);
    try {
      const plan = await planNextChapter(project, activeId);
      if (!plan) {
        showStatus('AI 规划失败，请重试。', 'error');
        return;
      }

      const { nextChapterTitle, nextChapterSummary, newCharacters } = plan;

      // 1. Create new characters if any
      const createdCharIds: string[] = [];
      if (newCharacters && newCharacters.length > 0) {
        const newChars: Character[] = newCharacters.map((c: any) => ({
          id: generateId(),
          name: c.name,
          description: c.description,
          traits: []
        }));
        setProject(prev => ({
          ...prev,
          characters: [...prev.characters, ...newChars]
        }));
        createdCharIds.push(...newChars.map(c => c.id));
        showStatus(`已自动创建 ${newChars.length} 个新角色！`, 'success');
      }

      // 2. Create new chapter
      const newChapter: Chapter = {
        id: generateId(),
        title: nextChapterTitle || '新章节',
        summary: nextChapterSummary || '',
        content: '',
        order: project.chapters.length + 1,
        linkedContextIds: createdCharIds
      };

      setProject(prev => ({
        ...prev,
        chapters: [...prev.chapters, newChapter]
      }));

      setActiveId(newChapter.id);
      setActiveTab(ContentType.CHAPTER);
      showStatus(`已自动创建并跳转至新章节：${newChapter.title}`, 'success');

      // 3. Automatically start generating content for the new chapter
      const updatedProject = {
        ...project,
        chapters: [...project.chapters, newChapter],
        characters: [...project.characters, ...(newCharacters?.map((c: any) => ({
          id: generateId(), // This is a bit risky because IDs won't match the ones in setProject above, but for the prompt it's fine
          name: c.name,
          description: c.description,
          traits: []
        })) || [])]
      };

      const result = await generateNovelContent(updatedProject, newChapter.id, "请开始创作这一章节。");
      if (result) {
        setProject(prev => ({
          ...prev,
          chapters: prev.chapters.map(c => c.id === newChapter.id ? { ...c, content: result } : c)
        }));
        showStatus('新章节内容生成成功！', 'success');
      }

    } catch (error) {
      console.error(error);
      showStatus('AI 规划过程中发生错误。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (pendingAiContent && isAiWriting) {
      let i = 0;
      setDisplayedPendingContent('');
      const speed = pendingAiContent.length > 500 ? 2 : 10;
      const interval = setInterval(() => {
        const step = pendingAiContent.length > 1000 ? 5 : 1;
        i += step;
        setDisplayedPendingContent(pendingAiContent.slice(0, i));
        if (i >= pendingAiContent.length) {
          clearInterval(interval);
          setIsAiWriting(false);
        }
      }, speed);
      return () => clearInterval(interval);
    }
  }, [pendingAiContent, isAiWriting]);

  const handleAiExpandChapter = async () => {
    if (!activeId || activeTab !== ContentType.CHAPTER || !activeChapter?.draft) return;
    
    setIsGenerating(true);
    setPendingAiContent('');
    setDisplayedPendingContent('');
    setAiThought('');
    try {
      const result = await expandChapterContent(project, activeId, activeChapter.draft);
      if (result && typeof result === 'string') {
        const thoughtMatch = result.match(/<thought>([\s\S]*?)<\/thought>/);
        const thought = thoughtMatch ? thoughtMatch[1].trim() : '';
        const content = result.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
        
        setAiThought(thought);
        setPendingAiContent(content);
        setIsAiWriting(true);
        showStatus('AI 已生成内容，请在待写入区查看。', 'info');
      } else {
        showStatus('AI 返回内容异常，请重试。', 'error');
      }
    } catch (error) {
      console.error("AI Expand Error:", error);
      showStatus('扩写失败，请检查网络或 API 密钥。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendChatMessage = async (presetPrompt?: string) => {
    const textToSend = presetPrompt || aiPrompt;
    if (!textToSend.trim() || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!presetPrompt) setAiPrompt('');

    setIsGenerating(true);

    const tempAssistantId = `ai-${Date.now()}`;
    const placeholderMsg: ChatMessage = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isGenerating: true
    };
    setChatMessages(prev => [...prev, placeholderMsg]);

    try {
      const simplifiedHistory = chatMessages
        .concat(userMsg)
        .filter(m => !m.isGenerating && m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const result = await sendChatToAI(project, simplifiedHistory, textToSend.trim(), activeId || undefined);

      if (result && typeof result === 'string') {
        const thoughtMatch = result.match(/<thought>([\s\S]*?)<\/thought>/);
        const thought = thoughtMatch ? thoughtMatch[1].trim() : '';
        const content = result.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();

        setChatMessages(prev => prev.map(m => {
          if (m.id === tempAssistantId) {
            return {
              ...m,
              content,
              thought,
              isGenerating: false
            };
          }
          return m;
        }));
      } else {
        throw new Error('Empty AI response');
      }
    } catch (error) {
      console.error("AI Chat Error:", error);
      showStatus('AI 响应失败，请检查网络或 API 密钥。', 'error');
      setChatMessages(prev => prev.filter(m => m.id !== tempAssistantId));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!activeId || activeTab !== ContentType.CHAPTER) return;
    
    setIsGenerating(true);
    setPendingAiContent('');
    setDisplayedPendingContent('');
    setAiThought('');
    try {
      const result = await generateNovelContent(project, activeId, aiPrompt || "请自然地继续故事。");
      if (result && typeof result === 'string') {
        const thoughtMatch = result.match(/<thought>([\s\S]*?)<\/thought>/);
        const thought = thoughtMatch ? thoughtMatch[1].trim() : '';
        const content = result.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();

        setAiThought(thought);
        setPendingAiContent(content);
        setIsAiWriting(true);
        setAiPrompt('');
        showStatus('AI 已生成内容，请在待写入区查看。', 'info');
      } else {
        showStatus('AI 返回内容异常，请重试。', 'error');
      }
    } catch (error) {
      console.error("AI Generate Error:", error);
      showStatus('生成失败，请检查网络或 API 密钥。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAiContent = () => {
    if (!activeId || !pendingAiContent) return;
    const currentChapter = project.chapters.find(c => c.id === activeId);
    if (currentChapter) {
      const newContent = (currentChapter.content || '') + (currentChapter.content ? '\n\n' : '') + pendingAiContent;
      updateChapter(activeId, { content: newContent });
      setPendingAiContent('');
      setDisplayedPendingContent('');
      setAiThought('');
      showStatus('内容已填入章节。', 'success');
    }
  };

  const handleDiscardAiContent = () => {
    setPendingAiContent('');
    setDisplayedPendingContent('');
    setAiThought('');
    showStatus('已丢弃 AI 生成内容。', 'info');
  };

  const handleSummarize = async () => {
    if (!activeId || activeTab !== ContentType.CHAPTER) return;
    const currentChapter = project.chapters.find(c => c.id === activeId);
    if (!currentChapter?.content) return;

    setIsGenerating(true);
    try {
      const summary = await summarizeChapter(currentChapter.content, project.aiConfig.model);
      if (summary) {
        updateChapter(activeId, { summary });
        showStatus('摘要已更新！', 'success');
        
        // Ask if user wants to update global recap
        if (confirm('是否根据新的章节摘要自动更新全局前情提要？')) {
          handleGenerateGlobalRecap();
        }
      }
    } catch (error) {
      console.error(error);
      showStatus('摘要生成失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateGlobalRecap = async () => {
    setIsGenerating(true);
    try {
      const recap = await generateGlobalRecap(project);
      if (recap) {
        setProject(prev => ({ ...prev, storyRecap: recap }));
        showStatus('全局前情提要已更新！', 'success');
      }
    } catch (error) {
      console.error(error);
      showStatus('生成全局提要失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckConsistency = async () => {
    setIsGenerating(true);
    try {
      const result = await checkConsistency(project);
      if (result) {
        setReviewContent(result);
        setShowReviewModal(true);
        showStatus('一致性检查完成！', 'success');
      }
    } catch (error) {
      console.error(error);
      showStatus('检查失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWorldSetting = async () => {
    if (!activeId || activeTab !== ContentType.WORLD_SETTING) return;
    const setting = project.worldSettings.find(s => s.id === activeId);
    if (!setting) return;

    setIsGenerating(true);
    try {
      const result = await generateWorldSetting(project, setting.title, setting.content, setting.category);
      if (result) {
        updateWorldSetting(activeId, { content: (setting.content ? setting.content + '\n\n' : '') + result });
        showStatus('设定已补全！', 'success');
      }
    } catch (error) {
      console.error(error);
      showStatus('设定补全失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCharacter = async () => {
    if (!activeId || activeTab !== ContentType.CHARACTER) return;
    const char = project.characters.find(c => c.id === activeId);
    if (!char) return;

    setIsGenerating(true);
    try {
      const result = await generateCharacter(project, char.name, char.description);
      if (result) {
        updateCharacter(activeId, { description: (char.description ? char.description + '\n\n' : '') + result });
        showStatus('人物档案已补全！', 'success');
      }
    } catch (error) {
      console.error(error);
      showStatus('人物补全失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWritingRule = async () => {
    if (!activeId || activeTab !== ContentType.WRITING_RULE) return;
    const rule = project.writingRules.find(r => r.id === activeId);
    if (!rule) return;

    setIsGenerating(true);
    try {
      const result = await generateWritingRule(project, rule.name, rule.rule);
      if (result) {
        updateWritingRule(activeId, { rule: (rule.rule ? rule.rule + '\n\n' : '') + result });
        showStatus('写作规则已补全！', 'success');
      }
    } catch (error) {
      console.error(error);
      showStatus('规则补全失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimizePrompt = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const optimized = await optimizePrompt(aiPrompt, project.aiConfig.model);
      if (optimized) {
        setAiPrompt(optimized);
        showStatus('提示词已优化！', 'success');
      }
    } catch (error) {
      console.error(error);
      showStatus('优化失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConsistencyCheck = async () => {
    setIsGenerating(true);
    try {
      const report = await checkConsistency(project);
      setReviewContent(report || '未能生成报告。');
      setShowReviewModal(true);
      showStatus('连贯性检查完成！', 'success');
    } catch (error) {
      console.error(error);
      showStatus('检查失败。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualSave = () => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, activeProjectId);
      setLastSaved(new Date().toLocaleTimeString());
      showStatus('已手动保存', 'success');
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
      showStatus('保存失败', 'error');
    }
  };

  const createNewProject = () => {
    const newProject: NovelProject = {
      ...INITIAL_PROJECT,
      id: generateId(),
      title: '未命名作品',
      chapters: [{ ...INITIAL_PROJECT.chapters[0], id: generateId(), title: '第一章', content: '', summary: '' }],
      worldSettings: [],
      characters: [],
      writingRules: [],
      plotEvents: [],
      storyRecap: ''
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setActiveId(newProject.chapters[0].id);
    setActiveTab(ContentType.CHAPTER);
    setShowLibrary(false);
    showStatus('新作品已创建', 'success');
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      showStatus('至少需要保留一部作品', 'error');
      return;
    }
    if (!confirm('确定要删除这部作品吗？所有章节和设定都将丢失。')) return;
    
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (activeProjectId === id) {
      const nextProject = newProjects[0];
      setActiveProjectId(nextProject.id);
      setActiveId(nextProject.chapters[0]?.id || '');
      setActiveTab(ContentType.CHAPTER);
    }
    showStatus('作品已删除', 'success');
  };

  const switchProject = (id: string) => {
    setActiveProjectId(id);
    const targetProject = projects.find(p => p.id === id);
    if (targetProject) {
      setActiveId(targetProject.chapters[0]?.id || '');
      setActiveTab(ContentType.CHAPTER);
    }
    setShowLibrary(false);
  };

  const autoLinkContext = () => {
    if (activeTab !== ContentType.CHAPTER || !activeChapter) return;
    
    const content = activeChapter.content + " " + activeChapter.title;
    const newLinkedIds = new Set<string>(activeChapter.linkedContextIds || []);
    
    // Simple keyword matching
    project.worldSettings.forEach(s => {
      if (content.includes(s.title)) newLinkedIds.add(s.id);
    });
    
    project.characters.forEach(c => {
      if (content.includes(c.name)) newLinkedIds.add(c.id);
    });
    
    if (newLinkedIds.size > (activeChapter.linkedContextIds?.length || 0)) {
      updateChapter(activeChapter.id, { linkedContextIds: Array.from(newLinkedIds) });
      showStatus('已自动关联发现的设定与角色！', 'success');
    } else {
      showStatus('未发现更多可关联的内容。', 'info');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProject((prev) => {
        const oldIndex = prev.chapters.findIndex((c) => c.id === active.id);
        const newIndex = prev.chapters.findIndex((c) => c.id === over.id);
        const newChapters = arrayMove(prev.chapters, oldIndex, newIndex);
        // Update orders
        return {
          ...prev,
          chapters: newChapters.map((c, i) => ({ ...c, order: i + 1 })),
        };
      });
    }
  };

  const addPlotEvent = (chapterId: string) => {
    const newEvent: PlotEvent = {
      id: generateId(),
      title: '新事件',
      description: '',
      chapterId,
      order: project.plotEvents.filter(e => e.chapterId === chapterId).length + 1
    };
    setProject(prev => ({ ...prev, plotEvents: [...prev.plotEvents, newEvent] }));
  };

  const toggleChapterExpand = (id: string) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => c.id === id ? { ...c, isExpanded: !c.isExpanded } : c)
    }));
  };

  const togglePinChapter = (id: string) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => c.id === id ? { ...c, isPinnedForContext: !c.isPinnedForContext } : c)
    }));
  };

  // --- Render Helpers ---

  const renderSidebarItem = (id: string, label: string, type: ContentType, icon: React.ReactNode, onMoveUp?: () => void, onMoveDown?: () => void, isPinned?: boolean, onTogglePin?: () => void) => (
    <div 
      key={id}
      className={cn(
        "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
        activeId === id && activeTab === type 
          ? "bg-black text-white shadow-md" 
          : "text-brand-600 hover:bg-brand-100",
        isPinned && activeId !== id && "border-l-2 border-black"
      )}
      onClick={() => {
        setActiveId(id);
        setActiveTab(type);
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={cn(
          "p-1 rounded-md transition-colors",
          activeId === id && activeTab === type ? "text-white" : "text-brand-400 group-hover:text-black"
        )}>
          {icon}
        </div>
        <span className="truncate text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {onTogglePin && (
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }} 
            className={cn(
              "p-1 rounded-md transition-colors",
              isPinned ? "text-white bg-white/20" : "hover:text-black hover:bg-black/10"
            )}
            title={isPinned ? "取消固定上下文" : "固定为关键上下文"}
          >
            <Pin size={10} className={isPinned ? "fill-current" : ""} />
          </button>
        )}
        {onMoveUp && (
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:text-black hover:bg-black/10 rounded-md" title="上移">
            <ArrowUp size={10} />
          </button>
        )}
        {onMoveDown && (
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:text-black hover:bg-black/10 rounded-md" title="下移">
            <ArrowDown size={10} />
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(type, id);
          }}
          className="p-1 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );

  const updatePlotEvent = (id: string, updates: Partial<PlotEvent>) => {
    setProject(prev => ({
      ...prev,
      plotEvents: prev.plotEvents.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const deletePlotEvent = (id: string) => {
    if (!confirm('确定要删除此事件吗？')) return;
    setProject(prev => ({
      ...prev,
      plotEvents: prev.plotEvents.filter(e => e.id !== id)
    }));
  };

  const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);

  const renderOutlineView = () => (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold text-brand-900">大纲视图</h2>
            <p className="text-brand-500 mt-1">通过拖拽重新排序章节，管理情节线和主要事件。</p>
          </div>
          <button 
            onClick={addChapter}
            className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 transition-colors"
          >
            <Plus size={16} /> 新增章节
          </button>
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={sortedChapters.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedChapters.map(chapter => (
              <SortableChapterItem 
                key={chapter.id} 
                chapter={chapter} 
                project={project}
                onToggle={toggleChapterExpand}
                onAddEvent={addPlotEvent}
                onUpdateChapter={updateChapter}
                onUpdateEvent={updatePlotEvent}
                onDeleteEvent={deletePlotEvent}
                setActiveId={setActiveId}
                setActiveTab={setActiveTab}
                deleteItem={deleteItem}
                setIsRightSidebarOpen={setIsRightSidebarOpen}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
  );

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-50 text-brand-900 p-10 text-center">
        <div>
          <h1 className="text-2xl font-serif mb-4">应用启动遇到一点小问题</h1>
          <p className="text-brand-500">别担心，这通常是浏览器缓存或存储限制引起的。请尝试刷新页面。</p>
          <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-brand-900 text-white rounded-xl">刷新页面</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden selection:bg-black selection:text-white relative font-sans text-black">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen && !isFocusMode ? 280 : 0, 
          opacity: isSidebarOpen && !isFocusMode ? 1 : 0,
        }}
        className="border-r border-brand-200 bg-brand-50 flex flex-col overflow-hidden z-30"
      >
        <div className="p-6 border-b border-brand-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-xl shadow-black/20">
                <Sparkles size={20} />
              </div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic">MUSE WRITER</h1>
            </div>
            <button 
              onClick={() => setShowLibrary(!showLibrary)}
              className={cn(
                "p-2 rounded-xl transition-all",
                showLibrary ? "bg-black text-white" : "text-brand-400 hover:bg-brand-200 hover:text-black"
              )}
            >
              <Book size={18} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {showLibrary ? (
              <motion.div 
                key="library"
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -10 }}
                className="overflow-hidden space-y-3 mb-2"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-400">我的书架</span>
                  <button onClick={createNewProject} className="p-1 text-brand-500 hover:text-black hover:bg-brand-200 rounded-lg transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                  {projects.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => switchProject(p.id)}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all duration-200",
                        activeProjectId === p.id 
                          ? "bg-white text-brand-900 font-semibold shadow-sm border border-brand-200/50" 
                          : "text-brand-500 hover:bg-white/50 hover:text-brand-700"
                      )}
                    >
                      <span className="truncate">{p.title}</span>
                      {projects.length > 1 && (
                        <button 
                          onClick={(e) => deleteProject(p.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="h-[1px] bg-brand-200/50 my-2" />
              </motion.div>
            ) : (
              <motion.div
                key="title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <input 
                  type="text" 
                  value={project.title}
                  onChange={(e) => setProject(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-transparent border-none focus:ring-0 font-serif text-lg p-0 text-brand-900 placeholder:text-brand-300"
                  placeholder="未命名小说..."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
          {/* Outline */}
          <div className="px-2">
            <div 
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 group",
                activeTab === ContentType.OUTLINE 
                  ? "bg-brand-900 text-white shadow-lg shadow-brand-900/20" 
                  : "text-brand-500 hover:bg-white hover:text-brand-900 hover:shadow-sm"
              )}
              onClick={() => setActiveTab(ContentType.OUTLINE)}
            >
              <GitBranch size={18} className={activeTab === ContentType.OUTLINE ? "text-white" : "text-brand-400 group-hover:text-brand-900"} />
              <span className="text-sm font-bold uppercase tracking-widest">大纲视图</span>
            </div>
          </div>

          {/* Chapters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <FileText size={14} /> 章节目录
              </h3>
              <button onClick={addChapter} className="p-1.5 hover:bg-black hover:text-white rounded-lg text-brand-400 transition-all">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1 px-2">
              {project.chapters.sort((a, b) => a.order - b.order).map((c, idx, arr) => 
                renderSidebarItem(
                  c.id, 
                  `第${c.order}章: ${c.title}`, 
                  ContentType.CHAPTER, 
                  <FileText size={16} />,
                  idx > 0 ? () => moveChapter(c.id, 'up') : undefined,
                  idx < arr.length - 1 ? () => moveChapter(c.id, 'down') : undefined,
                  c.isPinnedForContext,
                  () => togglePinChapter(c.id)
                )
              )}
            </div>
          </div>

          {/* Story Recap */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <BookOpen size={14} /> 剧情提要
              </h3>
            </div>
            <div className="space-y-1 px-2">
              {renderSidebarItem('story-recap', '前情回顾', ContentType.STORY_RECAP, <BookOpen size={16} />)}
            </div>
          </div>

          {/* World Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <Layout size={14} /> 世界设定
              </h3>
              <button onClick={addWorldSetting} className="p-1.5 hover:bg-black hover:text-white rounded-lg text-brand-400 transition-all">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-3 px-2">
              {WORLD_SETTING_CATEGORIES.map(category => {
                const settingsInCategory = project.worldSettings
                  .filter(s => (s.category || '其他') === category)
                  .sort((a, b) => a.order - b.order);
                if (settingsInCategory.length === 0) return null;
                return (
                  <div key={category} className="space-y-1">
                    <div className="px-2 py-0.5 text-[8px] font-bold text-brand-300 uppercase tracking-widest border-l border-brand-200 ml-2 mb-1">{category}</div>
                    {settingsInCategory.map((s, idx, arr) => 
                      renderSidebarItem(
                        s.id, 
                        s.title, 
                        ContentType.WORLD_SETTING, 
                        <Layout size={16} />,
                        idx > 0 ? () => moveWorldSetting(s.id, 'up') : undefined,
                        idx < arr.length - 1 ? () => moveWorldSetting(s.id, 'down') : undefined
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Characters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <Users size={14} /> 人物档案
              </h3>
              <button onClick={addCharacter} className="p-1.5 hover:bg-black hover:text-white rounded-lg text-brand-400 transition-all">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1 px-2">
              {project.characters.map(c => 
                renderSidebarItem(c.id, c.name, ContentType.CHARACTER, <Users size={16} />)
              )}
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <Settings size={14} /> 写作规则
              </h3>
              <button onClick={addWritingRule} className="p-1.5 hover:bg-black hover:text-white rounded-lg text-brand-400 transition-all">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1 px-2">
              {project.writingRules.map(r => 
                renderSidebarItem(r.id, r.name, ContentType.WRITING_RULE, <Settings size={16} />)
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-brand-200/60 space-y-4 bg-brand-100/20">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-brand-200/50 p-4 space-y-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
                  <Zap size={12} className="text-brand-900" /> AI 核心引擎
                </span>
              </div>
              <div className="relative group/select">
                <select 
                  value={project.aiConfig.model}
                  onChange={(e) => setProject(prev => ({ ...prev, aiConfig: { ...prev.aiConfig, model: e.target.value } }))}
                  className="w-full bg-white/80 border border-brand-200/50 rounded-xl text-[11px] font-bold text-brand-700 py-2.5 px-3 focus:ring-2 focus:ring-brand-900/5 outline-none transition-all appearance-none cursor-pointer pr-8"
                >
                  <optgroup label="Google Gemini">
                    <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (免费/极速)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash (免费/均衡)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (稳定)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (强大/推理)</option>
                  </optgroup>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 pointer-events-none group-hover/select:text-brand-900 transition-colors" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-1">
                  <Sliders size={10} /> 创造力指数
                </span>
                <span className="text-[10px] font-mono font-bold text-brand-900">{project.aiConfig.temperature.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1" 
                value={project.aiConfig.temperature}
                onChange={(e) => setProject(prev => ({ ...prev, aiConfig: { ...prev.aiConfig, temperature: parseFloat(e.target.value) } }))}
                className="w-full h-1 bg-brand-200 rounded-lg appearance-none cursor-pointer accent-brand-900"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setShowInspirationModal(true)}
              className="btn-primary flex items-center justify-center gap-2 py-3 text-[11px]"
            >
              <Zap size={12} />
              灵感迸发
            </button>
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
                  <Download size={12} className="text-black" /> 导出作品
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => exportToTxt(project)}
                  className="flex items-center justify-center gap-2 bg-white border border-brand-200 rounded-xl text-[9px] font-bold text-brand-700 py-2 hover:bg-black hover:text-white hover:border-black transition-all shadow-sm"
                  title="导出为纯文本文件"
                >
                  TXT
                </button>
                <button 
                  onClick={() => exportToPdf(project)}
                  className="flex items-center justify-center gap-2 bg-white border border-brand-200 rounded-xl text-[9px] font-bold text-brand-700 py-2 hover:bg-black hover:text-white hover:border-black transition-all shadow-sm"
                  title="导出为 PDF (可能不支持部分中文字体)"
                >
                  PDF
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 bg-white border border-brand-200 rounded-xl text-[9px] font-bold text-brand-700 py-2 hover:bg-black hover:text-white hover:border-black transition-all shadow-sm"
                  title="使用浏览器打印功能保存为 PDF"
                >
                  打印
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col relative bg-brand-50 overflow-hidden">
        {/* Top Bar */}
        <AnimatePresence>
          {!isFocusMode && (
            <motion.header 
              initial={{ y: -64 }}
              animate={{ y: 0 }}
              exit={{ y: -64 }}
              className="h-16 border-b border-brand-200/60 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md sticky top-0 z-20"
            >
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 text-brand-400 hover:text-brand-900 hover:bg-brand-100 rounded-xl transition-all"
                >
                  <Menu size={20} />
                </button>
                <div className="flex items-center gap-2 text-sm font-medium text-brand-400">
                  <span className="hover:text-brand-900 cursor-pointer transition-colors" onClick={() => setActiveTab(ContentType.OUTLINE)}>{project.title}</span>
                  <ChevronRight size={14} />
                  <span className="text-brand-900 font-serif italic">
                    {activeTab === ContentType.OUTLINE && "大纲视图"}
                    {activeTab === ContentType.STORY_RECAP && "前情回顾"}
                    {activeTab === ContentType.CHAPTER && activeChapter?.title}
                    {activeTab === ContentType.WORLD_SETTING && activeWorldSetting?.title}
                    {activeTab === ContentType.CHARACTER && activeCharacter?.name}
                    {activeTab === ContentType.WRITING_RULE && activeWritingRule?.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <AnimatePresence>
                  {statusMessage && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm",
                        statusMessage.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        statusMessage.type === 'error' ? "bg-red-50 text-red-600 border border-red-100" :
                        "bg-brand-50 text-brand-600 border border-brand-100"
                      )}
                    >
                      {statusMessage.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {statusMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex items-center gap-1 bg-brand-100/50 p-1 rounded-xl border border-brand-200/50">
                  <button 
                    onClick={undo}
                    disabled={historyIndex === 0}
                    className="p-2 text-brand-400 hover:text-brand-900 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
                    title="撤回 (Ctrl+Z)"
                  >
                    <Undo2 size={16} />
                  </button>
                  <button 
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 text-brand-400 hover:text-brand-900 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
                    title="重做 (Ctrl+Y / Ctrl+Shift+Z)"
                  >
                    <Redo2 size={16} />
                  </button>
                  <div className="w-px h-4 bg-brand-200 mx-1" />
                  <button 
                    onClick={handleManualSave}
                    className="p-2 text-brand-400 hover:text-brand-900 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                    title={`手动保存 (上次保存: ${lastSaved})`}
                  >
                    <Save size={16} />
                  </button>
                  <button 
                    onClick={() => setIsFocusMode(true)}
                    className="p-2 text-brand-400 hover:text-brand-900 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                    title="专注模式"
                  >
                    <Maximize2 size={16} />
                  </button>
                  <button 
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isRightSidebarOpen 
                        ? "bg-brand-900 text-white shadow-md shadow-brand-900/20" 
                        : "text-brand-400 hover:text-brand-900 hover:bg-white hover:shadow-sm"
                    )}
                    title="AI 创作对话"
                  >
                    <Sliders size={16} />
                  </button>
                </div>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        {/* Focus Mode Toggle (Floating) */}
        {isFocusMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsFocusMode(false)}
            className="fixed top-6 right-6 z-50 p-3 bg-brand-900/10 hover:bg-brand-900 text-brand-400 hover:text-white rounded-full backdrop-blur-md transition-all group border border-brand-900/10"
            title="退出专注模式"
          >
            <Minimize2 size={20} className="group-hover:scale-110 transition-transform" />
          </motion.button>
        )}

        {/* Main Content & Right Sidebar Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className={cn(
              "mx-auto py-12 px-6",
              activeTab === ContentType.OUTLINE ? "max-w-5xl" : "max-w-3xl"
            )}>
            {activeTab === ContentType.OUTLINE ? (
              renderOutlineView()
            ) : activeTab === ContentType.STORY_RECAP ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-brand-900">前情回顾</h2>
                    <p className="text-brand-500 mt-1">提炼并记录之前的剧情，帮助 AI 更好地回忆上下文，避免出现错觉。</p>
                  </div>
                  <button 
                    onClick={handleGenerateGlobalRecap}
                    disabled={isGenerating}
                    className="btn-primary"
                  >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI 自动总结全文
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden flex flex-col h-[60vh]">
                  <div className="p-4 border-b border-brand-100 bg-brand-50/50 flex items-center gap-2 text-brand-600">
                    <BookOpen size={18} />
                    <span className="font-medium text-sm">剧情提要</span>
                  </div>
                  <textarea
                    value={project.storyRecap || ''}
                    onChange={(e) => setProject(prev => ({ ...prev, storyRecap: e.target.value }))}
                    className="flex-1 w-full p-6 bg-transparent border-none focus:ring-0 resize-none text-brand-800 leading-relaxed custom-scrollbar"
                    placeholder="在这里写下前几十章的核心剧情、重要伏笔、角色状态等。AI 在生成新章节时会参考这些内容..."
                  />
                </div>
              </div>
            ) : !activeId ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center text-brand-200">
                  <Book size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-brand-900">开启你的创作之旅</h2>
                  <p className="text-brand-500 mt-2">从侧边栏选择一个章节或设定开始写作。</p>
                </div>
                <button 
                  onClick={addChapter}
                  className="mt-4 px-6 py-2 bg-brand-900 text-white rounded-full font-medium hover:bg-brand-800 transition-all"
                >
                  创建第一章
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Chapter Editor */}
                {activeTab === ContentType.CHAPTER && activeChapter && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-10"
                  >
                    <div className="flex items-center justify-between group">
                      <input 
                        type="text"
                        value={activeChapter.title}
                        onChange={(e) => updateChapter(activeChapter.id, { title: e.target.value })}
                        className="w-full text-5xl font-serif font-bold border-none focus:ring-0 p-0 text-brand-900 placeholder:text-brand-200 bg-transparent"
                        placeholder="章节标题..."
                      />
                      <button 
                        onClick={() => deleteItem(ContentType.CHAPTER, activeChapter.id)}
                        className="p-3 text-brand-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                        title="删除章节"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>

                    <div className="bg-white/40 backdrop-blur-sm rounded-3xl border border-brand-200/50 p-8 space-y-6 shadow-sm relative overflow-hidden group/summary">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-900/10 group-hover/summary:bg-brand-900/30 transition-colors" />
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-900 flex items-center gap-2">
                          <Sparkles size={14} /> 章节摘要
                        </label>
                        <button 
                          onClick={handleSummarize}
                          disabled={isGenerating || !activeChapter.content}
                          className="text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-900 flex items-center gap-2 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        >
                          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          AI 重新生成
                        </button>
                      </div>
                      <textarea 
                        value={activeChapter.summary}
                        onChange={(e) => updateChapter(activeChapter.id, { summary: e.target.value })}
                        className="w-full bg-transparent rounded-2xl p-0 text-base text-brand-600 border-none focus:ring-0 resize-none italic leading-relaxed font-editorial"
                        rows={3}
                        placeholder="本章的简要概述..."
                      />
                    </div>

                    {/* Linked Context */}
                    <div className="bg-brand-900/5 rounded-3xl border border-brand-900/10 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-900 flex items-center gap-2">
                          <Zap size={14} /> 关联上下文 (AI 优先读取)
                        </label>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={autoLinkContext}
                            className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-black flex items-center gap-2 transition-colors"
                            title="根据内容自动关联设定与角色"
                          >
                            <Sparkles size={12} /> 自动关联
                          </button>
                          <button 
                            onClick={() => setShowContextPicker(true)}
                            className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-black flex items-center gap-2 transition-colors"
                          >
                            <Plus size={12} /> 手动关联
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {(activeChapter.linkedContextIds || []).length > 0 ? (
                          activeChapter.linkedContextIds?.map(id => {
                            const setting = project.worldSettings.find(s => s.id === id);
                            const char = project.characters.find(c => c.id === id);
                            if (!setting && !char) return null;
                            return (
                              <span key={id} className="px-4 py-1.5 bg-white border border-brand-200 text-brand-900 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                {setting ? <Layout size={12} className="text-brand-400" /> : <Users size={12} className="text-brand-400" />}
                                {setting?.title || char?.name}
                                <button 
                                  onClick={() => {
                                    const newIds = (activeChapter.linkedContextIds || []).filter(cid => cid !== id);
                                    updateChapter(activeChapter.id, { linkedContextIds: newIds });
                                  }}
                                  className="hover:text-red-600 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })
                        ) : (
                          <div className="text-[10px] text-brand-400 italic">暂无关联上下文。AI 将使用全局设定。</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-brand-200/60 pb-4">
                        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-brand-400">
                          <span className="flex items-center gap-2">
                            <FileText size={14} /> {getWordCount(activeChapter.content)} 字
                          </span>
                          <span className="flex items-center gap-2">
                            <Clock size={14} /> 约 {Math.ceil(getWordCount(activeChapter.content) / 300)} 分钟阅读
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-brand-100/50 p-1 rounded-xl">
                          <button 
                            onClick={handleExtractCharacters}
                            disabled={isGenerating || !activeChapter.content}
                            className="btn-ghost flex items-center gap-2"
                            title="从本章内容中提取人物并同步到档案"
                          >
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                            提取人物
                          </button>
                          <div className="w-[1px] h-4 bg-brand-200 mx-1" />
                          <button 
                            onClick={handleCheckConsistency}
                            disabled={isGenerating}
                            className="btn-ghost flex items-center gap-2"
                            title="检查全文一致性与连贯性"
                          >
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                            连贯性检查
                          </button>
                          <div className="w-[1px] h-4 bg-brand-200 mx-1" />
                          <button 
                            onClick={() => setIsPreviewMode(false)}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              !isPreviewMode ? "bg-black text-white shadow-md" : "text-brand-400 hover:text-black"
                            )}
                          >
                            编辑
                          </button>
                          <button 
                            onClick={() => setIsPreviewMode(true)}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              isPreviewMode ? "bg-black text-white shadow-md" : "text-brand-400 hover:text-black"
                            )}
                          >
                            预览
                          </button>
                        </div>
                      </div>
                      <div className="relative min-h-[600px] font-serif text-xl leading-relaxed text-brand-900">
                        {isPreviewMode ? (
                          <div className="markdown-body prose prose-brand max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{activeChapter.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <Editor
                            value={activeChapter.content}
                            onValueChange={code => updateChapter(activeChapter.id, { content: code })}
                            highlight={code => {
                              try {
                                if (Prism && Prism.languages && Prism.languages.markdown) {
                                  return Prism.highlight(code, Prism.languages.markdown, 'markdown');
                                }
                              } catch (e) {
                                console.error('Prism highlight error', e);
                              }
                              return code;
                            }}
                            padding={0}
                            className="w-full min-h-[600px] outline-none focus:ring-0 bg-transparent"
                            style={{
                              fontFamily: 'inherit',
                              fontSize: 'inherit',
                              lineHeight: 'inherit',
                            }}
                            placeholder="很久很久以前..."
                          />
                        )}
                      </div>
                    </div>

                    {/* AI Pending Area */}
                    <AnimatePresence>
                      {(pendingAiContent || isGenerating) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-12 space-y-6"
                        >
                          <div className="flex items-center justify-between border-b border-brand-200 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-brand-900 text-white rounded-lg flex items-center justify-center">
                                <Sparkles size={16} className={isGenerating ? "animate-pulse" : ""} />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-brand-900">AI 生成待写入区</h3>
                                <p className="text-[10px] text-brand-400 uppercase tracking-widest">
                                  {isGenerating ? "正在思考并构建内容..." : isAiWriting ? "正在可视化写入..." : "内容已就绪，请审阅"}
                                </p>
                              </div>
                            </div>
                            {!isGenerating && !isAiWriting && pendingAiContent && (
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={handleDiscardAiContent}
                                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                  丢弃
                                </button>
                                <button 
                                  onClick={handleAcceptAiContent}
                                  className="px-6 py-2 bg-brand-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-brand-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                  <CheckCircle2 size={14} />
                                  同意并填入
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="relative bg-brand-50/50 rounded-[32px] border-2 border-dashed border-brand-200 p-8 min-h-[200px] transition-all">
                            {isGenerating && !pendingAiContent ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                                <div className="flex gap-1">
                                  {[0, 1, 2].map(i => (
                                    <motion.div
                                      key={i}
                                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                      className="w-2 h-2 bg-brand-900 rounded-full"
                                    />
                                  ))}
                                </div>
                                <p className="text-xs text-brand-400 font-medium animate-pulse">AI 正在运行中...</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {isAiWriting ? (
                                  <div className="prose prose-brand max-w-none font-serif text-lg leading-relaxed text-brand-700 italic opacity-80">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                      {displayedPendingContent || "等待 AI 运行..."}
                                    </ReactMarkdown>
                                    <motion.span
                                      animate={{ opacity: [0, 1, 0] }}
                                      transition={{ repeat: Infinity, duration: 0.8 }}
                                      className="inline-block w-1 h-5 bg-brand-900 ml-1 translate-y-1"
                                    />
                                  </div>
                                ) : (
                                  <textarea
                                    value={pendingAiContent}
                                    onChange={(e) => {
                                      setPendingAiContent(e.target.value);
                                      setDisplayedPendingContent(e.target.value);
                                    }}
                                    className="w-full min-h-[300px] bg-transparent border-none focus:ring-0 text-lg font-serif leading-relaxed text-brand-800 resize-none custom-scrollbar"
                                    placeholder="AI 生成的内容将显示在这里，您可以直接修改..."
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* World Setting Editor */}
                {activeTab === ContentType.WORLD_SETTING && activeWorldSetting && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-10"
                  >
                    <div className="flex items-center justify-between group">
                      <div className="flex-1 flex items-center gap-4">
                        <input 
                          type="text"
                          value={activeWorldSetting.title}
                          onChange={(e) => updateWorldSetting(activeWorldSetting.id, { title: e.target.value })}
                          disabled={activeWorldSetting.isLocked}
                          className={cn(
                            "w-full text-5xl font-serif font-bold border-none focus:ring-0 p-0 text-brand-900 placeholder:text-brand-200 bg-transparent",
                            activeWorldSetting.isLocked && "opacity-60 cursor-not-allowed"
                          )}
                          placeholder="设定标题..."
                        />
                        {activeWorldSetting.isLocked && (
                          <span title="设定已锁定">
                            <ShieldCheck size={24} className="text-emerald-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateWorldSetting(activeWorldSetting.id, { isLocked: !activeWorldSetting.isLocked })}
                          className={cn(
                            "p-3 rounded-2xl transition-all",
                            activeWorldSetting.isLocked 
                              ? "text-emerald-500 bg-emerald-50" 
                              : "text-brand-300 hover:text-brand-900 hover:bg-brand-50"
                          )}
                          title={activeWorldSetting.isLocked ? "解锁设定" : "锁定设定 (AI 不可修改)"}
                        >
                          {activeWorldSetting.isLocked ? <ShieldCheck size={22} /> : <Pin size={22} />}
                        </button>
                        {!activeWorldSetting.isLocked && (
                          <button 
                            onClick={() => deleteItem(ContentType.WORLD_SETTING, activeWorldSetting.id)}
                            className="p-3 text-brand-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                            title="删除设定"
                          >
                            <Trash2 size={22} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b border-brand-200/60 pb-4">
                      <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-brand-400">
                        <span className="flex items-center gap-2">
                          <FileText size={14} /> {getWordCount(activeWorldSetting.content)} 字
                        </span>
                        <div className="flex items-center gap-2">
                          <Layout size={14} />
                          <select 
                            value={activeWorldSetting.category || '其他'}
                            onChange={(e) => updateWorldSetting(activeWorldSetting.id, { category: e.target.value })}
                            className="bg-transparent border-none focus:ring-0 p-0 text-[10px] font-bold uppercase tracking-widest text-brand-400 cursor-pointer hover:text-brand-900 transition-colors"
                          >
                            {WORLD_SETTING_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerateWorldSetting}
                        disabled={isGenerating || activeWorldSetting.isLocked}
                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-800 transition-all disabled:opacity-50 shadow-lg shadow-brand-900/20 relative overflow-hidden group border border-brand-700/50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        {isGenerating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} className="text-amber-300 group-hover:rotate-12 transition-transform" />
                        )}
                        <span className="relative">AI 智能补全设定</span>
                      </motion.button>
                    </div>
                    <textarea 
                      value={activeWorldSetting.content}
                      onChange={(e) => updateWorldSetting(activeWorldSetting.id, { content: e.target.value })}
                      disabled={activeWorldSetting.isLocked}
                      className={cn(
                        "w-full min-h-[500px] text-xl font-serif leading-relaxed border-none focus:ring-0 p-0 text-brand-900 placeholder:text-brand-200 bg-transparent resize-none",
                        activeWorldSetting.isLocked && "opacity-80 cursor-not-allowed"
                      )}
                      placeholder="描述你的世界、魔法体系、历史..."
                    />
                  </motion.div>
                )}

                {/* Character Editor */}
                {activeTab === ContentType.CHARACTER && activeCharacter && (
                  <div className="space-y-10">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-400">
                        <Users size={40} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 flex items-center gap-3">
                            <input 
                              type="text"
                              value={activeCharacter.name}
                              onChange={(e) => updateCharacter(activeCharacter.id, { name: e.target.value })}
                              disabled={activeCharacter.isLocked}
                              className={cn(
                                "w-full text-4xl font-serif font-bold border-none focus:ring-0 p-0 placeholder:text-brand-200",
                                activeCharacter.isLocked && "opacity-60 cursor-not-allowed"
                              )}
                              placeholder="角色姓名..."
                            />
                            {activeCharacter.isLocked && (
                              <span title="角色已锁定">
                                <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateCharacter(activeCharacter.id, { isLocked: !activeCharacter.isLocked })}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                activeCharacter.isLocked 
                                  ? "text-emerald-500 bg-emerald-50" 
                                  : "text-brand-300 hover:text-brand-900 hover:bg-brand-50"
                              )}
                              title={activeCharacter.isLocked ? "解锁角色" : "锁定角色 (AI 不可修改)"}
                            >
                              {activeCharacter.isLocked ? <ShieldCheck size={20} /> : <Pin size={20} />}
                            </button>
                            {!activeCharacter.isLocked && (
                              <button 
                                onClick={() => deleteItem(ContentType.CHARACTER, activeCharacter.id)}
                                className="p-2 text-brand-300 hover:text-red-500 transition-colors"
                                title="删除角色"
                              >
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {activeCharacter.traits.map((trait, idx) => (
                            <span key={idx} className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-medium flex items-center gap-1">
                              {trait}
                              {!activeCharacter.isLocked && (
                                <button onClick={() => {
                                  const newTraits = [...activeCharacter.traits];
                                  newTraits.splice(idx, 1);
                                  updateCharacter(activeCharacter.id, { traits: newTraits });
                                }}>
                                  <X size={10} />
                                </button>
                              )}
                            </span>
                          ))}
                          {!activeCharacter.isLocked && (
                            <button 
                              onClick={() => {
                                const trait = prompt('输入标签:');
                                if (trait) updateCharacter(activeCharacter.id, { traits: [...activeCharacter.traits, trait] });
                              }}
                              className="px-3 py-1 border border-dashed border-brand-300 text-brand-400 rounded-full text-xs font-medium hover:border-brand-500 hover:text-brand-500"
                            >
                              + 添加标签
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-brand-400">生平与细节</label>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                            {getWordCount(activeCharacter.description)} 字
                          </span>
                          <button 
                            onClick={handleGenerateCharacter}
                            disabled={isGenerating || activeCharacter.isLocked}
                            className="flex items-center gap-1 px-3 py-1 bg-brand-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-brand-800 transition-all disabled:opacity-50"
                          >
                            {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            AI 补全档案
                          </button>
                        </div>
                      </div>
                      <textarea 
                        value={activeCharacter.description}
                        onChange={(e) => updateCharacter(activeCharacter.id, { description: e.target.value })}
                        disabled={activeCharacter.isLocked}
                        className={cn(
                          "w-full min-h-[300px] text-lg leading-relaxed border-none focus:ring-0 p-0 placeholder:text-brand-200 resize-none",
                          activeCharacter.isLocked && "opacity-80 cursor-not-allowed"
                        )}
                        placeholder="这个角色是谁？他们的动机是什么？"
                      />
                    </div>
                  </div>
                )}

                {/* Writing Rule Editor */}
                {activeTab === ContentType.WRITING_RULE && activeWritingRule && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <input 
                          type="text"
                          value={activeWritingRule.name}
                          onChange={(e) => updateWritingRule(activeWritingRule.id, { name: e.target.value })}
                          className="w-full text-3xl font-serif font-bold border-none focus:ring-0 p-0 placeholder:text-brand-200"
                          placeholder="规则名称..."
                        />
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-brand-500">启用</span>
                          <button 
                            onClick={() => updateWritingRule(activeWritingRule.id, { isActive: !activeWritingRule.isActive })}
                            className={cn(
                              "w-12 h-6 rounded-full transition-colors relative",
                              activeWritingRule.isActive ? "bg-brand-900" : "bg-brand-200"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                              activeWritingRule.isActive ? "left-7" : "left-1"
                            )} />
                          </button>
                        </div>
                        <button 
                          onClick={() => deleteItem(ContentType.WRITING_RULE, activeWritingRule.id)}
                          className="p-2 text-brand-300 hover:text-red-500 transition-colors"
                          title="删除规则"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-brand-400">AI 写作规则描述</label>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                            {getWordCount(activeWritingRule.rule)} 字
                          </span>
                          <button 
                            onClick={handleGenerateWritingRule}
                            disabled={isGenerating}
                            className="flex items-center gap-1 px-3 py-1 bg-brand-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-brand-800 transition-all disabled:opacity-50"
                          >
                            {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            AI 补全规则
                          </button>
                        </div>
                      </div>
                      <textarea 
                        value={activeWritingRule.rule}
                        onChange={(e) => updateWritingRule(activeWritingRule.id, { rule: e.target.value })}
                        className="w-full min-h-[200px] text-lg leading-relaxed bg-brand-50/30 rounded-2xl p-6 border-none focus:ring-1 focus:ring-brand-200 resize-none"
                        placeholder="向 AI 解释此规则（例如：'避免使用形容词'，'总是提到天气'）..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (AI Assistant & Chat Panel) */}
        <AnimatePresence>
          {isRightSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 420, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-brand-200/50 bg-brand-50/10 flex flex-col h-full z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.02)] relative"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-brand-200/50 flex items-center justify-between bg-white backdrop-blur-sm sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2.5 text-brand-900">
                  <Brain size={18} className="text-black animate-pulse" />
                  <div>
                    <h3 className="font-bold text-sm">AI 联手创作空间</h3>
                    <p className="text-[10px] text-brand-400">大纲、设定与灵感全景对话</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (confirm("是否确认清空对话历史纪录？")) {
                        setChatMessages([
                          {
                            id: 'welcome',
                            role: 'assistant',
                            content: `对话纪录已清空。🧠\n有什么我可以帮你的？你可以随时通过下方的快捷指令让我协助，或直接对我说：“帮我接续当前这章怎么写下去”。`,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        ]);
                      }
                    }}
                    className="text-[10px] font-bold uppercase tracking-widest text-brand-400 hover:text-black transition-colors"
                  >
                    清空
                  </button>
                  <button 
                    onClick={() => setIsRightSidebarOpen(false)}
                    className="p-1.5 text-brand-400 hover:text-brand-900 hover:bg-brand-100 rounded-lg transition-all"
                    title="收回面板"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Chat & Thought History Area */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5 flex flex-col justify-start">
                
                {/* Collapsible Expansion Tool (only when on chapter view) */}
                {activeTab === ContentType.CHAPTER && activeChapter && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-100 flex flex-col gap-2.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-brand-500 flex items-center gap-1.5">
                        <Sliders size={12} className="text-black" /> 核心情节大纲扩写助理
                      </div>
                      <span className="text-[9px] text-brand-400">一键演化正文</span>
                    </div>
                    
                    <textarea
                      value={activeChapter.draft || ''}
                      onChange={(e) => updateChapter(activeChapter.id, { draft: e.target.value })}
                      placeholder="在此输入你要在这一章里发生的核心情节大纲（例如：'林平之拜入华山派，陆大有因不服气发起了一场切切磋，令狐冲在旁边喝酒围观...'）"
                      className="w-full h-16 p-3 bg-brand-50/50 border border-brand-100 rounded-xl text-xs text-brand-800 resize-none focus:ring-1 focus:ring-brand-900/10 transition-all custom-scrollbar leading-relaxed"
                    />
                    
                    <button
                      onClick={handleAiExpandChapter}
                      disabled={isGenerating || !activeChapter.draft?.trim()}
                      className="bg-black text-white hover:bg-brand-800 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                      {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                      一键扩写章节正文
                    </button>
                  </div>
                )}

                {/* Chat Messages Feed */}
                <div className="space-y-4 flex-1 flex flex-col justify-start">
                  {chatMessages.map((message) => {
                    const isUser = message.role === 'user';
                    const isCollapsed = collapsedThoughts[message.id] ?? false;

                    return (
                      <div 
                        key={message.id} 
                        className={cn(
                          "flex flex-col max-w-[90%] gap-1",
                          isUser ? "self-end items-end ml-auto" : "self-start items-start mr-auto"
                        )}
                      >
                        {/* Sender info */}
                        <div className="text-[9px] text-brand-400 px-1 flex items-center gap-1.5 label-section">
                          <span>{isUser ? '我' : 'AI 写作导师'}</span>
                          <span>•</span>
                          <span>{message.timestamp}</span>
                        </div>

                        {/* Thought process card (Gemini style) */}
                        {message.thought && (
                          <div className="w-full bg-amber-50/50 border border-amber-100/70 rounded-2xl p-3 flex flex-col gap-2 text-amber-900/95 transition-all text-xs">
                            <button
                              onClick={() => setCollapsedThoughts(prev => ({ ...prev, [message.id]: !isCollapsed }))}
                              className="flex items-center justify-between font-bold text-[9px] tracking-wider uppercase text-amber-700 w-full hover:text-amber-900 transition-colors"
                            >
                              <span className="flex items-center gap-1">
                                <Brain size={12} className="animate-pulse" />
                                {isCollapsed ? "展开 AI 深度思考构思" : "收起 AI 写作动机与策略"}
                              </span>
                              <span>{isCollapsed ? "[+]" : "[-]"}</span>
                            </button>
                            
                            {!isCollapsed && (
                              <div className="leading-relaxed whitespace-pre-line text-amber-800 border-l-2 border-amber-200/80 pl-2 mt-1 opacity-90 text-[11px] font-mono">
                                {message.thought}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message content bubble */}
                        {message.isGenerating && !message.content ? (
                          <div className="bg-brand-100/50 border border-brand-200/50 rounded-2xl px-4 py-3 min-w-[80px] flex items-center justify-center">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
                                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                  className="w-1.5 h-1.5 bg-black rounded-full"
                                />
                              ))}
                            </div>
                          </div>
                        ) : message.content ? (
                          <div 
                            className={cn(
                              "rounded-3xl px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] border text-xs leading-relaxed",
                              isUser 
                                ? "bg-black text-white border-black rounded-tr-sm" 
                                : "bg-white text-brand-800 border-brand-200/60 rounded-tl-sm whitespace-pre-wrap font-sans"
                            )}
                          >
                            {!isUser ? (
                              <div className="markdown-body prose-sm font-sans text-brand-800">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              message.content
                            )}

                            {/* Adopt Actions under AI responses inside current active chapter */}
                            {!isUser && activeTab === ContentType.CHAPTER && activeChapter && message.id !== 'welcome' && (
                              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-brand-100 shrink-0">
                                <button
                                  onClick={() => {
                                    const currentContent = activeChapter.content || '';
                                    const nextContent = currentContent + (currentContent ? '\n\n' : '') + message.content;
                                    updateChapter(activeChapter.id, { content: nextContent });
                                    showStatus('已成功将 AI 创作正文追加写入该章节末尾！', 'success');
                                  }}
                                  className="text-[10px] font-bold bg-white text-black border border-black hover:bg-black hover:text-white px-2.5 py-1 rounded-full transition-all flex items-center gap-1 shadow-sm active:scale-95 shrink-0"
                                >
                                  <Plus size={10} /> 追加到正文
                                </button>
                                <button
                                  onClick={() => {
                                    updateChapter(activeChapter.id, { draft: message.content });
                                    showStatus('已将此段灵感同步为该章的情理大纲。', 'success');
                                  }}
                                  className="text-[10px] font-bold bg-white text-brand-600 border border-brand-200 hover:border-black hover:text-black px-2.5 py-1 rounded-full transition-all flex items-center gap-1 shadow-sm shrink-0"
                                >
                                  设为大纲
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.content);
                                    showStatus('内容已复制。', 'success');
                                  }}
                                  className="text-[9px] text-brand-405 hover:text-black p-1 transition-colors ml-auto flex items-center gap-1"
                                  title="复制正文"
                                >
                                  <Copy size={11} /> 复制
                                </button>
                              </div>
                            )}

                            {!isUser && (activeTab !== ContentType.CHAPTER || !activeChapter) && message.id !== 'welcome' && (
                              <div className="flex justify-end mt-2 pt-1 border-t border-brand-100/50 shrink-0">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.content);
                                    showStatus('文本已复制到剪贴板。', 'success');
                                  }}
                                  className="text-[10px] font-bold text-brand-500 hover:text-black flex items-center gap-1.5 p-1 transition-colors"
                                >
                                  <Copy size={11} /> 复制文本
                                </button>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  
                  {/* Invisible anchor for scrolling */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Quick Prompt Bar Shortcuts */}
              <div className="px-4 py-2 bg-white border-t border-brand-100 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
                {activeTab === ContentType.CHAPTER && activeChapter && (
                  <button
                    onClick={() => handleSendChatMessage("我现在卡文了，请结合目前的情感和大纲续写约500字。紧接最新正文的最后一行段落，自然、连贯地展开下一阶情节，注重角色的台词交织。")}
                    className="text-[10px] font-medium bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full transition-all shrink-0 active:scale-95 whitespace-nowrap"
                  >
                    🪄 续写当前章
                  </button>
                )}
                <button
                  onClick={() => handleSendChatMessage("请根据当前的设定和人物卡，为我之后的故事可能发展制造3个充满张力与悬念的【剧情脑洞/逆转创意】。")}
                  className="text-[10px] font-medium bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 px-3 py-1.5 rounded-full transition-all shrink-0 active:scale-95 whitespace-nowrap"
                >
                  💡 剧情脑洞
                </button>
                <button
                  onClick={() => handleSendChatMessage("请详细审阅我的世界观、角色人设和已写完章节，诊断当前是否存在逻辑冲突、吃设定、战力崩溃或人设立场前后矛盾？请生成诊断报告。")}
                  className="text-[10px] font-medium bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-full transition-all shrink-0 active:scale-95 whitespace-nowrap"
                >
                  🔍 设定一致性诊断
                </button>
                <button
                  onClick={() => handleSendChatMessage("写一段带有极强宿命感或镜头感的重要角色出场/死亡特写描写，文笔要洗练，突出周围冷暖氛围的气氛烘托。")}
                  className="text-[10px] font-medium bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full transition-all shrink-0 active:scale-95 whitespace-nowrap"
                >
                  ⚔️ 氛围特写描写
                </button>
              </div>

              {/* Chat Input Box */}
              <div className="p-4 bg-white border-t border-brand-200/50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] shrink-0">
                <div className="relative group flex items-end gap-2 bg-brand-50/50 rounded-2xl border border-brand-200 focus-within:border-black/30 focus-within:ring-2 focus-within:ring-black/5 transition-all p-1">
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="问设定，改文笔，或命令 AI 直接码字..."
                    className="w-full bg-transparent px-3 py-3 text-xs border-none focus:outline-none focus:ring-0 resize-none min-h-[44px] max-h-24 custom-scrollbar"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (aiPrompt.trim() && !isGenerating) {
                          handleSendChatMessage();
                        }
                      }
                    }}
                  />
                  <div className="flex flex-col gap-1 pb-1 pr-1 shrink-0">
                    {aiPrompt && (
                      <button 
                        onClick={handleOptimizePrompt}
                        disabled={isGenerating}
                        className="p-1.5 text-brand-400 hover:text-black transition-colors rounded-lg hover:bg-brand-100"
                        title="魔法优化提示词"
                      >
                        <Zap size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleSendChatMessage()}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="p-2 bg-black text-white rounded-xl hover:bg-brand-800 disabled:opacity-40 transition-all flex items-center justify-center shrink-0 shadow-md"
                    >
                      {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2.5 px-0.5">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-brand-400">
                    Shift+Enter 换行 / Enter 发送
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleAiPlanNextChapter}
                      disabled={isGenerating}
                      className="text-[9px] font-bold uppercase tracking-widest text-brand-500 hover:text-brand-900 flex items-center gap-1 transition-colors"
                    >
                      <GitBranch size={10} /> 规划下一章
                    </button>
                    <button 
                      onClick={handleConsistencyCheck}
                      disabled={isGenerating}
                      className="text-[9px] font-bold uppercase tracking-widest text-brand-500 hover:text-brand-900 flex items-center gap-1 transition-colors"
                    >
                      <Search size={10} /> 全文分析
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>

      {/* Context Picker Modal */}
      <AnimatePresence>
        {showContextPicker && activeTab === ContentType.CHAPTER && activeChapter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContextPicker(false)}
              className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-brand-100 flex items-center justify-between bg-brand-50/50">
                <div className="flex items-center gap-3">
                  <Zap size={20} className="text-brand-900" />
                  <h3 className="text-lg font-serif font-bold text-brand-900">关联上下文</h3>
                </div>
                <button onClick={() => setShowContextPicker(false)} className="text-brand-400 hover:text-brand-900">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-3">世界设定</h4>
                  <div className="space-y-2">
                    {project.worldSettings.length > 0 ? project.worldSettings.map(s => {
                      const isLinked = (activeChapter.linkedContextIds || []).includes(s.id);
                      return (
                        <div 
                          key={s.id}
                          onClick={() => {
                            const currentIds = activeChapter.linkedContextIds || [];
                            const newIds = isLinked ? currentIds.filter(id => id !== s.id) : [...currentIds, s.id];
                            updateChapter(activeChapter.id, { linkedContextIds: newIds });
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                            isLinked ? "bg-brand-900 border-brand-900 text-white" : "bg-brand-50 border-transparent text-brand-700 hover:bg-brand-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Layout size={16} className={isLinked ? "text-white/70" : "text-brand-300"} />
                            <span className="text-sm font-medium">{s.title}</span>
                          </div>
                          {isLinked && <CheckCircle2 size={16} />}
                        </div>
                      );
                    }) : (
                      <div className="text-xs text-brand-300 italic p-2">暂无世界设定。</div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-3">人物角色</h4>
                  <div className="space-y-2">
                    {project.characters.length > 0 ? project.characters.map(c => {
                      const isLinked = (activeChapter.linkedContextIds || []).includes(c.id);
                      return (
                        <div 
                          key={c.id}
                          onClick={() => {
                            const currentIds = activeChapter.linkedContextIds || [];
                            const newIds = isLinked ? currentIds.filter(id => id !== c.id) : [...currentIds, c.id];
                            updateChapter(activeChapter.id, { linkedContextIds: newIds });
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                            isLinked ? "bg-brand-900 border-brand-900 text-white" : "bg-brand-50 border-transparent text-brand-700 hover:bg-brand-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Users size={16} className={isLinked ? "text-white/70" : "text-brand-300"} />
                            <span className="text-sm font-medium">{c.name}</span>
                          </div>
                          {isLinked && <CheckCircle2 size={16} />}
                        </div>
                      );
                    }) : (
                      <div className="text-xs text-brand-300 italic p-2">暂无人物角色。</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-brand-50/50 border-t border-brand-100">
                <button 
                  onClick={() => setShowContextPicker(false)}
                  className="btn-primary w-full py-4 text-xs"
                >
                  完成
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(false)}
              className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-900">
                    <History size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">AI 连贯性检查报告</h2>
                    <p className="text-xs text-brand-400">基于当前所有章节和设定生成的分析</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 hover:bg-black hover:text-white rounded-full text-brand-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{reviewContent}</ReactMarkdown>
                </div>
              </div>
              <div className="p-6 border-t border-brand-100 bg-brand-50/30 flex justify-end">
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="btn-primary px-8 py-3"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inspiration Modal */}
      <AnimatePresence>
        {showInspirationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInspirationModal(false)}
              className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-900">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">灵感迸发</h2>
                    <p className="text-xs text-brand-400">让 AI 为你的创作提供新鲜点子</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowInspirationModal(false);
                    setInspirationContent('');
                  }}
                  className="p-2 hover:bg-black hover:text-white rounded-full text-brand-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 bg-brand-50/50 border-b border-brand-100 flex gap-3">
                <button 
                  onClick={() => handleInspiration('plot')}
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-white border border-brand-200 rounded-xl text-sm font-medium hover:border-brand-900 hover:text-brand-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  剧情灵感
                </button>
                <button 
                  onClick={() => handleInspiration('character')}
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-white border border-brand-200 rounded-xl text-sm font-medium hover:border-brand-900 hover:text-brand-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  人物灵感
                </button>
                <button 
                  onClick={() => handleInspiration('world')}
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-white border border-brand-200 rounded-xl text-sm font-medium hover:border-brand-900 hover:text-brand-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  世界观灵感
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-[300px]">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4 text-brand-400">
                    <Loader2 size={40} className="animate-spin" />
                    <p className="text-sm">正在搜寻灵感中...</p>
                  </div>
                ) : inspirationContent ? (
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{inspirationContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-brand-300">
                    <Sparkles size={48} className="opacity-20" />
                    <p className="text-sm">点击上方按钮，让 AI 协助你突破瓶颈</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-brand-100 bg-brand-50/30 flex justify-end">
                <button 
                  onClick={() => {
                    setShowInspirationModal(false);
                    setInspirationContent('');
                  }}
                  className="btn-primary px-8 py-3"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Content (Hidden by default) */}
      <div className="hidden print-content">
        <h1 style={{ textAlign: 'center', fontSize: '32pt', marginBottom: '40pt' }}>{project.title}</h1>
        {[...project.chapters].sort((a, b) => a.order - b.order).map(chapter => (
          <div key={chapter.id} style={{ pageBreakAfter: 'always', marginBottom: '20pt' }}>
            <h2 style={{ fontSize: '24pt', borderBottom: '1px solid #ccc', paddingBottom: '10pt', marginBottom: '20pt' }}>
              第{chapter.order}章: {chapter.title}
            </h2>
            <div style={{ fontSize: '14pt', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
              {chapter.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
