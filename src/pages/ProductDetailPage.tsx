import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/useCart';
import { useToast } from '../context/useToast';
import Header from '../components/Header';
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
  imageUrl: string;
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
          imageUrl: images[0]?.image_url ?? PLACEHOLDER_IMAGE,
        });
      }
      setLoading(false);
    }

    if (id) fetchProduct();
  }, [id]);

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
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full rounded-2xl border border-forest-100 object-cover"
            />
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
                  imageUrl: product.imageUrl,
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
