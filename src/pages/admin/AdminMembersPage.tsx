import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminHeader from '../../components/AdminHeader';

interface MemberRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

function AdminMembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('id, name, email, phone, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setMembers((data as MemberRow[]) ?? []);
      }
      setLoading(false);
    }

    fetchMembers();
  }, []);

  const keyword = search.trim().toLowerCase();
  const filtered = keyword
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(keyword) ||
          m.email.toLowerCase().includes(keyword) ||
          m.phone.includes(keyword)
      )
    : members;

  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-xl font-bold text-forest-900">會員管理</h1>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋姓名 / Email / 電話"
            className="w-64 rounded-lg border border-forest-200 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none"
          />
        </div>

        {loading && <p className="p-10 text-center text-forest-500">載入中...</p>}
        {!loading && error && <p className="p-10 text-center text-red-500">讀取失敗：{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="rounded-xl border border-forest-100 bg-white p-10 text-center text-forest-500">
            {keyword ? '沒有符合搜尋的會員' : '目前還沒有會員'}
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((m) => (
              <Link
                key={m.id}
                to={`/admin/members/${m.id}`}
                className="flex items-center justify-between rounded-xl border border-forest-100 bg-white p-4 transition hover:shadow-sm"
              >
                <div>
                  <p className="font-medium text-forest-900">{m.name}</p>
                  <p className="text-sm text-forest-500">
                    {m.email} · {m.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-forest-400">
                  {new Date(m.created_at).toLocaleDateString('zh-TW')} 加入
                  <span className="text-forest-300">›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminMembersPage;
