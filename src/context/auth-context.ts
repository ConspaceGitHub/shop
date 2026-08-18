import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export type Role = 'admin' | 'staff' | null;

export interface MemberProfile {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  email: string;
}

export interface AuthContextType {
  session: Session | null;
  role: Role;
  member: MemberProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpMember: (params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    birthday: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
