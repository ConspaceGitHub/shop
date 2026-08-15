import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types/product';
import { PLACEHOLDER_IMAGE } from '../lib/placeholderImage';

function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
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
            imageUrl: images[0]?.image_url ?? PLACEHOLDER_IMAGE,
            stock: row.stock,
          };
        });
        setProducts(mapped);
      }
      setLoading(false);
    }

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <section className="border-b border-forest-100 bg-forest-50">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
          <p className="font-display text-sm tracking-[0.3em] text-forest-500">BOTANICAL CURATIONS</p>
          <h1 className="mt-4 font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
            用一株植物，找回生活的節奏
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-forest-600">
            精選塊根與多肉植物，園藝實生栽培，陪你養出屬於自己的綠意角落。
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-6 font-display text-xl font-semibold text-forest-900">所有商品</h2>

        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-forest-100 bg-white">
                <div className="h-56 w-full bg-forest-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-forest-100" />
                  <div className="h-4 w-1/2 rounded bg-forest-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
            讀取商品失敗：{error}
          </p>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="rounded-xl border border-forest-100 bg-white p-10 text-center text-forest-500">
            目前還沒有上架商品，很快就會有新植物到貨！
          </p>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default HomePage;
