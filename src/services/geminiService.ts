import { GoogleGenAI } from "@google/genai";
import { NovelProject, Chapter } from "../types";

async function callAI(model: string, prompt: string, systemInstruction: string, temperature: number = 0.7) {
  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        systemInstruction,
        temperature,
      }),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error ${response.status}`);
    }
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.text) throw new Error("AI 返回了空响应。");
    
    return data.text;
  } catch (error: any) {
    console.error("AI API Error:", error);
    throw new Error(error.message || "AI 调用失败");
  }
}

export async function generateNovelContent(
  project: NovelProject,
  currentChapterId: string,
  prompt: string,
  instruction: string = "根据提供的上下文继续故事。"
) {
  const currentChapter = project.chapters.find(c => c.id === currentChapterId);
  const pinnedChapters = project.chapters.filter(c => c.isPinnedForContext && c.id !== currentChapterId);
  const previousChapters = project.chapters
    .filter(c => c.order < (currentChapter?.order || 0) && !c.isPinnedForContext)
    .sort((a, b) => a.order - b.order)
    .slice(-2); // Get last 2 non-pinned chapters

  const allContextChapters = [...pinnedChapters, ...previousChapters].sort((a, b) => a.order - b.order);

  const worldContext = project.worldSettings.map(s => `${s.title}${s.isLocked ? ' [已锁定-严禁修改]' : ''}: ${s.content}`).join("\n\n");
  const characterContext = project.characters.map(c => `${c.name}${c.isLocked ? ' [已锁定-严禁修改]' : ''}: ${c.description} (Traits: ${c.traits.join(", ")})`).join("\n\n");
  const rulesContext = project.writingRules.filter(r => r.isActive).map(r => r.rule).join("\n");
  const storyRecap = project.storyRecap || "无";
  const plotEventsContext = project.plotEvents
    .filter(e => e.chapterId === currentChapterId)
    .sort((a, b) => a.order - b.order)
    .map(e => `- ${e.title}: ${e.description}`)
    .join("\n");
  
  const chapterContext = allContextChapters.map(c => `章节 ${c.order}: ${c.title}${c.isPinnedForContext ? ' [关键上下文]' : ''}\n摘要: ${c.summary}\n内容: ${c.content.slice(-1000)}`).join("\n\n---\n\n");

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

【核心准则：连贯性与一致性】
1. 严禁违反已有的世界观设定和人物设定。
2. 标注为 [已锁定] 的设定和人物是作者已经定稿的内容，你绝对不能在生成的内容中对其进行任何形式的修改或违背。
3. 如果你的创作灵感确实需要对某个设定进行微调，请在正文结束后，以【设定修改建议】的形式列出，并用红色字体（在 Markdown 中可以使用 <font color="red">内容</font>）标注，询问作者是否允许修改。
4. 确保情节与“前情提要”和“最近章节回顾”保持高度连贯。
5. 留意人物的性格特征（Traits），确保对话和行为符合其性格。
6. 如果之前的章节中提到了某个细节（如伤疤、物品、特定时间），请在后续创作中保持一致。

【输出格式要求】
你的输出必须包含两个部分：
1. <thought> 标签包裹的思考过程：简要说明你打算如何接续剧情、如何体现设定、以及你的创作思路。
2. 标签之后的小说正文内容。

【写作风格与纯净度要求 (极度重要)】
1. 语言必须干净、简短、洗练。
2. 正文的符号不要那么多，杜绝过度使用感叹号、省略号，避免任何 Markdown 加粗（**）或斜体（*）格式在正文中泛滥。
3. 绝对不要输出任何套话、问候语或解释（例如“好的，这是你要的内容”、“本章结束”、“希望能帮到你”等废话）。除了 <thought> 标签和正文外，不要输出任何多余的字符。

示例：
<thought>
我打算让主角在森林中遇到一个神秘的老人，通过老人的话语揭示世界观中的力量体系。
</thought>
主角走入密林。雾气渐浓，四周静谧无声。
前方一棵古树下，盘腿坐着一位老人。老人睁开眼，目光锐利。

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

关键章节及最近章节回顾:
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
  const pinnedChapters = project.chapters.filter(c => c.isPinnedForContext && c.id !== currentChapterId);
  const previousChapters = project.chapters
    .filter(c => c.order < (currentChapter?.order || 0) && !c.isPinnedForContext)
    .sort((a, b) => a.order - b.order)
    .slice(-2);

  const allContextChapters = [...pinnedChapters, ...previousChapters].sort((a, b) => a.order - b.order);

  const worldContext = project.worldSettings.map(s => `${s.title}${s.isLocked ? ' [已锁定-严禁修改]' : ''}: ${s.content}`).join("\n\n");
  const characterContext = project.characters.map(c => `${c.name}${c.isLocked ? ' [已锁定-严禁修改]' : ''}: ${c.description} (Traits: ${c.traits.join(", ")})`).join("\n\n");
  const rulesContext = project.writingRules.filter(r => r.isActive).map(r => r.rule).join("\n");
  const storyRecap = project.storyRecap || "无";
  
  const chapterContext = allContextChapters.map(c => `章节 ${c.order}: ${c.title}${c.isPinnedForContext ? ' [关键上下文]' : ''}\n摘要: ${c.summary}\n内容: ${c.content.slice(-1000)}`).join("\n\n---\n\n");

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

【核心准则：连贯性与一致性】
1. 严禁违反已有的世界观设定和人物设定。
2. 标注为 [已锁定] 的设定和人物是作者已经定稿的内容，你绝对不能在生成的内容中对其进行任何形式的修改或违背。
3. 如果你的创作灵感确实需要对某个设定进行微调，请在正文结束后，以【设定修改建议】的形式列出，并用红色字体（在 Markdown 中可以使用 <font color="red">内容</font>）标注，询问作者是否允许修改。
4. 确保情节与“前情提要”和“最近章节回顾”保持高度连贯。
5. 留意人物的性格特征（Traits），确保对话和行为符合其性格。
6. 保持文风一致，细节严谨。

【输出格式要求】
你的输出必须包含两个部分：
1. <thought> 标签包裹的思考过程：简要说明你打算如何扩写大纲、如何体现关联设定、以及你的创作思路。
2. 标签之后的小说正文内容。

【写作风格与纯净度要求 (极度重要)】
1. 语言必须干净、简短、洗练，描写生动但不冗余。
2. 正文的符号不要那么多，杜绝过度使用感叹号、省略号，避免任何 Markdown 加粗（**）或斜体（*）格式在正文中泛滥。
3. 绝对不要输出任何套话、问候语或解释（例如“好的，这是你要的内容”、“本章结束”、“希望能帮到你”等废话）。除了 <thought> 标签和正文外，不要输出任何多余的字符。

示例：
<thought>
我将详细描写主角在集市上的心理活动，并通过环境描写烘托出紧张的气氛。
</thought>
集市上人声鼎沸。主角走在石板路上，握紧了藏在袖中的卷轴。
远处的钟楼敲响了黄昏的第一声钟声。

世界观设定:
${worldContext}

人物设定:
${characterContext}

写作规则 (请严格遵守):
${rulesContext}
${linkedContext}

前情提要 (全局剧情回顾):
${storyRecap}

关键章节及最近章节回顾:
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

export async function generateGlobalRecap(project: NovelProject) {
  const chapterSummaries = project.chapters
    .sort((a, b) => a.order - b.order)
    .filter(c => c.summary)
    .map(c => `章节 ${c.order} [${c.title}]: ${c.summary}`)
    .join("\n");

  if (!chapterSummaries) return "目前尚无章节摘要，无法生成全局提要。";

  const systemInstruction = `你是一位专业的小说编辑。你的任务是将散乱的章节摘要整理成一份连贯、精炼的“前情提要”。
这份提要应该概述目前为止的主要剧情走向、关键人物变动以及重要的世界观揭示。
请确保语言流畅，逻辑清晰，适合作为后续创作的背景参考。`;

  const prompt = `以下是小说的章节摘要：\n\n${chapterSummaries}\n\n请根据这些摘要生成一份全局前情提要。`;

  return callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    prompt,
    systemInstruction,
    0.6
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

export async function generateWorldSetting(project: NovelProject, title: string, currentContent: string, category?: string) {
  const systemInstruction = `你是一位充满想象力的世界构建师。你的任务是帮助作者完善小说《${project.title}》的世界设定。`;
  const prompt = `
现有世界观概览:
${project.worldSettings.map(s => `- ${s.title} (${s.category || '未分类'}): ${s.content.slice(0, 200)}...`).join("\n")}

当前正在完善的设定标题: ${title}
设定类别: ${category || "未分类"}
当前内容: ${currentContent || "无"}

请根据现有世界观和该设定的类别，为这个特定设定提供详细、生动且具有逻辑自洽性的补充内容。
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

export async function extractCharactersFromChapter(project: NovelProject, chapterContent: string) {
  const systemInstruction = `
你是一位专业的小说编辑。你的任务是从提供的章节内容中识别并提取出所有出现的人物。
请分析人物的姓名、外貌特征、性格特点以及他们在该章节中的表现。

输出格式必须为 JSON 数组:
[
  { "name": "角色姓名", "description": "角色简要描述", "traits": ["性格标签1", "性格标签2"] }
]
`;

  const prompt = `
小说标题: ${project.title}
现有角色列表: ${project.characters.map(c => c.name).join(", ")}

章节内容:
${chapterContent}

请提取新角色或更新现有角色的信息。如果角色已在现有列表中，请根据本章内容提供其在该章节的表现描述。
`;

  const response = await callAI(
    project.aiConfig?.model || "gemini-3-flash-preview",
    prompt,
    systemInstruction,
    0.7
  );

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("无法解析 AI 返回的人物提取数据");
  } catch (e) {
    console.error("AI Character Extraction Error:", e);
    return [];
  }
}

export async function sendChatToAI(
  project: NovelProject,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  latestPrompt: string,
  currentChapterId?: string
) {
  const worldContext = project.worldSettings.map(s => `${s.title}: ${s.content}`).join("\n\n");
  const characterContext = project.characters.map(c => `${c.name}: ${c.description} (traits: ${c.traits.join(", ")})`).join("\n\n");
  const rulesContext = project.writingRules.filter(r => r.isActive).map(r => r.rule).join("\n");
  const storyRecap = project.storyRecap || "无";
  
  const currentChapter = currentChapterId ? project.chapters.find(c => c.id === currentChapterId) : null;
  const recentChapters = project.chapters
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(-3)
    .map(c => `章节 ${c.order} [${c.title}]:\n摘要: ${c.summary}\n内容: ${c.content.slice(-800)}`)
    .join("\n\n");

  const historyString = chatHistory
    .slice(-8) // keep last 8 messages for context window efficiency
    .map(m => `${m.role === 'user' ? '用户' : '创作助手'}: ${m.content}`)
    .join("\n\n");

  const systemInstruction = `
你是一位顶级的小说大纲策划、编剧大师和文学写作助理。
你的目标是与作者（用户）共同探讨和创作小说《${project.title}》。

作者可以向你咨询角色发展、大纲设计、逻辑校验，或者直接指令你“续写一个片段”、“将选中的文字重写/润色”等。
你可以随时审阅小说的全部创作档案：
- 【世界观设定】：
${worldContext || "暂无定义设定"}
- 【重要人物列表】：
${characterContext || "暂无角色档案"}
- 【写作规则修辞约束】：
${rulesContext || "无特殊约束，请自由发挥，语言干净生动"}
- 【全局剧情提要（前情回顾）】：
${storyRecap}
- 【最近写完的几个章节概要与内容】：
${recentChapters || "当前正在创作第一章"}

【当前正在撰写的章节】：
- 【章节标题】：${currentChapter?.title || "未开始新章节"}
- 【正文内容】：
${currentChapter?.content || "（章节正文目前为空，你可以建议从开头开始写起）"}

【输出格式控制（极其重要）】
无论用户是向你闲聊询问、探求大纲逻辑，还是直接让你写小说段落，你的回答都必须严格遵照以下格式。
在每次回复的最前方，你必须用 <thought> 标签包裹你的【深度构思本能（思考过程）】，在这个标签中，用1-2段洗练、有说服力的语言探讨你此时在人设立场、伏笔安排、冲突张力上的运笔考量。
在 </thought> 标签闭合之后，输出你对用户的正式回应，不带任何客套的多余废话。

格式范例：
<thought>
用户指令继续写男主和女主的林中雪夜温存。在人设方面，男主性格傲娇但内心温柔，女主则直白单纯。
接下来，我将通过“林中雪景的清冷”与“篝火与主角眼神的温热”作对比，着墨两人的眼神博弈和动作交互，避免滥俗陈设。
</thought>
大雪初霁，篝火毕剥作响。男主坐在一根枯木上...
`;

  const prompt = `
【之前的对话历史】：
${historyString || "（新对话开始）"}

【新消息】：
用户：${latestPrompt}

请策划大纲、背景或写作文字，先进行深度思考 <thought> ... </thought>，再输出最终应答正文：
`;

  return callAI(
    project.aiConfig?.model || "gemini-3.5-flash",
    prompt,
    systemInstruction,
    project.aiConfig?.temperature ?? 0.8
  );
}

