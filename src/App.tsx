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
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markdown';
import ReactMarkdown from 'react-markdown';
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
  extractCharactersFromChapter
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

const SortableChapterItem = ({ chapter, project, onToggle, onAddEvent, onUpdateChapter, onUpdateEvent, onDeleteEvent, setActiveId, setActiveTab, deleteItem }: any) => {
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
            className="p-1.5 hover:bg-brand-50 rounded-lg text-brand-400 hover:text-brand-900 transition-all"
            title="编辑章节"
          >
            <FileText size={16} />
          </button>
          <button 
            onClick={() => deleteItem(ContentType.CHAPTER, chapter.id)}
            className="p-1.5 hover:bg-red-50 rounded-lg text-brand-400 hover:text-red-500 transition-all"
            title="删除章节"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => onAddEvent(chapter.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
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
                    className="w-full bg-transparent border-none focus:ring-0 text-xs text-brand-500 p-0 resize-none"
                    placeholder="事件描述..."
                    rows={1}
                  />
                </div>
                <button 
                  onClick={() => onDeleteEvent(event.id)}
                  className="opacity-0 group-hover/event:opacity-100 p-1 text-brand-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {chapterEvents.length === 0 && (
              <div className="py-4 text-center border border-dashed border-brand-100 rounded-xl">
                <p className="text-xs text-brand-300">暂无情节事件</p>
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
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
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

  const activeChapter = project.chapters.find(c => c.id === activeId);
  const activeWorldSetting = project.worldSettings.find(s => s.id === activeId);
  const activeCharacter = project.characters.find(c => c.id === activeId);
  const activeWritingRule = project.writingRules.find(r => r.id === activeId);

  const editorRef = useRef<HTMLTextAreaElement>(null);

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

  const handleAiExpandChapter = async () => {
    if (!activeId || activeTab !== ContentType.CHAPTER || !activeChapter?.draft) return;
    
    setIsGenerating(true);
    try {
      const result = await expandChapterContent(project, activeId, activeChapter.draft);
      if (result && typeof result === 'string') {
        const currentChapter = project.chapters.find(c => c.id === activeId);
        if (currentChapter) {
          const newContent = (currentChapter.content || '') + (currentChapter.content ? '\n\n' : '') + result;
          updateChapter(activeId, { content: newContent });
          showStatus('章节扩写成功！', 'success');
        }
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

  const handleAiGenerate = async () => {
    if (!activeId || activeTab !== ContentType.CHAPTER) return;
    
    setIsGenerating(true);
    try {
      const result = await generateNovelContent(project, activeId, aiPrompt || "请自然地继续故事。");
      if (result && typeof result === 'string') {
        const currentChapter = project.chapters.find(c => c.id === activeId);
        if (currentChapter) {
          const newContent = (currentChapter.content || '') + '\n\n' + result;
          updateChapter(activeId, { content: newContent });
          setAiPrompt('');
          showStatus('内容生成成功！', 'success');
        }
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
      }
    } catch (error) {
      console.error(error);
      showStatus('摘要生成失败。', 'error');
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

  // --- Render Helpers ---

  const renderSidebarItem = (id: string, label: string, type: ContentType, icon: React.ReactNode, onMoveUp?: () => void, onMoveDown?: () => void) => (
    <div 
      key={id}
      className={cn(
        "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300",
        activeId === id && activeTab === type 
          ? "bg-white text-brand-900 shadow-sm border border-brand-200/50" 
          : "text-brand-500 hover:bg-white/50 hover:text-brand-700"
      )}
      onClick={() => {
        setActiveId(id);
        setActiveTab(type);
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={cn(
          "p-1.5 rounded-lg transition-colors",
          activeId === id && activeTab === type ? "bg-brand-900 text-white" : "bg-brand-100 text-brand-400 group-hover:text-brand-600"
        )}>
          {icon}
        </div>
        <span className="truncate text-xs font-medium tracking-tight">{label}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
        {onMoveUp && (
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:text-brand-900 hover:bg-brand-100 rounded-md" title="上移">
            <ArrowUp size={10} />
          </button>
        )}
        {onMoveDown && (
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:text-brand-900 hover:bg-brand-100 rounded-md" title="下移">
            <ArrowDown size={10} />
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(type, id);
          }}
          className="p-1 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
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
    <div className="flex h-screen bg-slate-100 overflow-hidden selection:bg-slate-200 selection:text-slate-900 relative font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen && !isFocusMode ? 260 : 0, 
          opacity: isSidebarOpen && !isFocusMode ? 1 : 0,
        }}
        className="border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden z-30"
      >
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Sparkles size={16} />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">灵感作家</h1>
            </div>
            <button 
              onClick={() => setShowLibrary(!showLibrary)}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                showLibrary ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              )}
            >
              <Book size={16} />
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">我的书架</span>
                  <button onClick={createNewProject} className="p-1 text-brand-500 hover:text-brand-900 hover:bg-brand-200/50 rounded-lg transition-colors">
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
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
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
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <FileText size={14} /> 章节目录
              </h3>
              <button onClick={addChapter} className="p-1.5 hover:bg-white hover:shadow-sm rounded-xl text-brand-500 transition-all">
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
                  idx < arr.length - 1 ? () => moveChapter(c.id, 'down') : undefined
                )
              )}
            </div>
          </div>

          {/* Story Recap */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
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
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <Layout size={14} /> 世界设定
              </h3>
              <button onClick={addWorldSetting} className="p-1.5 hover:bg-white hover:shadow-sm rounded-xl text-brand-500 transition-all">
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
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <Users size={14} /> 人物档案
              </h3>
              <button onClick={addCharacter} className="p-1.5 hover:bg-white hover:shadow-sm rounded-xl text-brand-500 transition-all">
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
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
                <Settings size={14} /> 写作规则
              </h3>
              <button onClick={addWritingRule} className="p-1.5 hover:bg-white hover:shadow-sm rounded-xl text-brand-500 transition-all">
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
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (免费/稳定)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (强大/推理)</option>
                  </optgroup>
                  <optgroup label="Alibaba Qwen">
                    <option value="qwen-max">Qwen Max</option>
                    <option value="qwen-plus">Qwen Plus</option>
                    <option value="qwen-turbo">Qwen Turbo</option>
                  </optgroup>
                  <optgroup label="DeepSeek">
                    <option value="deepseek-chat">DeepSeek Chat</option>
                    <option value="deepseek-reasoner">DeepSeek Reasoner</option>
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
              className="flex items-center justify-center gap-2 py-2.5 bg-brand-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-brand-800 transition-all shadow-lg shadow-brand-900/10 active:scale-[0.98]"
            >
              <Zap size={12} />
              灵感迸发
            </button>
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
                  <Download size={12} className="text-brand-900" /> 导出作品
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => exportToTxt(project)}
                  className="flex items-center justify-center gap-2 bg-white/80 border border-brand-200/50 rounded-xl text-[9px] font-bold text-brand-700 py-2 hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-all shadow-sm"
                  title="导出为纯文本文件"
                >
                  TXT
                </button>
                <button 
                  onClick={() => exportToPdf(project)}
                  className="flex items-center justify-center gap-2 bg-white/80 border border-brand-200/50 rounded-xl text-[9px] font-bold text-brand-700 py-2 hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-all shadow-sm"
                  title="导出为 PDF (可能不支持部分中文字体)"
                >
                  PDF
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 bg-white/80 border border-brand-200/50 rounded-xl text-[9px] font-bold text-brand-700 py-2 hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-all shadow-sm"
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
                    title="AI 扩写面板"
                  >
                    <Sliders size={16} />
                  </button>
                  <button 
                    onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      isAiAssistantOpen 
                        ? "bg-brand-900 text-white shadow-md shadow-brand-900/20" 
                        : "text-brand-500 hover:text-brand-900 hover:bg-white hover:shadow-sm"
                    )}
                  >
                    <Sparkles size={14} />
                    助手
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
                            className="text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-900 flex items-center gap-2 transition-colors"
                            title="根据内容自动关联设定与角色"
                          >
                            <Sparkles size={12} /> 自动关联
                          </button>
                          <button 
                            onClick={() => setShowContextPicker(true)}
                            className="text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-900 flex items-center gap-2 transition-colors"
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
                                  className="hover:text-red-500 transition-colors"
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
                            className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-900 hover:bg-white transition-all flex items-center gap-2"
                            title="从本章内容中提取人物并同步到档案"
                          >
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                            提取人物
                          </button>
                          <div className="w-[1px] h-4 bg-brand-200 mx-1" />
                          <button 
                            onClick={() => setIsPreviewMode(false)}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              !isPreviewMode ? "bg-white text-brand-900 shadow-sm" : "text-brand-400 hover:text-brand-600"
                            )}
                          >
                            编辑
                          </button>
                          <button 
                            onClick={() => setIsAiAssistantOpen(true)}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              isPreviewMode ? "bg-white text-brand-900 shadow-sm" : "text-brand-400 hover:text-brand-600"
                            )}
                            onClickCapture={() => setIsPreviewMode(true)}
                          >
                            预览
                          </button>
                        </div>
                      </div>
                      <div className="relative min-h-[600px] font-serif text-xl leading-relaxed text-brand-900">
                        {isPreviewMode ? (
                          <div className="markdown-body prose prose-brand max-w-none">
                            <ReactMarkdown>{activeChapter.content}</ReactMarkdown>
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
                      <input 
                        type="text"
                        value={activeWorldSetting.title}
                        onChange={(e) => updateWorldSetting(activeWorldSetting.id, { title: e.target.value })}
                        className="w-full text-5xl font-serif font-bold border-none focus:ring-0 p-0 text-brand-900 placeholder:text-brand-200 bg-transparent"
                        placeholder="设定标题..."
                      />
                      <button 
                        onClick={() => deleteItem(ContentType.WORLD_SETTING, activeWorldSetting.id)}
                        className="p-3 text-brand-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                        title="删除设定"
                      >
                        <Trash2 size={22} />
                      </button>
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
                        disabled={isGenerating}
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
                      className="w-full min-h-[500px] text-xl font-serif leading-relaxed border-none focus:ring-0 p-0 text-brand-900 placeholder:text-brand-200 bg-transparent resize-none"
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
                          <input 
                            type="text"
                            value={activeCharacter.name}
                            onChange={(e) => updateCharacter(activeCharacter.id, { name: e.target.value })}
                            className="w-full text-4xl font-serif font-bold border-none focus:ring-0 p-0 placeholder:text-brand-200"
                            placeholder="角色姓名..."
                          />
                          <button 
                            onClick={() => deleteItem(ContentType.CHARACTER, activeCharacter.id)}
                            className="p-2 text-brand-300 hover:text-red-500 transition-colors"
                            title="删除角色"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {activeCharacter.traits.map((trait, idx) => (
                            <span key={idx} className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-medium flex items-center gap-1">
                              {trait}
                              <button onClick={() => {
                                const newTraits = [...activeCharacter.traits];
                                newTraits.splice(idx, 1);
                                updateCharacter(activeCharacter.id, { traits: newTraits });
                              }}>
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <button 
                            onClick={() => {
                              const trait = prompt('输入标签:');
                              if (trait) updateCharacter(activeCharacter.id, { traits: [...activeCharacter.traits, trait] });
                            }}
                            className="px-3 py-1 border border-dashed border-brand-300 text-brand-400 rounded-full text-xs font-medium hover:border-brand-500 hover:text-brand-500"
                          >
                            + 添加标签
                          </button>
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
                            disabled={isGenerating}
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
                        className="w-full min-h-[300px] text-lg leading-relaxed border-none focus:ring-0 p-0 placeholder:text-brand-200 resize-none"
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

        {/* Right Sidebar (AI Chapter Expander) */}
        <AnimatePresence>
          {isRightSidebarOpen && activeTab === ContentType.CHAPTER && activeChapter && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-brand-200/50 bg-white flex flex-col z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.02)]"
            >
              <div className="p-5 border-b border-brand-200/50 flex items-center justify-between bg-brand-50/30">
                <div className="flex items-center gap-2 text-brand-900">
                  <Sliders size={16} />
                  <h3 className="font-bold text-sm">AI 章节扩写</h3>
                </div>
                <button 
                  onClick={() => setIsRightSidebarOpen(false)}
                  className="p-1.5 text-brand-400 hover:text-brand-900 hover:bg-white rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-500 flex items-center gap-2">
                    <FileText size={12} /> 章节大纲 / 核心情节
                  </label>
                  <textarea
                    value={activeChapter.draft || ''}
                    onChange={(e) => updateChapter(activeChapter.id, { draft: e.target.value })}
                    placeholder="在这里写下本章的大纲、你想发生的情节、人物的对话要点等。AI 将根据这些内容以及前情提要为你扩写出完整的章节..."
                    className="w-full h-64 p-4 bg-brand-50/50 border border-brand-200/50 rounded-xl text-sm text-brand-800 resize-none focus:ring-2 focus:ring-brand-900/10 focus:border-brand-900/20 transition-all custom-scrollbar"
                  />
                </div>
                
                <div className="bg-brand-50/50 rounded-xl p-4 border border-brand-100">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-500 mb-3 flex items-center gap-2">
                    <Zap size={12} /> 扩写设置
                  </h4>
                  <div className="space-y-3 text-xs text-brand-600">
                    <div className="flex items-center justify-between">
                      <span>参考前情提要</span>
                      <CheckCircle2 size={14} className={project.storyRecap ? "text-emerald-500" : "text-brand-300"} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>参考关联设定 ({activeChapter.linkedContextIds?.length || 0})</span>
                      <CheckCircle2 size={14} className={(activeChapter.linkedContextIds?.length || 0) > 0 ? "text-emerald-500" : "text-brand-300"} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>应用写作规则 ({project.writingRules.filter(r => r.isActive).length})</span>
                      <CheckCircle2 size={14} className={project.writingRules.filter(r => r.isActive).length > 0 ? "text-emerald-500" : "text-brand-300"} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-brand-200/50 bg-white">
                <button
                  onClick={handleAiExpandChapter}
                  disabled={isGenerating || !activeChapter.draft?.trim()}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-sm",
                    isGenerating || !activeChapter.draft?.trim()
                      ? "bg-brand-100 text-brand-400 cursor-not-allowed"
                      : "bg-brand-900 text-white hover:bg-brand-800 hover:shadow-md hover:shadow-brand-900/20"
                  )}
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isGenerating ? '正在扩写...' : '生成完整章节'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* AI Assistant Panel */}
        <AnimatePresence>
          {isAiAssistantOpen && activeTab === ContentType.CHAPTER && activeId && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl z-40 px-6"
            >
              <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] border border-brand-200/50 p-6 shadow-2xl shadow-brand-900/10">
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-900 flex items-center gap-2">
                        <Sparkles size={14} /> AI 创作助手
                      </span>
                      <div className="group relative">
                        <AlertCircle size={14} className="text-brand-300 cursor-help" />
                        <div className="absolute bottom-full left-0 mb-3 w-72 p-4 bg-brand-900 text-white text-[11px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 shadow-2xl border border-white/10 leading-relaxed">
                          <p className="font-bold mb-2 flex items-center gap-2 text-brand-200">
                            <Zap size={12} /> 提示词改进建议
                          </p>
                          <ul className="space-y-2 opacity-90">
                            <li><b className="text-brand-200">具体化：</b>不要只说“继续”，试着说“描述艾拉发现徽章时的惊讶表情”。</li>
                            <li><b className="text-brand-200">设定风格：</b>加入“用忧郁的笔触描述”或“增加对话互动”。</li>
                            <li><b className="text-brand-200">明确冲突：</b>“突然出现一个黑影袭击了她”比“发生一些意外”更好。</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setIsAiAssistantOpen(false)}
                        className="text-brand-400 hover:text-brand-900 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1 relative group">
                      <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="要求 AI 继续、重写或添加特定场景..."
                        className="w-full bg-brand-100/50 rounded-2xl px-5 py-4 pr-16 text-sm border-none focus:ring-2 focus:ring-brand-900/10 resize-none min-h-[56px] max-h-40 custom-scrollbar transition-all"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAiGenerate();
                          }
                        }}
                      />
                      <div className="absolute right-4 bottom-4 flex items-center gap-3">
                        {aiPrompt && (
                          <button 
                            onClick={handleOptimizePrompt}
                            disabled={isGenerating}
                            className="p-1.5 text-brand-400 hover:text-brand-900 transition-colors"
                            title="魔法优化"
                          >
                            <Zap size={14} />
                          </button>
                        )}
                        <div className="text-[9px] font-bold uppercase tracking-widest text-brand-300 pointer-events-none">
                          Enter 发送
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={handleAiGenerate}
                        disabled={isGenerating}
                        className={cn(
                          "h-14 px-8 rounded-2xl bg-brand-900 text-white font-bold uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-brand-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-900/20",
                          isGenerating && "animate-pulse"
                        )}
                      >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        <span>{isGenerating ? '创作中' : '生成内容'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 px-1">
                    <button 
                      onClick={handleAiPlanNextChapter}
                      disabled={isGenerating}
                      className="text-[9px] font-bold uppercase tracking-widest text-brand-500 hover:text-brand-900 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <GitBranch size={12} /> 规划下一章
                    </button>
                    <div className="w-1 h-1 rounded-full bg-brand-200" />
                    <button 
                      onClick={handleConsistencyCheck}
                      disabled={isGenerating}
                      className="text-[9px] font-bold uppercase tracking-widest text-brand-500 hover:text-brand-900 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Search size={12} /> 连贯性检查
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                  className="w-full py-3 bg-brand-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-brand-800 transition-all"
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
                  className="p-2 hover:bg-brand-50 rounded-full text-brand-400 hover:text-brand-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="prose prose-slate max-w-none">
                  {reviewContent.split('\n').map((line, i) => (
                    <p key={i} className="mb-4 text-brand-700 leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-brand-100 bg-brand-50/30 flex justify-end">
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="px-6 py-2 bg-brand-900 text-white rounded-xl font-medium hover:bg-brand-800 transition-colors"
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
                  className="p-2 hover:bg-brand-50 rounded-full text-brand-400 hover:text-brand-900 transition-colors"
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
                    {inspirationContent.split('\n').map((line, i) => (
                      <p key={i} className="mb-4 text-brand-700 leading-relaxed">{line}</p>
                    ))}
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
                  className="px-6 py-2 bg-brand-900 text-white rounded-xl font-medium hover:bg-brand-800 transition-colors"
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
