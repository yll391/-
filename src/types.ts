export enum ContentType {
  WORLD_SETTING = 'WORLD_SETTING',
  CHARACTER = 'CHARACTER',
  WRITING_RULE = 'WRITING_RULE',
  CHAPTER = 'CHAPTER',
  OUTLINE = 'OUTLINE',
}

export interface PlotLine {
  id: string;
  title: string;
  color: string;
}

export interface PlotEvent {
  id: string;
  title: string;
  description: string;
  chapterId?: string;
  plotLineId?: string;
  order: number;
}

export interface WorldSetting {
  id: string;
  title: string;
  content: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  traits: string[];
}

export interface WritingRule {
  id: string;
  name: string;
  rule: string;
  isActive: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  summary: string;
  order: number;
  isExpanded?: boolean;
}

export interface NovelProject {
  id: string;
  title: string;
  worldSettings: WorldSetting[];
  characters: Character[];
  writingRules: WritingRule[];
  chapters: Chapter[];
  plotLines: PlotLine[];
  plotEvents: PlotEvent[];
  aiConfig: {
    temperature: number;
    model: string;
  };
}
