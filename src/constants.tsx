import React from 'react';
import { 
  FileText, 
  Calculator, 
  MessageSquare, 
  Info
} from 'lucide-react';
import { AppConfig } from './types';
import Notepad from './components/apps/Notepad';
import CalculatorApp from './components/apps/Calculator';
import AIAssistant from './components/apps/AIAssistant';
import DeploymentGuide from './components/apps/DeploymentGuide';

export const APPS: AppConfig[] = [
  {
    id: 'notepad',
    name: '记事本',
    icon: <FileText className="w-6 h-6 text-blue-500" />,
    component: Notepad,
    isPinned: true
  },
  {
    id: 'calculator',
    name: '计算器',
    icon: <Calculator className="w-6 h-6 text-orange-500" />,
    component: CalculatorApp,
    isPinned: true
  },
  {
    id: 'ai-assistant',
    name: 'AI 助手',
    icon: <MessageSquare className="w-6 h-6 text-purple-500" />,
    component: AIAssistant,
    isPinned: true
  },
  {
    id: 'deployment',
    name: '部署指南',
    icon: <Info className="w-6 h-6 text-emerald-500" />,
    component: DeploymentGuide,
    isPinned: true
  }
];
