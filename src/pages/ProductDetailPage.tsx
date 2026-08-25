import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/useCart';
import { useToast } from '../context/useToast';
import Header from '../components/Header';
import ImagePlaceholder from '../components/ImagePlaceholder';
import { PLACEHOLDER_IMAGE } from '../lib/placeholderImage';

interface ProductDetail {
  id: string;
  name: string;
  scientificName: string | null;
  description: string | null;
  origin: string | null;
  careDifficulty: string | null;
  lightNeeds: string | null;
  sizeInfo: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
}

const difficultyLabel: Record<string, string> = {
  easy: '容易',
  medium: '中等',
  hard: '困難',
};

function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [soldToday, setSoldToday] = useState(0);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [justAdded]);

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(image_url, display_order)')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
      } else {
        const images = (data.product_images ?? []).slice().sort(
          (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
        );
        setProduct({
          id: data.id,
          name: data.name,
          scientificName: data.scientific_name,
          description: data.description,
          origin: data.origin,
          careDifficulty: data.care_difficulty,
          lightNeeds: data.light_needs,
          sizeInfo: data.size_info,
          price: data.price,
          stock: data.stock,
          imageUrl: images[0]?.image_url ?? null,
        });
      }
      setLoading(false);
    }

    if (id) fetchProduct();
  }, [id]);

  // 即時瀏覽人數：用 Supabase Realtime 的 Presence 功能，
  // 追蹤目前有幾個瀏覽器分頁正開著同一個商品頁面
  useEffect(() => {
    if (!product) return;

    const channel = supabase.channel(`product-views:${product.id}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // 只依賴 product?.id：product 物件本身只會在同一個商品重新載入時整包換掉，
    // id 不變就不需要重新訂閱 presence channel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // 今日銷量：查詢今天已成立（已付款/已出貨/已完成）的訂單裡，這個商品賣了幾件
  useEffect(() => {
    if (!product) return;

    async function fetchSoldToday() {
      // 一般會員的 order_items RLS 只能看到自己的訂單，沒辦法直接加總全站銷量，
      // 所以改呼叫後端的 get_today_sold_count()，只回傳一個數字，不洩漏其他人訂單細節
      const { data } = await supabase.rpc('get_today_sold_count', { p_product_id: product!.id });
      setSoldToday((data as number) ?? 0);
    }

    fetchSoldToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <Header back={{ to: '/', label: '返回商品列表' }} />
        <div className="p-10 text-center text-forest-500">載入中...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-cream">
        <Header back={{ to: '/', label: '返回商品列表' }} />
        <div className="p-10 text-center text-red-500">
          找不到這個商品{error ? `(${error})` : ''}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header back={{ to: '/', label: '返回商品列表' }} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full rounded-2xl border border-forest-100 object-cover"
              />
            ) : (
              <ImagePlaceholder className="aspect-square w-full rounded-2xl border border-forest-100" />
            )}
          </div>

          {/* 商品資訊區 */}
          <div>
            <h1 className="font-display text-3xl font-bold text-forest-900">{product.name}</h1>
            {product.scientificName && (
              <p className="mt-1 text-sm italic text-forest-400">{product.scientificName}</p>
            )}

            <p className="mt-4 text-2xl font-bold text-terracotta-600">NT$ {product.price}</p>

            {product.stock === 0 ? (
              <p className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-600">
                已售完
              </p>
            ) : (
              <p className="mt-2 text-sm font-medium text-forest-600">現貨供應中</p>
            )}

            {(viewerCount >= 2 || soldToday > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {viewerCount >= 2 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-terracotta-50 px-3 py-1 text-xs font-medium text-terracotta-600">
                    🔥 目前有 {viewerCount} 人正在看
                  </span>
                )}
                {soldToday > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-600">
                    ✨ 今天已售出 {soldToday} 件
                  </span>
                )}
              </div>
            )}

            {product.description && (
              <p className="mt-4 text-forest-700">{product.description}</p>
            )}

            {/* 塊根/多肉專屬資訊 */}
            <div className="mt-6 space-y-2 rounded-xl border border-forest-100 bg-white p-4">
              {product.origin && (
                <div className="flex justify-between text-sm">
                  <span className="text-forest-400">原產地</span>
                  <span className="font-medium text-forest-900">{product.origin}</span>
                </div>
              )}
              {product.careDifficulty && (
                <div className="flex justify-between text-sm">
                  <span className="text-forest-400">照顧難度</span>
                  <span className="font-medium text-forest-900">
                    {difficultyLabel[product.careDifficulty] ?? product.careDifficulty}
                  </span>
                </div>
              )}
              {product.lightNeeds && (
                <div className="flex justify-between text-sm">
                  <span className="text-forest-400">日照需求</span>
                  <span className="font-medium text-forest-900">{product.lightNeeds}</span>
                </div>
              )}
              {product.sizeInfo && (
                <div className="flex justify-between text-sm">
                  <span className="text-forest-400">尺寸</span>
                  <span className="font-medium text-forest-900">{product.sizeInfo}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                addItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  imageUrl: product.imageUrl ?? PLACEHOLDER_IMAGE,
                  stock: product.stock,
                });
                setJustAdded(true);
                showToast(`已加入購物車：${product.name}`);
              }}
              disabled={product.stock === 0}
              className={`mt-6 w-full rounded-xl py-3 font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-forest-200 ${
                justAdded ? 'bg-forest-500' : 'bg-forest-700 hover:bg-forest-800'
              }`}
            >
              {product.stock === 0 ? '已售完' : justAdded ? '已加入購物車 ✓' : '加入購物車'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductDetailPage;
