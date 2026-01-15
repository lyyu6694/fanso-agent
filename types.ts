
export interface CoreVein {
  title: string;
  tag: string;
  description: string;
  icon: string;
  strategic_focus: string; // New: e.g., "Cost Reduction", "Market Share"
  key_action: string;      // New: e.g., "Automate Workflow"
}

export interface ImplementationPath {
  title: string;
  tag: string;
  points: string[];
  bottom_line: string;
}

export interface Advantage {
  title: string;
  tag: string;
  features: string[];
  impact: string;
}

export interface Value {
  title: string;
  tag: string;
  benefits: string[];
  motto: string;
}

export interface Risk {
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  mitigation: string;
}

export interface Opportunity {
  title: string;
  description: string;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp?: string; 
}

export interface AnalysisResult {
  main_title: string;
  subtitle: string;
  transcript_segments: TranscriptSegment[];
  key_quotes: string[];
  core_veins: CoreVein[];
  implementation_paths: ImplementationPath[];
  advantages: Advantage[];
  values: Value[];
  risks: Risk[]; 
  opportunities: Opportunity[]; 
  core_conclusion: string;
  executive_summary: string; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  feedback?: 'like' | 'dislike';
  feedbackText?: string;
}

export interface HistoryItem {
  id: string;
  date: number;
  result: AnalysisResult;
  chatHistory?: ChatMessage[];
}

// --- Auth & Settings Types ---

export interface InvitationCode {
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  isUsed: boolean;
  usedByEmail?: string;
  durationDays: number;
}

export interface User {
  username: string;
  email?: string;
  password?: string;
  role: 'admin' | 'user';
  isLoggedIn: boolean;
  associatedCode?: string;
  registeredAt?: number;
}

export interface AppSettings {
  customApiKey?: string;
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'file';
  createdAt: number;
  updatedAt?: number;
}

// --- Dashboard Types ---

export interface TokenUsageRecord {
  date: string;
  tokens: number;
}

export interface UserActivity {
  id: string;
  userEmail: string;
  action: string;
  timestamp: number;
}

export interface UserStat {
  email: string;
  nickname: string;
  requestCount: number;
}