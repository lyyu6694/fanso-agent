import { KnowledgeBaseItem } from "../types";
import { extractTextFromFile } from "../utils/fileParser";

const STORAGE_KEY_KB = "fs_knowledge_base";

export const KBService = {
  getAll: (): KnowledgeBaseItem[] => {
    const stored = localStorage.getItem(STORAGE_KEY_KB);
    return stored ? JSON.parse(stored) : [];
  },

  add: (title: string, content: string, type: 'text' | 'file' = 'text') => {
    const items = KBService.getAll();
    const currentSize = JSON.stringify(items).length;
    if (currentSize + content.length > 5 * 1024 * 1024) { // Increased limit slightly
      throw new Error("知识库存储空间不足，请删除旧文档后重试。");
    }

    const newItem: KnowledgeBaseItem = {
      id: Date.now().toString(),
      title,
      content,
      type,
      createdAt: Date.now()
    };
    items.push(newItem);
    localStorage.setItem(STORAGE_KEY_KB, JSON.stringify(items));
    return newItem;
  },

  update: (id: string, title: string, content: string) => {
    const items = KBService.getAll();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
        items[index] = { ...items[index], title, content, updatedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY_KB, JSON.stringify(items));
    }
  },

  addFromFile: async (file: File) => {
    // Re-use the robust fileParser
    const content = await extractTextFromFile(file);
    // If it's a native preview string (PDF/Audio/Video), we might not want it in KB text context
    // But KB is for text injection. So generally we only support text-extractable files here.
    if (content.includes("__PDF_NATIVE_PREVIEW__") || content.includes("__MEDIA_NATIVE_PREVIEW__")) {
        throw new Error("此文件类型不支持添加到知识库上下文（仅支持文本内容）。");
    }
    return KBService.add(file.name, content, 'file');
  },

  remove: (id: string) => {
    const items = KBService.getAll().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY_KB, JSON.stringify(items));
  },

  getContextString: (): string => {
    const items = KBService.getAll();
    if (items.length === 0) return "";
    
    return items.map(item => `
--- [知识库文档: ${item.title}] ---
${item.content.slice(0, 15000)} 
(文档截断...)
-------------------------------
`).join("\n");
  }
};