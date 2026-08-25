import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import Header from '../components/Header';
import AccountSidebar from '../components/AccountSidebar';
import ImagePlaceholder from '../components/ImagePlaceholder';

const SALE_STATUSES = ['paid', 'shipped', 'completed'];

type EventType = 'watered' | 'repotted' | 'fertilized';

const eventMeta: Record<EventType, { label: string; icon: string; actionLabel: string }> = {
  watered: { label: '澆水', icon: '💧', actionLabel: '記錄澆水' },
  repotted: { label: '換盆', icon: '🏺', actionLabel: '記錄換盆' },
  fertilized: { label: '施肥', icon: '🌱', actionLabel: '記錄施肥' },
};

const careTip: Record<string, string> = {
  easy: '土表乾了再澆水即可，約每 7–10 天一次；日照需求較低，新手也能養得好。',
  medium: '約每 5–7 天澆一次水，留意排水良好，避免長時間強烈日照直曬。',
  hard: '約每 3–5 天澆一次水，需要良好排水與充足日照，冬季要記得減少澆水頻率。',
};
const defaultCareTip = '依植物種類調整澆水頻率，土壤表面乾了再澆水最保險。';

interface PlantProduct {
  id: string;
  name: string;
  careDifficulty: string | null;
  imageUrl: string | null;
}

function daysAgoLabel(iso: string | null): string {
  if (!iso) return '尚未紀錄';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return '今天';
  return `${days} 天前`;
}

function safeFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx === -1) return '';
  // Supabase Storage 的 key 不接受中文等非 ASCII 字元，檔名只取副檔名裡的英數字部分，
  // 原始檔名（含中文）完全不放進路徑，避免 "Invalid key" 錯誤
  const ext = fileName.slice(idx + 1).replace(/[^a-zA-Z0-9]/g, '');
  return ext ? `.${ext}` : '';
}

function storagePathFromPlantPhotoUrl(photoUrl: string): string | null {
  const marker = '/plant-photos/';
  const idx = photoUrl.indexOf(marker);
  if (idx === -1) return null;
  return photoUrl.slice(idx + marker.length);
}

function MyPlantsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [plants, setPlants] = useState<PlantProduct[]>([]);
  const [lastLogs, setLastLogs] = useState<Map<string, string>>(new Map());
  const [customPhotos, setCustomPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const uploadingRef = useRef<Set<string>>(new Set());

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
            .select('product_id, event_type, logged_at')
            .eq('user_id', session.user.id)
            .in('product_id', productIds)
            .order('logged_at', { ascending: false }),
          supabase
            .from('member_plant_photos')
            .select('product_id, photo_url')
            .eq('user_id', session.user.id)
            .in('product_id', productIds),
        ]);

        const latest = new Map<string, string>();
        for (const log of (logsRes.data as Array<{ product_id: string; event_type: string; logged_at: string }>) ?? []) {
          const key = `${log.product_id}:${log.event_type}`;
          if (!latest.has(key)) latest.set(key, log.logged_at);
        }
        setLastLogs(latest);

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

  async function handleLog(productId: string, eventType: EventType) {
    if (!session) return;
    const key = `${productId}:${eventType}`;
    if (savingKey === key) return;
    setSavingKey(key);

    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('plant_care_logs').insert({
      user_id: session.user.id,
      product_id: productId,
      event_type: eventType,
      logged_at: nowIso,
    });

    setSavingKey(null);

    if (error) {
      showToast('紀錄失敗，請稍後再試', 'error');
      return;
    }

    setLastLogs((prev) => new Map(prev).set(key, nowIso));
    showToast(`已記錄${eventMeta[eventType].label}`);
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

                      <div className="mt-4 space-y-2">
                        {(Object.keys(eventMeta) as EventType[]).map((eventType) => {
                          const key = `${plant.id}:${eventType}`;
                          const meta = eventMeta[eventType];
                          return (
                            <div
                              key={eventType}
                              className="flex items-center justify-between rounded-lg bg-forest-50/60 px-3 py-2"
                            >
                              <span className="text-sm text-forest-700">
                                {meta.icon} {meta.label}：
                                <span className="text-forest-500">{daysAgoLabel(lastLogs.get(key) ?? null)}</span>
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
