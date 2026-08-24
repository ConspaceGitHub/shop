import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { translateAuthError } from '../lib/authErrors';
import { AuthContext, type MemberProfile, type Role } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const loadMember = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('members')
      .select('id, name, phone, birthday, email')
      .eq('id', userId)
      .maybeSingle();

    return (data as MemberProfile | null) ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncProfile() {
      if (!session) {
        if (!cancelled) {
          setRole(null);
          setMember(null);
        }
        return;
      }

      const [{ data: profileData }, memberData] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle(),
        loadMember(session.user.id),
      ]);

      if (!cancelled) {
        setRole((profileData?.role as Role) ?? null);
        setMember(memberData);
      }
    }

    syncProfile();

    return () => {
      cancelled = true;
    };
  }, [session, loadMember]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? translateAuthError(error.message) : null };
  }

  async function signUpMember({
    email,
    password,
    name,
    phone,
    birthday,
  }: {
    email: string;
    password: string;
    name: string;
    phone: string;
    birthday: string;
  }) {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    if (!data.user || !data.session) {
      return { error: '註冊需要 Email 驗證，請聯絡網站管理員確認驗證設定是否已關閉。' };
    }

    const { error: memberError } = await supabase.from('members').insert({
      id: data.user.id,
      name,
      phone,
      birthday,
      email,
    });

    if (memberError) {
      return { error: '註冊會員資料時發生錯誤，請稍後再試' };
    }

    setSession(data.session);
    setMember({ id: data.user.id, name, phone, birthday, email });

    return { error: null };
  }

  async function refreshMember() {
    if (!session) return;
    const memberData = await loadMember(session.user.id);
    setMember(memberData);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, role, member, loading, signIn, signUpMember, signOut, refreshMember }}
    >
      {children}
    </AuthContext.Provider>
  );
}
