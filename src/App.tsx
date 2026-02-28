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
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markdown';
import ReactMarkdown from 'react-markdown';
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
import { cn } from './lib/utils';
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
  summarizeChapter, 
  checkConsistency, 
  generateInspiration,
  generateWorldSetting,
  generateCharacter,
  generateWritingRule,
  optimizePrompt
} from './services/geminiService';

const STORAGE_KEY = 'musewriter_project';
const PROJECTS_STORAGE_KEY = 'musewriter_projects_v2';
const ACTIVE_PROJECT_ID_KEY = 'musewriter_active_id_v2';

const INITIAL_PROJECT: NovelProject = {
  id: '1',
  title: '我的史诗小说',
  worldSettings: [
    { id: 'ws1', title: '世界观概览', content: '一个魔法由记忆驱动的世界。' }
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
  aiConfig: {
    temperature: 0.7,
    model: 'gemini-3-flash-preview'
  }
};

export default function App() {
  const [projects, setProjects] = useState<NovelProject[]>(() => {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    // Migration
    const oldSaved = localStorage.getItem(STORAGE_KEY);
    if (oldSaved) {
      try {
        const oldProject = JSON.parse(oldSaved);
        return [oldProject];
      } catch (e) {}
    }
    return [INITIAL_PROJECT];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const savedId = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    if (savedId && projects.some(p => p.id === savedId)) return savedId;
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

  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    setLastSaved(new Date().toLocaleTimeString());
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, activeProjectId);
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
      id: crypto.randomUUID(),
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
        const temp = chapters[index].order;
        chapters[index].order = chapters[index - 1].order;
        chapters[index - 1].order = temp;
      } else if (direction === 'down' && index < chapters.length - 1) {
        const temp = chapters[index].order;
        chapters[index].order = chapters[index + 1].order;
        chapters[index + 1].order = temp;
      }
      return { ...prev, chapters };
    });
  };

  const addWorldSetting = () => {
    const newSetting: WorldSetting = {
      id: crypto.randomUUID(),
      title: '新设定',
      content: ''
    };
    setProject(prev => ({ ...prev, worldSettings: [...prev.worldSettings, newSetting] }));
    setActiveId(newSetting.id);
    setActiveTab(ContentType.WORLD_SETTING);
  };

  const addCharacter = () => {
    const newChar: Character = {
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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

  const handleAiGenerate = async () => {
    if (!activeId || activeTab !== ContentType.CHAPTER) return;
    
    setIsGenerating(true);
    try {
      const result = await generateNovelContent(project, activeId, aiPrompt || "请自然地继续故事。");
      if (result) {
        const currentChapter = project.chapters.find(c => c.id === activeId);
        const newContent = (currentChapter?.content || '') + '\n\n' + result;
        updateChapter(activeId, { content: newContent });
        setAiPrompt('');
        showStatus('内容生成成功！', 'success');
      }
    } catch (error) {
      console.error(error);
      showStatus('生成失败，请检查 API Key。', 'error');
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
      const result = await generateWorldSetting(project, setting.title, setting.content);
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

  const createNewProject = () => {
    const newProject: NovelProject = {
      ...INITIAL_PROJECT,
      id: crypto.randomUUID(),
      title: '未命名作品',
      chapters: [{ ...INITIAL_PROJECT.chapters[0], id: crypto.randomUUID(), title: '第一章', content: '', summary: '' }],
      worldSettings: [],
      characters: [],
      writingRules: [],
      plotEvents: []
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
      id: crypto.randomUUID(),
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
        "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all",
        activeId === id && activeTab === type ? "bg-brand-100 text-brand-900" : "text-brand-500 hover:bg-brand-50 hover:text-brand-700"
      )}
      onClick={() => {
        setActiveId(id);
        setActiveTab(type);
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {icon}
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onMoveUp && (
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:text-brand-900" title="上移">
            <ArrowUp size={12} />
          </button>
        )}
        {onMoveDown && (
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:text-brand-900" title="下移">
            <ArrowDown size={12} />
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(type, id);
          }}
          className="p-1 hover:text-red-500 transition-colors"
          title="删除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  const SortableChapterItem = ({ chapter, project, onToggle, onAddEvent, onUpdateChapter, onUpdateEvent, onDeleteEvent }: any) => {
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

  const OutlineView = () => {
    const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);

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

    return (
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
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  };
  const activeChapter = project.chapters.find(c => c.id === activeId);
  const activeWorldSetting = project.worldSettings.find(s => s.id === activeId);
  const activeCharacter = project.characters.find(c => c.id === activeId);
  const activeWritingRule = project.writingRules.find(r => r.id === activeId);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="border-r border-brand-200 bg-brand-50/50 flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-brand-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center text-white">
                <Sparkles size={18} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">灵感作家</h1>
            </div>
            <button 
              onClick={() => setShowLibrary(!showLibrary)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                showLibrary ? "bg-brand-900 text-white" : "text-brand-400 hover:bg-brand-100"
              )}
              title="我的书架"
            >
              <Book size={18} />
            </button>
          </div>

          <AnimatePresence>
            {showLibrary ? (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2 mb-2"
              >
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">我的书架</span>
                  <button onClick={createNewProject} className="text-brand-600 hover:text-brand-900">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                  {projects.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => switchProject(p.id)}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-all",
                        activeProjectId === p.id ? "bg-brand-100 text-brand-900 font-medium" : "text-brand-500 hover:bg-brand-50"
                      )}
                    >
                      <span className="truncate">{p.title}</span>
                      {projects.length > 1 && (
                        <button 
                          onClick={(e) => deleteProject(p.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="h-[1px] bg-brand-100 my-2" />
              </motion.div>
            ) : (
              <input 
                type="text" 
                value={project.title}
                onChange={(e) => setProject(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-transparent border-none focus:ring-0 font-serif text-lg p-0"
                placeholder="小说标题..."
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {/* Outline */}
          <div>
            <div 
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all mb-4",
                activeTab === ContentType.OUTLINE ? "bg-brand-900 text-white" : "text-brand-500 hover:bg-brand-50 hover:text-brand-700"
              )}
              onClick={() => setActiveTab(ContentType.OUTLINE)}
            >
              <GitBranch size={16} />
              <span className="text-sm font-bold uppercase tracking-wider">大纲视图</span>
            </div>
          </div>

          {/* Chapters */}
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <FileText size={14} /> 章节目录
              </h3>
              <button onClick={addChapter} className="p-1 hover:bg-brand-100 rounded text-brand-500">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
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

          {/* World Settings */}
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <Layout size={14} /> 世界设定
              </h3>
              <button onClick={addWorldSetting} className="p-1 hover:bg-brand-100 rounded text-brand-500">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {project.worldSettings.map(s => 
                renderSidebarItem(s.id, s.title, ContentType.WORLD_SETTING, <Layout size={16} />)
              )}
            </div>
          </div>

          {/* Characters */}
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <Users size={14} /> 人物档案
              </h3>
              <button onClick={addCharacter} className="p-1 hover:bg-brand-100 rounded text-brand-500">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {project.characters.map(c => 
                renderSidebarItem(c.id, c.name, ContentType.CHARACTER, <Users size={16} />)
              )}
            </div>
          </div>

          {/* Rules */}
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <Settings size={14} /> 写作规则
              </h3>
              <button onClick={addWritingRule} className="p-1 hover:bg-brand-100 rounded text-brand-500">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {project.writingRules.map(r => 
                renderSidebarItem(r.id, r.name, ContentType.WRITING_RULE, <Settings size={16} />)
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-brand-200 space-y-2">
          <div className="bg-white rounded-xl border border-brand-100 p-3 mb-2 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1">
                  <Zap size={10} /> AI 模型
                </span>
              </div>
              <select 
                value={project.aiConfig.model}
                onChange={(e) => setProject(prev => ({ ...prev, aiConfig: { ...prev.aiConfig, model: e.target.value } }))}
                className="w-full bg-brand-50 border-none rounded-lg text-xs font-medium text-brand-700 py-1.5 px-2 focus:ring-1 focus:ring-brand-200 outline-none"
              >
                <optgroup label="Google Gemini">
                  <option value="gemini-3-flash-preview">Gemini 3 Flash (快速)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (强大)</option>
                </optgroup>
                <optgroup label="Alibaba Qwen">
                  <option value="qwen-max">通义千问 Max (顶尖)</option>
                  <option value="qwen-plus">通义千问 Plus (均衡)</option>
                  <option value="qwen-turbo">通义千问 Turbo (极速)</option>
                </optgroup>
                <optgroup label="DeepSeek">
                  <option value="deepseek-chat">DeepSeek Chat (通用)</option>
                  <option value="deepseek-reasoner">DeepSeek Reasoner (深度思考)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1">
                  <Sliders size={10} /> AI 创造力 (Temperature)
                </span>
                <span className="text-xs font-mono text-brand-600">{project.aiConfig.temperature.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1" 
                value={project.aiConfig.temperature}
                onChange={(e) => setProject(prev => ({ ...prev, aiConfig: { ...prev.aiConfig, temperature: parseFloat(e.target.value) } }))}
                className="w-full h-1.5 bg-brand-100 rounded-lg appearance-none cursor-pointer accent-brand-900"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-brand-300">严谨</span>
                <span className="text-[8px] text-brand-300">奔放</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleConsistencyCheck}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 py-2 bg-brand-100 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-200 transition-colors disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              连贯性检查
            </button>
            <button 
              onClick={() => setShowInspirationModal(true)}
              className="flex items-center justify-center gap-2 py-2 bg-brand-900 text-white rounded-lg text-xs font-medium hover:bg-brand-800 transition-colors"
            >
              <Zap size={12} />
              灵感迸发
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Top Bar */}
        <header className="h-14 border-b border-brand-200 flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-brand-50 rounded-lg text-brand-500"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-4 w-[1px] bg-brand-200" />
            <div className="flex items-center gap-2 text-sm text-brand-500">
              <Book size={16} />
              <span>{project.title}</span>
              <ChevronRight size={14} />
              <span className="font-medium text-brand-900">
                {activeTab === ContentType.OUTLINE && "大纲视图"}
                {activeTab === ContentType.CHAPTER && activeChapter?.title}
                {activeTab === ContentType.WORLD_SETTING && activeWorldSetting?.title}
                {activeTab === ContentType.CHARACTER && activeCharacter?.name}
                {activeTab === ContentType.WRITING_RULE && activeWritingRule?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] text-brand-400 font-medium hidden sm:block">已自动保存于 {lastSaved}</span>
            <AnimatePresence>
              {statusMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                    statusMessage.type === 'success' ? "bg-emerald-50 text-emerald-700" : 
                    statusMessage.type === 'error' ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                  )}
                >
                  {statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {statusMessage.text}
                </motion.div>
              )}
            </AnimatePresence>
            <button className="flex items-center gap-2 px-4 py-1.5 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors">
              <Save size={16} /> 保存
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className={cn(
            "mx-auto py-12 px-6",
            activeTab === ContentType.OUTLINE ? "max-w-5xl" : "max-w-3xl"
          )}>
            {activeTab === ContentType.OUTLINE ? (
              <OutlineView />
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
                  <>
                    <div className="flex items-center justify-between">
                      <input 
                        type="text"
                        value={activeChapter.title}
                        onChange={(e) => updateChapter(activeChapter.id, { title: e.target.value })}
                        className="w-full text-4xl font-serif font-bold border-none focus:ring-0 p-0 placeholder:text-brand-200"
                        placeholder="章节标题..."
                      />
                      <button 
                        onClick={() => deleteItem(ContentType.CHAPTER, activeChapter.id)}
                        className="p-2 text-brand-300 hover:text-red-500 transition-colors"
                        title="删除章节"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-brand-400">章节摘要 (AI 生成)</label>
                        <button 
                          onClick={handleSummarize}
                          disabled={isGenerating || !activeChapter.content}
                          className="text-xs text-brand-600 hover:text-brand-900 flex items-center gap-1 disabled:opacity-50"
                        >
                          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          重新生成摘要
                        </button>
                      </div>
                      <textarea 
                        value={activeChapter.summary}
                        onChange={(e) => updateChapter(activeChapter.id, { summary: e.target.value })}
                        className="w-full bg-brand-50/50 rounded-xl p-4 text-sm text-brand-600 border-none focus:ring-1 focus:ring-brand-200 resize-none italic"
                        rows={3}
                        placeholder="本章的简要概述..."
                      />
                    </div>
                    <div className="flex items-center justify-between border-b border-brand-100 pb-2 mb-4">
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-brand-400">
                        <span className="flex items-center gap-1">
                          <FileText size={10} /> {getWordCount(activeChapter.content)} 字
                        </span>
                        <span className="flex items-center gap-1">
                          <History size={10} /> 约 {Math.ceil(getWordCount(activeChapter.content) / 300)} 分钟阅读
                        </span>
                      </div>
                      <button 
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                          isPreviewMode ? "bg-brand-900 text-white" : "bg-brand-100 text-brand-600 hover:bg-brand-200"
                        )}
                      >
                        {isPreviewMode ? "编辑模式" : "预览模式"}
                      </button>
                    </div>
                    <div className="relative min-h-[600px] font-serif text-lg leading-relaxed">
                      {isPreviewMode ? (
                        <div className="markdown-body prose prose-slate max-w-none">
                          <ReactMarkdown>{activeChapter.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <Editor
                          value={activeChapter.content}
                          onValueChange={code => updateChapter(activeChapter.id, { content: code })}
                          highlight={code => Prism.highlight(code, Prism.languages.markdown, 'markdown')}
                          padding={0}
                          className="w-full min-h-[600px] outline-none focus:ring-0"
                          style={{
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                          }}
                          placeholder="很久很久以前..."
                        />
                      )}
                    </div>
                  </>
                )}

                {/* World Setting Editor */}
                {activeTab === ContentType.WORLD_SETTING && activeWorldSetting && (
                  <>
                    <div className="flex items-center justify-between">
                      <input 
                        type="text"
                        value={activeWorldSetting.title}
                        onChange={(e) => updateWorldSetting(activeWorldSetting.id, { title: e.target.value })}
                        className="w-full text-4xl font-serif font-bold border-none focus:ring-0 p-0 placeholder:text-brand-200"
                        placeholder="设定标题..."
                      />
                      <button 
                        onClick={() => deleteItem(ContentType.WORLD_SETTING, activeWorldSetting.id)}
                        className="p-2 text-brand-300 hover:text-red-500 transition-colors"
                        title="删除设定"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between border-b border-brand-100 pb-2 mb-4">
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-brand-400">
                        <span className="flex items-center gap-1">
                          <FileText size={10} /> {getWordCount(activeWorldSetting.content)} 字
                        </span>
                      </div>
                      <button 
                        onClick={handleGenerateWorldSetting}
                        disabled={isGenerating}
                        className="flex items-center gap-1 px-3 py-1 bg-brand-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-brand-800 transition-all disabled:opacity-50"
                      >
                        {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        AI 补全设定
                      </button>
                    </div>
                    <textarea 
                      value={activeWorldSetting.content}
                      onChange={(e) => updateWorldSetting(activeWorldSetting.id, { content: e.target.value })}
                      className="w-full min-h-[400px] text-lg leading-relaxed border-none focus:ring-0 p-0 placeholder:text-brand-200 resize-none"
                      placeholder="描述你的世界、魔法体系、历史..."
                    />
                  </>
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

        {/* AI Assistant Panel */}
        {activeTab === ContentType.CHAPTER && activeId && (
          <div className="border-t border-brand-200 bg-white p-4">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">AI 创作助手</span>
                  <div className="group relative">
                    <AlertCircle size={12} className="text-brand-300 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-brand-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                      <p className="font-bold mb-1">提示词改进建议：</p>
                      <ul className="list-disc ml-3 space-y-1 opacity-80">
                        <li><b>具体化：</b>不要只说“继续”，试着说“描述艾拉发现徽章时的惊讶表情”。</li>
                        <li><b>设定风格：</b>加入“用忧郁的笔触描述”或“增加对话互动”。</li>
                        <li><b>明确冲突：</b>“突然出现一个黑影袭击了她”比“发生一些意外”更好。</li>
                      </ul>
                    </div>
                  </div>
                </div>
                {aiPrompt && (
                  <button 
                    onClick={handleOptimizePrompt}
                    disabled={isGenerating}
                    className="text-[10px] font-bold uppercase tracking-wider text-brand-600 hover:text-brand-900 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Zap size={10} /> 魔法优化提示词
                  </button>
                )}
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="要求 AI 继续、重写或添加特定场景..."
                    className="w-full bg-brand-50 rounded-2xl px-4 py-3 pr-12 text-sm border-none focus:ring-2 focus:ring-brand-900/10 resize-none min-h-[44px] max-h-32 custom-scrollbar"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiGenerate();
                      }
                    }}
                  />
                  <div className="absolute right-3 bottom-3 text-[10px] text-brand-300 font-mono">
                    按 Enter 发送
                  </div>
                </div>
                <button 
                  onClick={handleAiGenerate}
                  disabled={isGenerating}
                  className={cn(
                    "h-11 px-6 rounded-2xl bg-brand-900 text-white font-medium flex items-center gap-2 hover:bg-brand-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                    isGenerating && "animate-pulse"
                  )}
                >
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  <span>{isGenerating ? '创作中...' : '生成内容'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

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
    </div>
  );
}
