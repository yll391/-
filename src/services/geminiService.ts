import { GoogleGenAI } from "@google/genai";
import { NovelProject, Chapter } from "../types";

let aiInstance: any = null;

function getAI() {
  if (!aiInstance) {
    let apiKey = "";
    
    // 兼容 Vite 本地环境 (import.meta.env)
    try {
      if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
        apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      }
    } catch (e) {
      // Ignore
    }

    // 兼容 Node 环境 (process.env)
    try {
      if (typeof process !== "undefined" && process.env && process.env.GEMINI_API_KEY) {
        apiKey = process.env.GEMINI_API_KEY;
      }
    } catch (e) {
      // Ignore
    }

    if (!apiKey) {
      console.error("未找到 Gemini API Key！请在项目根目录的 .env 文件中设置 VITE_GEMINI_API_KEY=你的密钥");
      // 为了防止页面直接崩溃，传入一个假的 key，后续调用会报错但不会导致整个应用白屏
      apiKey = "missing-api-key";
    }
    
    aiInstance = new GoogleGenAI({ apiKey: apiKey });
  }
  return aiInstance;
}

async function callAI(model: string, prompt: string, systemInstruction: string, temperature: number = 0.7) {
  const ai = getAI();
  if (model.includes("gemini")) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
        },
      });
      
      if (!response || !response.text) {
        throw new Error("AI 返回了空响应。");
      }
      
      return response.text;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Gemini API 调用失败");
    }
  } else {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  }
}

export async function generateNovelContent(
  project: NovelProject,
  currentChapterId: string,
  prompt: string,
  instruction: string = "根据提供的上下文继续故事。"
) {
  const currentChapter = project.chapters.find(c => c.id === currentChapterId);
  const previousChapters = project.chapters
    .filter(c => c.order < (currentChapter?.order || 0))
    .sort((a, b) => a.order - b.order)
    .slice(-3); // Get last 3 chapters for context

  const worldContext = project.worldSettings.map(s => `${s.title}: ${s.content}`).join("\n\n");
  const characterContext = project.characters.map(c => `${c.name}: ${c.description} (Traits: ${c.traits.join(", ")})`).join("\n\n");
  const rulesContext = project.writingRules.filter(r => r.isActive).map(r => r.rule).join("\n");
  const storyRecap = project.storyRecap || "无";
  const plotEventsContext = project.plotEvents
    .filter(e => e.chapterId === currentChapterId)
    .sort((a, b) => a.order - b.order)
    .map(e => `- ${e.title}: ${e.description}`)
    .join("\n");
  
  const chapterContext = previousChapters.map(c => `章节 ${c.order}: ${c.title}\n摘要: ${c.summary}\n内容: ${c.content.slice(-1000)}`).join("\n\n---\n\n");

  const linkedSettings = project.worldSettings.filter(s => currentChapter?.linkedContextIds?.includes(s.id));
  const linkedCharacters = project.characters.filter(c => currentChapter?.linkedContextIds?.includes(c.id));

  const linkedContext = linkedSettings.length > 0 || linkedCharacters.length > 0 ? `
当前场景重点关注的上下文 (请务必在创作中体现这些元素):
${linkedSettings.map(s => `- [设定] ${s.title}: ${s.content}`).join("\n")}
${linkedCharacters.map(c => `- [角色] ${c.name}: ${c.description} (Traits: ${c.traits.join(", ")})`).join("\n")}
` : "";

  const systemInstruction = `
你是一位专业的小说作家。
你的目标是帮助用户创作他们的小说《${project.title}》。

世界观设定:
${worldContext}

人物设定:
${characterContext}

写作规则 (请严格遵守):
${rulesContext}
${linkedContext}

前情提要 (全局剧情回顾):
${storyRecap}

大纲 (本章情节事件):
${plotEventsContext || "本章尚未定义具体情节事件。"}

最近章节回顾:
${chapterContext}

当前章节: ${currentChapter?.title || "新章节"}
当前内容: ${currentChapter?.content || ""}

指令:
${instruction}

请确保生成的内容严格遵循上述的世界观设定、人物设定、写作规则，尤其是大纲中提供的情节和前情提要。
`;

  return callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    prompt,
    systemInstruction,
    project.aiConfig?.temperature ?? 0.8
  );
}

export async function expandChapterContent(
  project: NovelProject,
  currentChapterId: string,
  draft: string
) {
  const currentChapter = project.chapters.find(c => c.id === currentChapterId);
  const previousChapters = project.chapters
    .filter(c => c.order < (currentChapter?.order || 0))
    .sort((a, b) => a.order - b.order)
    .slice(-3);

  const worldContext = project.worldSettings.map(s => `${s.title}: ${s.content}`).join("\n\n");
  const characterContext = project.characters.map(c => `${c.name}: ${c.description} (Traits: ${c.traits.join(", ")})`).join("\n\n");
  const rulesContext = project.writingRules.filter(r => r.isActive).map(r => r.rule).join("\n");
  const storyRecap = project.storyRecap || "无";
  
  const chapterContext = previousChapters.map(c => `章节 ${c.order}: ${c.title}\n摘要: ${c.summary}\n内容: ${c.content.slice(-1000)}`).join("\n\n---\n\n");

  const linkedSettings = project.worldSettings.filter(s => currentChapter?.linkedContextIds?.includes(s.id));
  const linkedCharacters = project.characters.filter(c => currentChapter?.linkedContextIds?.includes(c.id));

  const linkedContext = linkedSettings.length > 0 || linkedCharacters.length > 0 ? `
当前场景重点关注的上下文 (请务必在创作中体现这些元素):
${linkedSettings.map(s => `- [设定] ${s.title}: ${s.content}`).join("\n")}
${linkedCharacters.map(c => `- [角色] ${c.name}: ${c.description} (Traits: ${c.traits.join(", ")})`).join("\n")}
` : "";

  const systemInstruction = `
你是一位专业的小说作家。
你的目标是帮助用户创作他们的小说《${project.title}》。
你需要根据用户提供的“章节大纲/核心情节”扩写出完整、生动、细节丰富的章节内容。

世界观设定:
${worldContext}

人物设定:
${characterContext}

写作规则 (请严格遵守):
${rulesContext}
${linkedContext}

前情提要 (全局剧情回顾):
${storyRecap}

最近章节回顾:
${chapterContext}

当前章节: ${currentChapter?.title || "新章节"}
当前已有内容 (如果有): ${currentChapter?.content || "无"}

请确保扩写的内容:
1. 严格遵循上述的世界观设定、人物设定和写作规则。
2. 结合前情提要，保持剧情连贯，不出现逻辑错误或错觉。
3. 语言生动，描写细腻，符合小说的整体风格。
4. 仅仅输出扩写后的小说正文内容，不要包含任何解释、分析或多余的对话。
`;

  const prompt = `
请根据以下大纲/核心情节，为当前章节扩写出完整的正文内容：

【章节大纲/核心情节】
${draft}

如果当前章节已有内容，请自然地接续已有内容进行扩写；如果当前章节为空，请从头开始写。
`;

  return callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    prompt,
    systemInstruction,
    project.aiConfig?.temperature ?? 0.8
  );
}

export async function generateInspiration(project: NovelProject, type: 'plot' | 'character' | 'world') {
  const worldContext = project.worldSettings.map(s => `${s.title}: ${s.content}`).join("\n\n");
  const characterContext = project.characters.map(c => `${c.name}: ${c.description}`).join("\n\n");
  
  const typeLabels = {
    plot: '剧情灵感',
    character: '人物灵感',
    world: '世界观灵感'
  };

  const systemInstruction = `
你是一位充满创意的文学顾问。你的任务是为作者提供${typeLabels[type]}。
请结合现有的世界观和人物设定，提供3-5个新颖、有趣且具有冲突感的创意点。

现有世界观:
${worldContext}

现有角色:
${characterContext}
`;

  return callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    `请为我提供一些${typeLabels[type]}。`,
    systemInstruction,
    0.9
  );
}

export async function checkConsistency(project: NovelProject) {
  const worldContext = project.worldSettings.map(s => `${s.title}: ${s.content}`).join("\n\n");
  const characterContext = project.characters.map(c => `${c.name}: ${c.description}`).join("\n\n");
  const chaptersContext = project.chapters
    .sort((a, b) => a.order - b.order)
    .map(c => `章节 ${c.order} [${c.title}]:\n摘要: ${c.summary}\n内容片段: ${c.content.slice(0, 500)}...`)
    .join("\n\n---\n\n");

  const systemInstruction = `
你是一位资深的小说编辑。你的任务是检查这部小说的内容连贯性。
请根据提供的世界观、人物设定和已有的章节内容，分析是否存在逻辑漏洞、人物性格走样、设定冲突或剧情断层。

世界观设定:
${worldContext}

人物设定:
${characterContext}

章节内容回顾:
${chaptersContext}

请以专业的角度提供一份简洁的连贯性检查报告，指出潜在问题并给出改进建议。
`;

  return callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    "请对我的小说进行连贯性检查。",
    systemInstruction,
    0.7
  );
}

export async function generateWorldSetting(project: NovelProject, title: string, currentContent: string) {
  const systemInstruction = `你是一位充满想象力的世界构建师。你的任务是帮助作者完善小说《${project.title}》的世界设定。`;
  const prompt = `
现有世界观概览:
${project.worldSettings.map(s => `- ${s.title}: ${s.content}`).join("\n")}

当前正在完善的设定标题: ${title}
当前内容: ${currentContent || "无"}

请根据现有世界观，为这个特定设定提供详细、生动且具有逻辑自洽性的补充内容。
`;
  return callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    prompt,
    systemInstruction,
    project.aiConfig?.temperature ?? 0.8
  );
}

export async function generateCharacter(project: NovelProject, name: string, currentDescription: string) {
  const systemInstruction = `你是一位擅长塑造深刻人物的小说家。你的任务是帮助作者完善小说《${project.title}》中的人物档案。`;
  const prompt = `
现有世界观:
${project.worldSettings.map(s => `- ${s.title}: ${s.content}`).join("\n")}

当前正在完善的人物姓名: ${name}
当前描述: ${currentDescription || "无"}

请根据世界观设定，为这个角色提供深刻的背景故事、性格动机、外貌特征或潜在冲突。
`;
  return callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    prompt,
    systemInstruction,
    project.aiConfig?.temperature ?? 0.8
  );
}

export async function generateWritingRule(project: NovelProject, name: string, currentRule: string) {
  const systemInstruction = `你是一位专业的文学导师。你的任务是帮助作者制定小说《${project.title}》的写作规则。`;
  const prompt = `
小说标题: ${project.title}
当前规则名称: ${name}
当前描述: ${currentRule || "无"}

请为这条写作规则提供具体、可操作的建议，帮助作者提升文笔或保持风格一致性。
`;
  return callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    prompt,
    systemInstruction,
    project.aiConfig?.temperature ?? 0.7
  );
}

export async function optimizePrompt(prompt: string, model: string = "gemini-3-flash-preview") {
  const systemInstruction = "你是一位专业的 AI 提示词工程师。你的任务是优化用户的小说创作提示词，使其更具体、更有启发性，从而让 AI 生成更高质量的内容。";
  const userPrompt = `请优化以下小说创作提示词，使其包含更多关于语气、风格、感官细节或情节走向的描述。直接返回优化后的提示词，不要有其他解释：\n\n${prompt}`;
  
  return callAI(model, userPrompt, systemInstruction, 0.7);
}

export async function planNextChapter(project: NovelProject, currentChapterId: string) {
  const currentChapter = project.chapters.find(c => c.id === currentChapterId);
  const worldContext = project.worldSettings.map(s => `${s.title}: ${s.content}`).join("\n");
  const characterContext = project.characters.map(c => `${c.name}: ${c.description}`).join("\n");

  const systemInstruction = `
你是一位专业的小说策划。你的任务是根据当前章节的内容，规划下一章的走向。
请分析当前剧情，提出下一章的标题、摘要，并识别出剧情中可能出现但尚未建立档案的新角色。

输出格式必须为 JSON:
{
  "nextChapterTitle": "章节标题",
  "nextChapterSummary": "章节摘要",
  "newCharacters": [
    { "name": "角色姓名", "description": "角色简要描述" }
  ]
}
`;

  const prompt = `
小说标题: ${project.title}
世界观: ${worldContext}
现有角色: ${characterContext}

当前章节: ${currentChapter?.title}
当前内容: ${currentChapter?.content}

请规划下一章。
`;

  const response = await callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    prompt,
    systemInstruction,
    project.aiConfig?.temperature ?? 0.7
  );
  try {
    // Extract JSON from response (handling potential markdown blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("无法解析 AI 返回的规划数据");
  } catch (e) {
    console.error("AI Planning Error:", e);
    return null;
  }
}

export async function summarizeChapter(content: string, model: string = "gemini-3-flash-preview") {
  const systemInstruction = "你是一位擅长总结小说章节的资深编辑。";
  const prompt = `请用2-3句话总结以下小说章节内容，重点关注关键情节发展和人物变化：\n\n${content}`;
  
  return callAI(model, prompt, systemInstruction, 0.5);
}
