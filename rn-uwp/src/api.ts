export interface User {
  id: number;
  username: string;
  role: string;
  permissions: string[];
}

export async function login(username: string, password: string): Promise<{success: boolean; userId?: number; username?: string; role?: string; permissions?: string[]; error?: string;}> {
  if (username === 'admin' && password === 'admin') {
    return { success: true, userId: 1, username: 'admin', role: 'admin', permissions: ['*'] };
  }
  return { success: false, error: 'Invalid credentials' };
}

export async function initDatabase(): Promise<{success: boolean; error?: string;}> {
  return { success: true };
}

export async function testConnection(): Promise<{success: boolean; message?: string;}> {
  return { success: true, message: 'API OK' };
}

export async function getWindowsUsername(): Promise<{success: boolean; username?: string;}> {
  return { success: false };
}

export async function autoLoginWithWindows(username: string): Promise<{success: boolean; userId?: number; username?: string; role?: string; permissions?: string[];}> {
  return { success: false };
}
