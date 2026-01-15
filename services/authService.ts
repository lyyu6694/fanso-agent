import { InvitationCode, User, TokenUsageRecord, UserActivity, UserStat } from "../types";

const ADMIN_PASSWORD = "admin"; 
const STORAGE_KEY_CODES = "fs_invitation_codes";
const STORAGE_KEY_USERS = "fs_registered_users"; // New: Persistent users DB
const STORAGE_KEY_CURRENT_USER = "fs_current_user";
const STORAGE_KEY_TOKEN_STATS = "fs_token_stats";
const STORAGE_KEY_ACTIVITY = "fs_activity_log";

const generateRandomCode = (length: number = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const AuthService = {
  // --- Admin: Codes ---
  
  verifyAdminPassword: (password: string): boolean => {
    return password === ADMIN_PASSWORD;
  },

  generateInvitationCode: (daysValid: number = 7): InvitationCode => {
    const codes = AuthService.getCodes();
    const newCode: InvitationCode = {
      code: generateRandomCode(32),
      createdBy: 'admin',
      createdAt: Date.now(),
      expiresAt: Date.now() + daysValid * 24 * 60 * 60 * 1000,
      isUsed: false,
      durationDays: daysValid
    };
    
    codes.push(newCode);
    localStorage.setItem(STORAGE_KEY_CODES, JSON.stringify(codes));
    AuthService.logActivity('admin', 'Generated Code');
    return newCode;
  },

  getCodes: (): InvitationCode[] => {
    const stored = localStorage.getItem(STORAGE_KEY_CODES);
    return stored ? JSON.parse(stored) : [];
  },

  renewCode: (codeStr: string, days: number) => {
    const codes = AuthService.getCodes();
    const updatedCodes = codes.map(c => {
        if (c.code === codeStr) {
            return { 
                ...c, 
                expiresAt: Date.now() + days * 24 * 60 * 60 * 1000,
                durationDays: days // Update default duration
            };
        }
        return c;
    });
    localStorage.setItem(STORAGE_KEY_CODES, JSON.stringify(updatedCodes));
    AuthService.logActivity('admin', `Renewed code ${codeStr.slice(0,4)}...`);
  },

  deleteCode: (codeStr: string) => {
    const codes = AuthService.getCodes().filter(c => c.code !== codeStr);
    localStorage.setItem(STORAGE_KEY_CODES, JSON.stringify(codes));
  },

  // --- Auth: Verification & Registration ---

  validateInvitationCode: (inputCode: string): { valid: boolean; message?: string } => {
    const codes = AuthService.getCodes();
    const code = codes.find(c => c.code === inputCode);

    if (!code) return { valid: false, message: "无效的邀请码" };
    if (Date.now() > code.expiresAt) return { valid: false, message: "邀请码已过期" };
    if (code.isUsed) return { valid: false, message: "邀请码已被绑定" };
    
    return { valid: true };
  },

  registerUser: (inputCode: string, nickname: string, email: string, password: string): User => {
    // 1. Mark code as used
    const codes = AuthService.getCodes();
    const updatedCodes = codes.map(c => c.code === inputCode ? { ...c, isUsed: true, usedByEmail: email } : c);
    localStorage.setItem(STORAGE_KEY_CODES, JSON.stringify(updatedCodes));

    // 2. Create User
    const users = AuthService.getRegisteredUsers();
    if (users.find(u => u.email === email)) {
        throw new Error("该邮箱已被注册");
    }

    const newUser: User = {
        username: nickname,
        email,
        password, // In real app, hash this!
        role: 'user',
        isLoggedIn: true,
        associatedCode: inputCode,
        registeredAt: Date.now()
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    
    // 3. Login
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(newUser));
    AuthService.logActivity(email, 'User Registered');
    return newUser;
  },

  loginWithEmail: (email: string, password: string): User => {
    const users = AuthService.getRegisteredUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error("邮箱或密码错误");
    
    // Check if associated code is still valid? (Optional business logic, skipping for better UX)
    const activeUser = { ...user, isLoggedIn: true };
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(activeUser));
    AuthService.logActivity(email, 'User Login');
    return activeUser;
  },

  getRegisteredUsers: (): User[] => {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    return stored ? JSON.parse(stored) : [];
  },

  loginAdmin: () => {
    const admin: User = { username: "Administrator", role: "admin", isLoggedIn: true, email: "admin@fs.com" };
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(admin));
    return admin;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  },

  // --- Stats & Dashboard ---

  recordTokenUsage: (tokens: number) => {
    const stored = localStorage.getItem(STORAGE_KEY_TOKEN_STATS);
    const stats: TokenUsageRecord[] = stored ? JSON.parse(stored) : [];
    const today = new Date().toISOString().split('T')[0];
    
    const existingEntry = stats.find(s => s.date === today);
    if (existingEntry) {
        existingEntry.tokens += tokens;
    } else {
        stats.push({ date: today, tokens });
    }
    // Keep last 30 days
    if (stats.length > 30) stats.shift();
    localStorage.setItem(STORAGE_KEY_TOKEN_STATS, JSON.stringify(stats));
  },

  getTokenStats: (): TokenUsageRecord[] => {
      const stored = localStorage.getItem(STORAGE_KEY_TOKEN_STATS);
      return stored ? JSON.parse(stored) : [];
  },

  logActivity: (userEmail: string, action: string) => {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      const logs: UserActivity[] = stored ? JSON.parse(stored) : [];
      logs.unshift({
          id: Date.now().toString(),
          userEmail,
          action,
          timestamp: Date.now()
      });
      // Limit logs
      const trimmed = logs.slice(0, 100);
      localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(trimmed));
  },

  getActivityLog: (): UserActivity[] => {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      return stored ? JSON.parse(stored) : [];
  },

  getUserStats: (): UserStat[] => {
      // Mocking request count from activity log for demo
      const logs = AuthService.getActivityLog();
      const users = AuthService.getRegisteredUsers();
      
      return users.map(u => {
          const count = logs.filter(l => l.userEmail === u.email && (l.action.includes('Generate') || l.action.includes('Analysis'))).length;
          return {
              email: u.email || '',
              nickname: u.username,
              requestCount: count
          };
      }).sort((a, b) => b.requestCount - a.requestCount);
  }
};