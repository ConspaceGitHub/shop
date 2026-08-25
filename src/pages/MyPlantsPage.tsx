import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import Header from '../components/Header';
import AccountSidebar from '../components/AccountSidebar';
import ImagePlaceholder from '../components/ImagePlaceholder';

const SALE_STATUSES = ['paid', 'shipped', 'completed'];

type EventType = 'watered' | 'fertilized' | 'repotted' | 'pruned' | 'pest_control' | 'note';

// 快速紀錄按鈕只放「實際動作」，觀察筆記走另一個輸入框（需要打字，不適合一鍵記錄）
const quickEventTypes: EventType[] = ['watered', 'fertilized', 'repotted', 'pruned', 'pest_control'];

const eventMeta: Record<EventType, { label: string; icon: string; actionLabel: string }> = {
  watered: { label: '澆水', icon: '💧', actionLabel: '記錄澆水' },
  fertilized: { label: '施肥', icon: '🌱', actionLabel: '記錄施肥' },
  repotted: { label: '換盆', icon: '🏺', actionLabel: '記錄換盆' },
  pruned: { label: '修剪', icon: '✂️', actionLabel: '記錄修剪' },
  pest_control: { label: '病蟲害處理', icon: '🐞', actionLabel: '記錄處理' },
  note: { label: '觀察筆記', icon: '📝', actionLabel: '新增筆記' },
};

const careTip: Record<string, string> = {
  easy: '土表乾了再澆水即可，約每 7–10 天一次；日照需求較低，新手也能養得好。',
  medium: '約每 5–7 天澆一次水，留意排水良好，避免長時間強烈日照直曬。',
  hard: '約每 3–5 天澆一次水，需要良好排水與充足日照，冬季要記得減少澆水頻率。',
};
const defaultCareTip = '依植物種類調整澆水頻率，土壤表面乾了再澆水最保險。';

// 用照顧難度估算「建議幾天內要澆一次水」，超過這個天數就顯示提醒
const wateringIntervalDays: Record<string, number> = { easy: 10, medium: 7, hard: 5 };
const defaultWateringIntervalDays = 7;

interface PlantProduct {
  id: string;
  name: string;
  careDifficulty: string | null;
  imageUrl: string | null;
}

interface LogEntry {
  id: string;
  event_type: EventType;
  logged_at: string;
  note: string | null;
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function daysAgoLabel(iso: string | null): string {
  if (!iso) return '尚未紀錄';
  const days = daysSince(iso);
  if (days <= 0) return '今天';
  return `${days} 天前`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function storagePathFromPlantPhotoUrl(photoUrl: string): string | null {
  const marker = '/plant-photos/';
  const idx = photoUrl.indexOf(marker);
  if (idx === -1) return null;
  return photoUrl.slice(idx + marker.length);
}

function safeFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx === -1) return '';
  const ext = fileName.slice(idx + 1).replace(/[^a-zA-Z0-9]/g, '');
  return ext ? `.${ext}` : '';
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

function CareLogCalendar({ logs }: { logs: LogEntry[] }) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const logsByDay = new Map<string, LogEntry[]>();
  for (const log of logs) {
    const key = dateKey(new Date(log.logged_at));
    const list = logsByDay.get(key) ?? [];
    list.push(log);
    logsByDay.set(key, list);
  }

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const selectedEntries = selectedDay ? (logsByDay.get(selectedDay) ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => {
            setMonthCursor(new Date(year, month - 1, 1));
            setSelectedDay(null);
          }}
          className="rounded px-2 py-0.5 text-forest-500 hover:bg-forest-50"
        >
          ‹
        </button>
        <span className="text-xs font-medium text-forest-700">
          {year}年{month + 1}月
        </span>
        <button
          onClick={() => {
            setMonthCursor(new Date(year, month + 1, 1));
            setSelectedDay(null);
          }}
          className="rounded px-2 py-0.5 text-forest-500 hover:bg-forest-50"
        >
          ›
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((w) => (
          <span key={w} className="text-[10px] text-forest-400">
            {w}
          </span>
        ))}

        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;
          const key = dateKey(date);
          const entries = logsByDay.get(key) ?? [];
          const hasEntries = entries.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;

          return (
            <button
              key={key}
              onClick={() => hasEntries && setSelectedDay(isSelected ? null : key)}
              disabled={!hasEntries}
              className={`flex h-8 flex-col items-center justify-center rounded-md text-[10px] transition ${
                isSelected
                  ? 'bg-forest-700 text-white'
                  : isToday
                    ? 'border border-forest-400 text-forest-800'
                    : hasEntries
                      ? 'bg-forest-50 text-forest-800 hover:bg-forest-100'
                      : 'text-forest-300'
              }`}
            >
              <span>{date.getDate()}</span>
              {hasEntries && (
                <span className="leading-none">
                  {Array.from(new Set(entries.map((e) => eventMeta[e.event_type].icon)))
                    .slice(0, 3)
                    .join('')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-2 space-y-1.5">
          {selectedEntries.map((entry) => (
            <div key={entry.id} className="rounded-lg bg-forest-50/60 px-3 py-1.5 text-xs">
              <div className="flex items-center justify-between text-forest-600">
                <span>
                  {eventMeta[entry.event_type].icon} {eventMeta[entry.event_type].label}
                </span>
                <span className="text-forest-400">{formatDateTime(entry.logged_at)}</span>
              </div>
              {entry.note && <p className="mt-0.5 text-forest-500">{entry.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyPlantsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [plants, setPlants] = useState<PlantProduct[]>([]);
  const [logsByProduct, setLogsByProduct] = useState<Map<string, LogEntry[]>>(new Map());
  const [customPhotos, setCustomPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const uploadingRef = useRef<Set<string>>(new Set());

  const [noteOpenFor, setNoteOpenFor] = useState<Set<string>>(new Set());
  const [noteDrafts, setNoteDrafts] = useState<Map<string, string>>(new Map());
  const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);
  const savingNoteRef = useRef<Set<string>>(new Set());
  const [historyOpenFor, setHistoryOpenFor] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      if (!session) return;
      setLoading(true);

      const { data: itemsData } = await supabase
        .from('order_items')
        .select(
          'product_id, orders!inner(user_id, status), products(id, name, care_difficulty, product_images(image_url, display_order))'
        )
        .eq('orders.user_id', session.user.id)
        .in('orders.status', SALE_STATUSES);

      type Row = {
        product_id: string;
        products: {
          id: string;
          name: string;
          care_difficulty: string | null;
          product_images: { image_url: string; display_order: number }[];
        } | null;
      };

      const rows = ((itemsData as unknown as Row[]) ?? []).filter((r) => r.products);
      const uniqueMap = new Map<string, PlantProduct>();
      for (const row of rows) {
        const p = row.products!;
        if (uniqueMap.has(p.id)) continue;
        const images = (p.product_images ?? []).slice().sort((a, b) => a.display_order - b.display_order);
        uniqueMap.set(p.id, {
          id: p.id,
          name: p.name,
          careDifficulty: p.care_difficulty,
          imageUrl: images[0]?.image_url ?? null,
        });
      }
      const uniquePlants = Array.from(uniqueMap.values());
      setPlants(uniquePlants);

      if (uniquePlants.length > 0) {
        const productIds = uniquePlants.map((p) => p.id);

        const [logsRes, photosRes] = await Promise.all([
          supabase
            .from('plant_care_logs')
            .select('id, product_id, event_type, logged_at, note')
            .eq('user_id', session.user.id)
            .in('product_id', productIds)
            .order('logged_at', { ascending: false }),
          supabase
            .from('member_plant_photos')
            .select('product_id, photo_url')
            .eq('user_id', session.user.id)
            .in('product_id', productIds),
        ]);

        const byProduct = new Map<string, LogEntry[]>();
        for (const log of (logsRes.data as Array<{
          id: string;
          product_id: string;
          event_type: EventType;
          logged_at: string;
          note: string | null;
        }>) ?? []) {
          const list = byProduct.get(log.product_id) ?? [];
          list.push({ id: log.id, event_type: log.event_type, logged_at: log.logged_at, note: log.note });
          byProduct.set(log.product_id, list);
        }
        setLogsByProduct(byProduct);

        const photos = new Map<string, string>();
        for (const row of (photosRes.data as Array<{ product_id: string; photo_url: string }>) ?? []) {
          photos.set(row.product_id, row.photo_url);
        }
        setCustomPhotos(photos);
      }

      setLoading(false);
    }

    load();
  }, [session]);

  function lastLoggedAt(productId: string, eventType: EventType): string | null {
    const list = logsByProduct.get(productId);
    if (!list) return null;
    return list.find((l) => l.event_type === eventType)?.logged_at ?? null;
  }

  async function handleLog(productId: string, eventType: EventType) {
    if (!session) return;
    const key = `${productId}:${eventType}`;
    if (savingKey === key) return;
    setSavingKey(key);

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('plant_care_logs')
      .insert({ user_id: session.user.id, product_id: productId, event_type: eventType, logged_at: nowIso })
      .select('id, event_type, logged_at, note')
      .single();

    setSavingKey(null);

    if (error || !data) {
      showToast('紀錄失敗，請稍後再試', 'error');
      return;
    }

    setLogsByProduct((prev) => {
      const next = new Map(prev);
      next.set(productId, [data as LogEntry, ...(next.get(productId) ?? [])]);
      return next;
    });
    showToast(`已記錄${eventMeta[eventType].label}`);
  }

  function toggleNoteForm(productId: string) {
    setNoteOpenFor((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleHistory(productId: string) {
    setHistoryOpenFor((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function handleSubmitNote(productId: string) {
    if (!session) return;
    const text = (noteDrafts.get(productId) ?? '').trim();
    if (!text) {
      showToast('請輸入筆記內容', 'error');
      return;
    }
    if (savingNoteRef.current.has(productId)) return;
    savingNoteRef.current.add(productId);
    setSavingNoteFor(productId);

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('plant_care_logs')
      .insert({ user_id: session.user.id, product_id: productId, event_type: 'note', logged_at: nowIso, note: text })
      .select('id, event_type, logged_at, note')
      .single();

    savingNoteRef.current.delete(productId);
    setSavingNoteFor(null);

    if (error || !data) {
      showToast('筆記新增失敗，請稍後再試', 'error');
      return;
    }

    setLogsByProduct((prev) => {
      const next = new Map(prev);
      next.set(productId, [data as LogEntry, ...(next.get(productId) ?? [])]);
      return next;
    });
    setNoteDrafts((prev) => new Map(prev).set(productId, ''));
    setNoteOpenFor((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    showToast('筆記已新增');
  }

  async function handlePhotoChange(productId: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !session) return;

    if (!file.type.startsWith('image/')) {
      showToast('請選擇圖片檔案', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('圖片檔案不能超過 5MB', 'error');
      return;
    }

    // Set 是同步鎖定，避免同一張卡片被連續選檔觸發多次上傳
    if (uploadingRef.current.has(productId)) return;
    uploadingRef.current.add(productId);
    setUploadingId(productId);

    const path = `${session.user.id}/${productId}-${crypto.randomUUID()}${safeFileExtension(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('plant-photos').upload(path, file);

    if (uploadError) {
      console.error('[plant photo] storage upload failed:', uploadError);
      showToast('照片上傳失敗，請稍後再試', 'error');
      uploadingRef.current.delete(productId);
      setUploadingId(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('plant-photos').getPublicUrl(path);
    const oldPhotoUrl = customPhotos.get(productId) ?? null;

    const { error: upsertError } = await supabase
      .from('member_plant_photos')
      .upsert(
        {
          user_id: session.user.id,
          product_id: productId,
          photo_url: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' }
      );

    if (upsertError) {
      console.error('[plant photo] db upsert failed:', upsertError);
      showToast('照片儲存失敗，請稍後再試', 'error');
      await supabase.storage.from('plant-photos').remove([path]);
      uploadingRef.current.delete(productId);
      setUploadingId(null);
      return;
    }

    if (oldPhotoUrl) {
      const oldPath = storagePathFromPlantPhotoUrl(oldPhotoUrl);
      if (oldPath) await supabase.storage.from('plant-photos').remove([oldPath]);
    }

    setCustomPhotos((prev) => new Map(prev).set(productId, publicUrlData.publicUrl));
    uploadingRef.current.delete(productId);
    setUploadingId(null);
    showToast('照片已更新');
  }

  async function handleRemovePhoto(productId: string) {
    const photoUrl = customPhotos.get(productId);
    if (!session || !photoUrl || uploadingRef.current.has(productId)) return;
    uploadingRef.current.add(productId);
    setUploadingId(productId);

    const { error } = await supabase
      .from('member_plant_photos')
      .delete()
      .eq('user_id', session.user.id)
      .eq('product_id', productId);

    if (error) {
      showToast('刪除失敗，請稍後再試', 'error');
    } else {
      const path = storagePathFromPlantPhotoUrl(photoUrl);
      if (path) await supabase.storage.from('plant-photos').remove([path]);
      setCustomPhotos((prev) => {
        const next = new Map(prev);
        next.delete(productId);
        return next;
      });
      showToast('已恢復預設照片');
    }

    uploadingRef.current.delete(productId);
    setUploadingId(null);
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header back={{ to: '/', label: '返回商品列表' }} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">我的植物照護紀錄</h1>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
          <AccountSidebar />

          <div className="min-w-0">
            {loading && <p className="text-center text-forest-500">載入中...</p>}

            {!loading && plants.length === 0 && (
              <div className="rounded-xl border border-forest-100 bg-white p-10 text-center">
                <p className="text-forest-500">你還沒有買過任何植物，開始你的第一盆吧</p>
                <Link
                  to="/"
                  className="mt-4 inline-block rounded-xl bg-forest-700 px-6 py-3 font-semibold text-white transition hover:bg-forest-800"
                >
                  去逛逛商品
                </Link>
              </div>
            )}

            {!loading && plants.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {plants.map((plant) => {
                  const photoUrl = customPhotos.get(plant.id) ?? plant.imageUrl;
                  const isUploading = uploadingId === plant.id;
                  const inputId = `plant-photo-input-${plant.id}`;

                  const lastWateredIso = lastLoggedAt(plant.id, 'watered');
                  const interval = wateringIntervalDays[plant.careDifficulty ?? ''] ?? defaultWateringIntervalDays;
                  const overdueDays = lastWateredIso ? daysSince(lastWateredIso) - interval : -1;
                  const isOverdue = overdueDays > 0;

                  const history = logsByProduct.get(plant.id) ?? [];
                  const isHistoryOpen = historyOpenFor.has(plant.id);
                  const isNoteOpen = noteOpenFor.has(plant.id);

                  return (
                    <div key={plant.id} className="rounded-xl border border-forest-100 bg-white p-5">
                      <div className="flex gap-3">
                        <div className="group relative h-20 w-20 shrink-0">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={plant.name}
                              className="h-20 w-20 rounded-lg border border-forest-100 object-cover"
                            />
                          ) : (
                            <ImagePlaceholder className="h-20 w-20 rounded-lg border border-forest-100" />
                          )}

                          <input
                            id={inputId}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => handlePhotoChange(plant.id, e)}
                          />
                          <label
                            htmlFor={inputId}
                            title="編輯我的照片"
                            className={`absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-forest-700 text-xs text-white shadow transition hover:bg-forest-800 ${
                              isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'
                            }`}
                          >
                            {isUploading ? '…' : '📷'}
                          </label>
                        </div>

                        <div className="min-w-0">
                          <Link
                            to={`/products/${plant.id}`}
                            className="font-display font-semibold text-forest-900 hover:underline"
                          >
                            {plant.name}
                          </Link>
                          <p className="mt-1 text-xs text-forest-400">
                            {careTip[plant.careDifficulty ?? ''] ?? defaultCareTip}
                          </p>
                          {customPhotos.has(plant.id) && (
                            <button
                              onClick={() => handleRemovePhoto(plant.id)}
                              disabled={isUploading}
                              className="mt-1 text-xs text-forest-400 underline transition hover:text-forest-600 disabled:opacity-50"
                            >
                              恢復預設照片
                            </button>
                          )}
                        </div>
                      </div>

                      {isOverdue && (
                        <p className="mt-3 rounded-lg bg-terracotta-50 px-3 py-2 text-xs font-medium text-terracotta-600">
                          ⚠️ 已經超過建議澆水時間 {overdueDays} 天，該澆水囉
                        </p>
                      )}

                      <div className="mt-4 space-y-2">
                        {quickEventTypes.map((eventType) => {
                          const key = `${plant.id}:${eventType}`;
                          const meta = eventMeta[eventType];
                          return (
                            <div
                              key={eventType}
                              className="flex items-center justify-between rounded-lg bg-forest-50/60 px-3 py-2"
                            >
                              <span className="text-sm text-forest-700">
                                {meta.icon} {meta.label}：
                                <span className="text-forest-500">
                                  {daysAgoLabel(lastLoggedAt(plant.id, eventType))}
                                </span>
                              </span>
                              <button
                                onClick={() => handleLog(plant.id, eventType)}
                                disabled={savingKey === key}
                                className="rounded-lg bg-forest-700 px-3 py-1 text-xs font-semibold text-white transition active:scale-95 hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
                              >
                                {savingKey === key ? '紀錄中...' : meta.actionLabel}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 border-t border-forest-50 pt-3">
                        {!isNoteOpen ? (
                          <button
                            onClick={() => toggleNoteForm(plant.id)}
                            className="text-xs font-medium text-forest-600 underline hover:text-forest-800"
                          >
                            📝 寫觀察筆記
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              value={noteDrafts.get(plant.id) ?? ''}
                              onChange={(e) =>
                                setNoteDrafts((prev) => new Map(prev).set(plant.id, e.target.value))
                              }
                              placeholder="記錄植物現況，例如：新長出側芽、葉片有點皺..."
                              rows={2}
                              className="w-full rounded-lg border border-forest-200 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSubmitNote(plant.id)}
                                disabled={savingNoteFor === plant.id}
                                className="rounded-lg bg-forest-700 px-3 py-1 text-xs font-semibold text-white transition active:scale-95 hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
                              >
                                {savingNoteFor === plant.id ? '送出中...' : '送出筆記'}
                              </button>
                              <button
                                onClick={() => toggleNoteForm(plant.id)}
                                className="rounded-lg border border-forest-200 px-3 py-1 text-xs text-forest-600 hover:bg-forest-50"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {history.length > 0 && (
                        <div className="mt-3 border-t border-forest-50 pt-3">
                          <button
                            onClick={() => toggleHistory(plant.id)}
                            className="text-xs font-medium text-forest-600 underline hover:text-forest-800"
                          >
                            {isHistoryOpen ? '收起紀錄' : `查看照顧紀錄（${history.length}）`}
                          </button>

                          {isHistoryOpen && (
                            <div className="mt-2">
                              <CareLogCalendar logs={history} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default MyPlantsPage;
