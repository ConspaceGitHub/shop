import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';

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
}

const difficultyLabel: Record<string, string> = {
  easy: '容易',
  medium: '中等',
  hard: '困難',
};

function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);  
  const { addItem, totalItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
      } else {
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
        });
      }
      setLoading(false);
    }

    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">載入中...</div>;
  }

  if (error || !product) {
    return (
      <div className="p-10 text-center text-red-500">
        找不到這個商品{error ? `(${error})` : ''}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
     <header className="border-b border-gray-200 bg-white">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
    <Link to="/" className="text-sm text-gray-500 hover:text-gray-800">
      ← 返回商品列表
    </Link>
    <Link to="/cart" className="relative text-gray-700 hover:text-gray-900">
      🛒 購物車
      {totalItems > 0 && (
        <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {totalItems}
        </span>
      )}
    </Link>
  </div>
</header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {/* 商品圖片區,先用假圖 */}
          <div>
            <img
              src={`https://placehold.co/500x500?text=${encodeURIComponent(product.name)}`}
              alt={product.name}
              className="w-full rounded-xl object-cover"
            />
          </div>

          {/* 商品資訊區 */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            {product.scientificName && (
              <p className="mt-1 text-sm italic text-gray-500">{product.scientificName}</p>
            )}

            <p className="mt-4 text-2xl font-bold text-gray-900">NT$ {product.price}</p>

            {product.stock === 0 ? (
              <p className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-600">
                已售完
              </p>
            ) : (
              <p className="mt-2 text-sm text-green-600">現貨供應中</p>
            )}

            {product.description && (
              <p className="mt-4 text-gray-700">{product.description}</p>
            )}

            {/* 塊根/多肉專屬資訊 */}
            <div className="mt-6 space-y-2 rounded-lg bg-white p-4 border border-gray-200">
              {product.origin && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">原產地</span>
                  <span className="font-medium text-gray-900">{product.origin}</span>
                </div>
              )}
              {product.careDifficulty && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">照顧難度</span>
                  <span className="font-medium text-gray-900">
                    {difficultyLabel[product.careDifficulty] ?? product.careDifficulty}
                  </span>
                </div>
              )}
              {product.lightNeeds && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">日照需求</span>
                  <span className="font-medium text-gray-900">{product.lightNeeds}</span>
                </div>
              )}
              {product.sizeInfo && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">尺寸</span>
                  <span className="font-medium text-gray-900">{product.sizeInfo}</span>
                </div>
              )}
            </div>

            <button
  onClick={() =>
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: `https://placehold.co/400x400?text=${encodeURIComponent(product.name)}`,
      stock: product.stock,
    })
  }
  disabled={product.stock === 0}
  className="mt-6 w-full rounded-lg bg-gray-900 py-3 text-white font-semibold transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
>
  {product.stock === 0 ? '已售完' : '加入購物車'}
</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductDetailPage;