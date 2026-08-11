import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types/product';

function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { totalItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(image_url, display_order)')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        // 把資料庫欄位名稱轉成前端型別(資料庫是 snake_case,前端習慣 camelCase)
        const mapped: Product[] = data.map((row) => {
          const images = (row.product_images ?? []).slice().sort(
            (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
          );
          return {
            id: row.id,
            name: row.name,
            description: row.description,
            price: row.price,
            imageUrl: images[0]?.image_url ?? `https://placehold.co/400x400?text=${encodeURIComponent(row.name)}`,
            stock: row.stock,
          };
        });
        setProducts(mapped);
      }
      setLoading(false);
    }

    fetchProducts();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">載入商品中...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">讀取商品失敗:{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
    <h1 className="text-2xl font-bold text-gray-900">南都植意塊根多肉</h1>
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

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-800">所有商品</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default HomePage;