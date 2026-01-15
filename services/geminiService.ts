import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult } from "../types";
import { KBService } from "./kbService";
import { AuthService } from "./authService";

const BASE_SYSTEM_INSTRUCTION = `
角色设定：你是“凡硕财税高级专家顾问”。你不仅精通商业分析和信息架构，还拥有深厚的财税、法律及企业战略知识。
你的性格：专业、权威、敏锐，同时富有同理心，致力于为客户提供最具价值的战略建议。

任务：分析提供的音频/视频/文本内容，并结合你的专业知识库，生成一份高度组织化、视觉风格化的“战略蓝图”。

重要新增要求：
1. **转写与发言人区分**：你必须根据输入内容，尽可能还原对话/内容的文字记录，并区分发言人。
2. **多维分析**：除了核心脉络，必须分析潜在风险（Risks）和市场/战略机会（Opportunities）。
3. **结构化思维导图**：在核心脉络中提供层级结构。
4. **行动代办**：在实施路径中提供具体的任务清单。
5. **总结升华**：报告最后提供一段执行摘要（Executive Summary）。

能力调用：
1. **知识库整合**：在回答或分析时，必须优先检索并引用“企业内部知识库”中的相关政策、案例或方法论。
2. **全网搜索**：对于实时的财税政策、市场动态或具体数据，利用 Google Search 工具进行查证，确保信息时效性。

输出风格指南：
1. 模块化：将信息归类为清晰的逻辑块。
2. 标签驱动：每个主要观点必须有一个简洁的 2-4 字“标签”。
3. 语言：必须全程使用**中文**。
4. 语气：像一位资深合伙人在向CEO做汇报，既有宏观视野，又有落地细节。

输出结构（严格遵循 JSON Schema）：
- transcript_segments: 对话原文片段。
- key_quotes: 3-5个关键金句。
- main_title: 主题标题
- subtitle: 一句话总结
- core_veins: 3个核心发展脉络
- implementation_paths: 3个关键实施路径
- advantages: 3个技术/运营优势
- values: 3个目标与价值
- risks: 3个潜在风险及应对
- opportunities: 3个战略机会
- core_conclusion: 核心结论（金句）
- executive_summary: 全文总结段落（200字左右）
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    main_title: { type: Type.STRING, description: "Main topic title in Chinese" },
    subtitle: { type: Type.STRING, description: "One sentence summary in Chinese" },
    transcript_segments: {
        type: Type.ARRAY,
        description: "Extracted transcript segments with speaker differentiation.",
        items: {
            type: Type.OBJECT,
            properties: {
                speaker: { type: Type.STRING },
                text: { type: Type.STRING },
                timestamp: { type: Type.STRING }
            },
            required: ["speaker", "text"]
        }
    },
    key_quotes: {
        type: Type.ARRAY,
        description: "List of 3-5 powerful quotes from the text.",
        items: { type: Type.STRING }
    },
    core_veins: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          tag: { type: Type.STRING },
          description: { type: Type.STRING },
          icon: { type: Type.STRING }
        },
        required: ["title", "tag", "description", "icon"]
      }
    },
    implementation_paths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          tag: { type: Type.STRING },
          points: { type: Type.ARRAY, items: { type: Type.STRING } },
          bottom_line: { type: Type.STRING }
        },
        required: ["title", "tag", "points", "bottom_line"]
      }
    },
    advantages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          tag: { type: Type.STRING },
          features: { type: Type.ARRAY, items: { type: Type.STRING } },
          impact: { type: Type.STRING }
        },
        required: ["title", "tag", "features", "impact"]
      }
    },
    values: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          tag: { type: Type.STRING },
          benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
          motto: { type: Type.STRING }
        },
        required: ["title", "tag", "benefits", "motto"]
      }
    },
    risks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          mitigation: { type: Type.STRING }
        },
        required: ["title", "severity", "mitigation"]
      }
    },
    opportunities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["title", "description"]
      }
    },
    core_conclusion: { type: Type.STRING },
    executive_summary: { type: Type.STRING }
  },
  required: ["main_title", "subtitle", "transcript_segments", "key_quotes", "core_veins", "implementation_paths", "advantages", "values", "risks", "opportunities", "core_conclusion", "executive_summary"]
};

const getApiKey = (): string => {
  const customKey = localStorage.getItem('fs_custom_api_key');
  if (customKey && customKey.trim().length > 0) {
    return customKey;
  }
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }
  throw new Error("API Key 未配置。请联系管理员在设置中配置 Gemini API Key。");
};

const fileToPart = async (file: File): Promise<{ inlineData?: { mimeType: string; data: string }; text?: string }> => {
  return new Promise((resolve, reject) => {
    if (file.type === 'text/plain' || file.type === 'text/markdown' || file.type === 'text/csv' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (e) => {
             resolve({ text: e.target?.result as string });
        };
        reader.onerror = reject;
        reader.readAsText(file);
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getFullSystemInstruction = () => {
    const kbContext = KBService.getContextString();
    if (!kbContext) return BASE_SYSTEM_INSTRUCTION;
    return `${BASE_SYSTEM_INSTRUCTION}\n\n=== 凡硕内部知识库 (高优先级) ===\n${kbContext}\n==============================`;
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export const generateBlueprint = async (input: string | File[]): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  try {
    let contents;

    if (Array.isArray(input)) {
       const parts = await Promise.all(input.map(f => fileToPart(f)));
       contents = {
         parts: [
           ...parts,
           { text: "请基于上述文件内容，结合知识库和实时搜索，生成一份详细的战略蓝图。请务必详细提取对话内容区分发言人。" }
         ]
       };
    } else {
      contents = { parts: [{ text: input }] };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: getFullSystemInstruction(),
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        tools: [{ googleSearch: {} }], 
        thinkingConfig: { thinkingBudget: 1024 } 
      },
    });

    const text = response.text;
    if (!text) throw new Error("无法生成响应，请检查输入或重试。");

    const promptLen = (typeof input === 'string' ? input.length : 1000) + getFullSystemInstruction().length;
    const outputLen = text.length;
    const totalTokens = estimateTokens(promptLen + outputLen);
    AuthService.recordTokenUsage(totalTokens);

    const user = AuthService.getCurrentUser();
    if (user && user.email) {
        AuthService.logActivity(user.email, `Blueprint Analysis Generated`);
    }
    
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export class BlueprintChatService {
  private chat: Chat;

  constructor(blueprint: AnalysisResult) {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    const contextPrompt = `你正在与用户讨论一份已生成的“战略蓝图”。
    蓝图内容如下：
    ${JSON.stringify(blueprint)}
    
    请继续扮演“凡硕财税高级专家顾问”。
    在回答时：
    1. 优先结合已有的蓝图内容。
    2. 检索内置知识库。
    3. 如果需要最新信息，使用 Google Search。
    `;

    this.chat = ai.chats.create({
      model: 'gemini-3-pro-preview', 
      config: {
        systemInstruction: getFullSystemInstruction() + "\n" + contextPrompt,
        tools: [{ googleSearch: {} }]
      }
    });
  }

  async sendMessageStream(message: string) {
    const user = AuthService.getCurrentUser();
    if (user && user.email) {
       AuthService.logActivity(user.email, `Chat: ${message.slice(0, 20)}...`);
       AuthService.recordTokenUsage(estimateTokens(message) + 100); 
    }
    return this.chat.sendMessageStream({ message });
  }
}