import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export type Role = 'admin' | 'staff' | null;

export interface AuthContextType {
  session: Session | null;
  role: Role;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
