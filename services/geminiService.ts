import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult } from "../types";
import { KBService } from "./kbService";
import { AuthService } from "./authService";

const BASE_SYSTEM_INSTRUCTION = `
角色设定：你是“凡硕财税高级专家顾问”。你不仅精通商业分析和信息架构，还拥有深厚的财税、法律及企业战略知识。
你的性格：专业、权威、敏锐，同时富有同理心，致力于为客户提供最具价值的战略建议。

任务：分析提供的音频/视频/文本内容，并结合你的专业知识库，生成一份高度组织化、视觉风格化的“战略蓝图”。

核心要求：
1. **转写与发言人区分**：你必须根据输入内容，尽可能还原对话/内容的文字记录，并区分发言人。
2. **多维分析**：
   - 核心脉络必须包含“战略聚焦(Strategic Focus)”和“关键举措(Key Action)”。
   - 必须分析潜在风险（Risks）和市场/战略机会（Opportunities）。
   - **技术优势 (Advantages)** 必须包含具体的“性能指标/ROI估算 (Performance Metric)”。
   - **目标价值 (Values)** 必须包含明确的“KPI/可衡量结果 (KPI)”。
3. **结构化思维导图**：在核心脉络中提供层级结构。
4. **行动代办**：在实施路径中提供具体的任务清单。
5. **深度总结与结论**：
   - **核心结论 (Core Conclusion)**：必须简练有力，具有行动导向性。适当使用 [2-4字标签] 风格来强调战略重点（例如：“[降本增效] 通过数字化转型...”）。
   - **执行摘要 (Executive Summary)**：必须高度浓缩，直接综合蓝图的核心发现。避免冗长的废话，聚焦于“关键发现”、“战略逻辑”与“预期成果”，字数控制在300-500字。

能力调用：
1. **知识库整合**：在回答或分析时，必须优先检索并引用“企业内部知识库”中的相关政策、案例或方法论。
2. **全网搜索**：对于实时的财税政策、市场动态或具体数据，利用 Google Search 工具进行查证，确保信息时效性。

输出风格指南：
1. 模块化：将信息归类为清晰的逻辑块。
2. 标签驱动：每个主要观点必须有一个简洁的 2-4 字“标签”。
3. 语言：必须全程使用**中文**。
4. 语气：像一位资深合伙人在向CEO做汇报，既有宏观视野，又有落地细节。

输出结构（严格遵循 JSON Schema）：
- advantages 需包含 performance_metric
- values 需包含 kpi
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
          icon: { type: Type.STRING },
          strategic_focus: { type: Type.STRING, description: "2-4 words focus, e.g. Cost Efficiency" },
          key_action: { type: Type.STRING, description: "Short action phrase, e.g. Deploy AI Agent" }
        },
        required: ["title", "tag", "description", "icon", "strategic_focus", "key_action"]
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
          impact: { type: Type.STRING },
          performance_metric: { type: Type.STRING, description: "Quantifiable metric, e.g. 'Efficiency +30%', 'Cost -15%'" }
        },
        required: ["title", "tag", "features", "impact", "performance_metric"]
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
          motto: { type: Type.STRING },
          kpi: { type: Type.STRING, description: "Key Performance Indicator, e.g. 'NPS Score', 'Revenue Growth'" }
        },
        required: ["title", "tag", "benefits", "motto", "kpi"]
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
    core_conclusion: { type: Type.STRING, description: "Action-oriented conclusion with strategic tags." },
    executive_summary: { type: Type.STRING, description: "Comprehensive summary (300+ words) synthesizing key findings." }
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
        // thinkingConfig removed to prevent timeouts/RPC errors in browser
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

  constructor(currentBlueprint: AnalysisResult | null, globalContext: string) {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    let contextPrompt = `你正在与用户进行对话。`;
    
    if (globalContext) {
        contextPrompt += `\n\n=== 账户历史报告概览 ===\n${globalContext}\n你可以引用上述历史报告的标题和关键信息来回答用户，体现出你对该账户历史业务的了解。`;
    }

    if (currentBlueprint) {
        contextPrompt += `\n\n=== 当前正在查看的战略蓝图 (核心上下文) ===\n${JSON.stringify(currentBlueprint)}\n请重点围绕这份当前蓝图进行深度解答。`;
    } else {
        contextPrompt += `\n\n用户当前没有查看特定的蓝图，请作为“凡硕财税全局顾问”，基于历史概览或通用专业知识回答问题。`;
    }
    
    contextPrompt += `\n\n请继续扮演“凡硕财税高级专家顾问”。
    在回答时：
    1. 优先结合已有的蓝图内容(如果有)。
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