export interface CharacterStatus {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  wounds: string[];
}

export interface Character {
  id: string;
  name: string;
  description: string;
  status: CharacterStatus;
  traits: string[];
  voiceFingerprint: string; // Description of their tone/style
}

export interface Relationship {
  sourceId: string;
  targetId: string;
  affection: number; // 0-100
  hostility: number; // 0-100
  type: string;
}

export interface LoreEntry {
  id: string;
  category: 'world' | 'item' | 'event' | 'other';
  title: string;
  content: string;
}

export interface Resources {
  money: number;
  supplies: number;
}

export interface StoryState {
  title: string;
  content: string;
  characters: Character[];
  relationships: Relationship[];
  lore: LoreEntry[];
  resources: Resources;
}
