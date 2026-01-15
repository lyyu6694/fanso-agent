import mammoth from 'mammoth';

export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.type;
  
  // 1. Plain Text / Markdown / CSV / JSON
  if (
    fileType === 'text/plain' || 
    fileType === 'text/markdown' || 
    fileType === 'text/csv' || 
    fileType === 'application/json' ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.txt')
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  // 2. DOCX (Word)
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
    file.name.endsWith('.docx')
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        mammoth.extractRawText({ arrayBuffer: arrayBuffer })
          .then((result: any) => resolve(result.value))
          .catch((err: any) => reject(err));
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }

  // 3. Audio / Video (Native Preview Hint)
  if (fileType.startsWith('audio/') || fileType.startsWith('video/')) {
    return "__MEDIA_NATIVE_PREVIEW__";
  }

  // 4. PDF (Native Preview Hint)
  if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
    return "__PDF_NATIVE_PREVIEW__";
  }

  return "不支持预览此文件格式，但AI可能可以直接读取。";
};