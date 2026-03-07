import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Save, 
  Send, 
  Users, 
  BookOpen, 
  Activity, 
  Zap, 
  MessageSquare, 
  RefreshCw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  Settings,
  AlertTriangle,
  Fingerprint,
  BarChart3,
  Heart,
  ShieldAlert,
  Coins,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryState, Character, Relationship, LoreEntry, CharacterStatus } from './types';
import CharacterStatusCard from './components/CharacterStatusCard';
import RelationshipGraph from './components/RelationshipGraph';
import LorePanel from './components/LorePanel';
import ResourceMonitor from './components/ResourceMonitor';
import LogicGuardrail from './components/LogicGuardrail';
import ToneFingerprint from './components/ToneFingerprint';

const App: React.FC = () => {
  const [state, setState] = useState<StoryState>({
    title: "未命名故事",
    content: "",
    characters: [],
    relationships: [],
    lore: [],
    resources: { money: 100, supplies: 100 }
  });

  const [aiCommand, setAiCommand] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'characters' | 'lore' | 'relationships' | 'logic'>('characters');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [fingerprint, setFingerprint] = useState({
    bloody: 20,
    poetic: 40,
    technical: 10,
    emotional: 30
  });

  useEffect(() => {
    // Load initial state
    fetch('/api/story')
      .then(res => res.json())
      .then(data => {
        if (!data.characters || data.characters.length === 0) {
          // Add some dummy data if empty
          const dummyChars: Character[] = [
            {
              id: 'char1',
              name: '亚瑟 (Arthur)',
              description: '勇敢的骑士',
              status: { hp: 100, maxHp: 100, stamina: 80, maxStamina: 100, wounds: [] },
              traits: ['勇敢', '忠诚'],
              voiceFingerprint: '低沉且坚定'
            },
            {
              id: 'char2',
              name: '莉莉丝 (Lilith)',
              description: '神秘的法师',
              status: { hp: 60, maxHp: 60, stamina: 100, maxStamina: 100, wounds: ['轻微魔力反噬'] },
              traits: ['冷静', '博学'],
              voiceFingerprint: '优雅且带有一丝嘲讽'
            }
          ];
          const dummyRels: Relationship[] = [
            { sourceId: 'char1', targetId: 'char2', affection: 60, hostility: 10, type: '同伴' }
          ];
          const dummyLore: LoreEntry[] = [
            { id: 'lore1', category: 'world', title: '圣剑传说', content: '只有真正的勇者才能拔出圣剑。' }
          ];
          setState({
            ...data,
            characters: dummyChars,
            relationships: dummyRels,
            lore: dummyLore
          });
        } else {
          setState(data);
        }
      })
      .catch(err => console.error("Load error:", err));
  }, []);

  const handleSave = async () => {
    try {
      await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      alert('保存成功！');
    } catch (error) {
      alert('保存失败');
    }
  };

  const executeAiCommand = async () => {
    if (!aiCommand.trim()) return;
    setIsAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // RAG: Find relevant lore
      const relevantLore = state.lore.filter(l => 
        aiCommand.toLowerCase().includes(l.title.toLowerCase()) || 
        aiCommand.toLowerCase().includes(l.category.toLowerCase())
      );

      const prompt = `
        你是一个专业的小说写作助手。
        当前故事内容:
        ${state.content}

        当前角色状态:
        ${state.characters.map(c => `${c.name}: HP ${c.status.hp}/${c.status.maxHp}, 状态: ${c.status.wounds.join(', ')}`).join('\n')}

        相关背景设定 (RAG):
        ${relevantLore.map(l => `${l.title}: ${l.content}`).join('\n')}

        用户指令: "${aiCommand}"

        请根据指令续写或修改故事。如果指令涉及战斗，请根据角色状态进行描写。
        如果指令涉及角色生理状态变化（如受伤、消耗体力），请在回答最后以 JSON 格式提供更新后的角色状态和资源变化。
        格式如: [UPDATE_STATE: {"characters": [...], "resources": {...}}]
        
        注意：请保持故事的连贯性，并遵循角色的性格特征。
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const text = response.text || "";
      
      // Parse potential state updates
      const stateMatch = text.match(/\[UPDATE_STATE: (.*?)\]/);
      let cleanText = text.replace(/\[UPDATE_STATE: (.*?)\]/, '').trim();

      if (stateMatch) {
        try {
          const updates = JSON.parse(stateMatch[1]);
          setState(prev => ({
            ...prev,
            content: prev.content + "\n\n" + cleanText,
            ...updates
          }));
        } catch (e) {
          setState(prev => ({ ...prev, content: prev.content + "\n\n" + cleanText }));
        }
      } else {
        setState(prev => ({ ...prev, content: prev.content + "\n\n" + cleanText }));
      }

      setAiCommand("");
      
      // Trigger logic check and fingerprint analysis in background
      analyzeStory(cleanText);

    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const analyzeStory = async (newText: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    try {
      // 1. Logic Guardrail Check
      const logicPrompt = `
        分析以下小说片段是否存在逻辑冲突、设定矛盾或语气不符。
        当前背景设定: ${state.lore.map(l => l.content).join('; ')}
        当前片段: ${newText}
        请以 JSON 数组格式返回冲突点: [{"id": "1", "type": "logic", "message": "...", "severity": "high"}]
        如果没有冲突，返回空数组 []。
      `;

      const logicRes = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: logicPrompt,
        config: { responseMimeType: "application/json" }
      });
      const newConflicts = JSON.parse(logicRes.text || "[]");
      setConflicts(newConflicts);

      // 2. Tone Fingerprint Analysis
      const tonePrompt = `
        分析以下小说片段的风格指纹。
        片段: ${newText}
        请返回四个维度的百分比 (0-100): bloody, poetic, technical, emotional.
        格式: {"bloody": 20, "poetic": 30, "technical": 10, "emotional": 40}
      `;
      const toneRes = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: tonePrompt,
        config: { responseMimeType: "application/json" }
      });
      setFingerprint(JSON.parse(toneRes.text || "{}"));
    } catch (e) {
      console.error("Analysis Error:", e);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-16 bg-slate-900 flex flex-col items-center py-6 gap-8 border-r border-slate-800 z-20">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Sparkles size={20} />
        </div>
        <nav className="flex flex-col gap-6">
          <button 
            onClick={() => setActiveTab('characters')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'characters' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            title="角色状态"
          >
            <Users size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('lore')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'lore' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            title="动态知识库"
          >
            <BookOpen size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('relationships')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'relationships' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            title="关系图谱"
          >
            <Activity size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('logic')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'logic' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            title="逻辑与风格"
          >
            <Zap size={20} />
          </button>
        </nav>
        <div className="mt-auto flex flex-col gap-6">
          <button onClick={handleSave} className="p-2 text-slate-400 hover:text-emerald-400 transition-colors" title="保存项目">
            <Save size={20} />
          </button>
          <button className="p-2 text-slate-400 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <input 
              value={state.title}
              onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
              className="text-xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 w-64"
            />
            <div className="h-4 w-px bg-slate-200" />
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              {state.content.length} 字数
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {sidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </header>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full">
          <textarea 
            value={state.content}
            onChange={(e) => setState(prev => ({ ...prev, content: e.target.value }))}
            placeholder="开始你的创作..."
            className="w-full h-full resize-none border-none focus:ring-0 text-lg leading-relaxed text-slate-700 placeholder-slate-300 font-serif"
          />
        </div>

        {/* AI Command Bar */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-4xl mx-auto relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500">
              <Sparkles size={18} />
            </div>
            <input 
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeAiCommand()}
              placeholder="输入指令，例如：'将这段打斗描写变得更血腥点' 或 '续写接下来的情节'..."
              className="w-full pl-12 pr-24 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
            />
            <button 
              onClick={executeAiCommand}
              disabled={isAiLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isAiLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {isAiLoading ? '生成中...' : '发送'}
            </button>
          </div>
        </div>
      </main>

      {/* Right Sidebar (Dashboard) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-slate-50 border-l border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <ResourceMonitor resources={state.resources} />
              
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <LayoutDashboard size={18} className="text-indigo-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">实时监控看板</h3>
                </div>
                
                {activeTab === 'characters' && (
                  <div className="space-y-4">
                    {state.characters.map(char => (
                      <CharacterStatusCard key={char.id} character={char} />
                    ))}
                  </div>
                )}

                {activeTab === 'lore' && (
                  <LorePanel 
                    lore={state.lore} 
                    onAdd={(entry) => setState(prev => ({ ...prev, lore: [...prev.lore, entry] }))}
                    onDelete={(id) => setState(prev => ({ ...prev, lore: prev.lore.filter(l => l.id !== id) }))}
                  />
                )}

                {activeTab === 'relationships' && (
                  <div className="space-y-6">
                    <RelationshipGraph characters={state.characters} relationships={state.relationships} />
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">好感度/敌对值追踪</h4>
                      {state.relationships.map((rel, i) => (
                        <div key={i} className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-slate-50 last:border-0">
                          <span className="font-medium text-slate-700">
                            {state.characters.find(c => c.id === rel.sourceId)?.name} ➔ {state.characters.find(c => c.id === rel.targetId)?.name}
                          </span>
                          <div className="flex gap-3">
                            <span className="text-emerald-600">❤ {rel.affection}</span>
                            <span className="text-rose-600">⚔ {rel.hostility}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'logic' && (
                  <div className="space-y-6">
                    <LogicGuardrail conflicts={conflicts} />
                    <ToneFingerprint fingerprint={fingerprint} />
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
