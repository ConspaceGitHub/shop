import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/useToast';
import AdminHeader from '../../components/AdminHeader';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface ProductRow {
  id: string;
  name: string;
  scientific_name: string | null;
  description: string | null;
  origin: string | null;
  care_difficulty: string | null;
  light_needs: string | null;
  size_info: string | null;
  price: number;
  stock: number;
  product_images: ProductImage[];
}

interface FormState {
  name: string;
  scientificName: string;
  description: string;
  origin: string;
  careDifficulty: string;
  lightNeeds: string;
  sizeInfo: string;
  price: string;
  stock: string;
}

const emptyForm: FormState = {
  name: '',
  scientificName: '',
  description: '',
  origin: '',
  careDifficulty: '',
  lightNeeds: '',
  sizeInfo: '',
  price: '',
  stock: '',
};

function safeFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx === -1) return '';
  // Supabase Storage 的 key 不接受中文等非 ASCII 字元，檔名只取副檔名裡的英數字部分
  const ext = fileName.slice(idx + 1).replace(/[^a-zA-Z0-9]/g, '');
  return ext ? `.${ext}` : '';
}

function storagePathFromUrl(imageUrl: string): string | null {
  const marker = '/product-images/';
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length);
}

function AdminProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(id, image_url, display_order)')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setProducts(data as unknown as ProductRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchProducts 在儲存/刪除後也會被重用，無法整個包進 effect 裡
    fetchProducts();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFiles([]);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function startEdit(product: ProductRow) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      scientificName: product.scientific_name ?? '',
      description: product.description ?? '',
      origin: product.origin ?? '',
      careDifficulty: product.care_difficulty ?? '',
      lightNeeds: product.light_needs ?? '',
      sizeInfo: product.size_info ?? '',
      price: String(product.price),
      stock: String(product.stock),
    });
    setFiles([]);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    const valid = selected.filter((f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);

    if (valid.length < selected.length) {
      setFormError('部分檔案不是圖片或超過 5MB，已略過');
    } else {
      setFormError(null);
    }
    setFiles(valid);
  }

  async function uploadImages(productId: string, startOrder: number) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${productId}/${crypto.randomUUID()}${safeFileExtension(file.name)}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadError) {
        throw new Error(`圖片上傳失敗：${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(path);

      const { error: insertError } = await supabase.from('product_images').insert({
        product_id: productId,
        image_url: publicUrlData.publicUrl,
        display_order: startOrder + i,
      });

      if (insertError) {
        throw new Error(`儲存圖片資料失敗：${insertError.message}`);
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (savingRef.current) return;

    setFormError(null);

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim()) {
      setFormError('請填寫商品名稱');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setFormError('價格必須是大於等於 0 的數字');
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      setFormError('庫存必須是大於等於 0 的數字');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const wasEditing = Boolean(editingId);

    const payload = {
      name: form.name.trim(),
      scientific_name: form.scientificName.trim() || null,
      description: form.description.trim() || null,
      origin: form.origin.trim() || null,
      care_difficulty: form.careDifficulty || null,
      light_needs: form.lightNeeds.trim() || null,
      size_info: form.sizeInfo.trim() || null,
      price,
      stock,
    };

    try {
      if (editingId) {
        const { error: updateError } = await supabase.from('products').update(payload).eq('id', editingId);
        if (updateError) throw new Error(updateError.message);

        const existing = products.find((p) => p.id === editingId);
        const nextOrder = existing ? existing.product_images.length : 0;
        if (files.length > 0) await uploadImages(editingId, nextOrder);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (insertError) throw new Error(insertError.message);

        if (files.length > 0) {
          try {
            await uploadImages(inserted.id, 0);
          } catch (uploadErr) {
            // 圖片上傳失敗就把剛建立的商品一起刪掉，避免留下沒有圖片的殘影商品
            await supabase.from('products').delete().eq('id', inserted.id);
            throw uploadErr;
          }
        }
      }

      resetForm();
      await fetchProducts();
      showToast(wasEditing ? '商品已更新' : '商品已新增');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  async function handleDeleteImage(image: ProductImage) {
    const path = storagePathFromUrl(image.image_url);
    await supabase.from('product_images').delete().eq('id', image.id);
    if (path) {
      await supabase.storage.from('product-images').remove([path]);
    }
    await fetchProducts();
    showToast('圖片已刪除');
  }

  async function handleDeleteProduct(product: ProductRow) {
    if (!confirm(`確定要刪除「${product.name}」嗎？`)) return;

    const paths = product.product_images
      .map((img) => storagePathFromUrl(img.image_url))
      .filter((p): p is string => Boolean(p));

    const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id);

    if (deleteError) {
      showToast(
        deleteError.code === '23503'
          ? '無法刪除：這個商品已經有訂單紀錄了。建議改把庫存改成 0 讓它下架，而不是刪除。'
          : `刪除失敗：${deleteError.message}`,
        'error'
      );
      return;
    }

    if (paths.length > 0) {
      await supabase.storage.from('product-images').remove(paths);
    }

    await fetchProducts();
    showToast('商品已刪除');
  }

  if (loading) {
    return <div className="p-10 text-center text-forest-500">載入商品中...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">讀取商品失敗：{error}</div>;
  }

  const editingProduct = editingId ? products.find((p) => p.id === editingId) : null;

  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-6 font-display text-xl font-bold text-forest-900">商品管理</h1>

        <form
          onSubmit={handleSubmit}
          className="mb-10 space-y-4 rounded-lg border border-forest-100 bg-white p-6"
        >
          <h2 className="font-semibold text-forest-900">{editingId ? '編輯商品' : '新增商品'}</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-forest-700">商品名稱 *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">學名</label>
              <input
                name="scientificName"
                value={form.scientificName}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">價格 *</label>
              <input
                type="number"
                min="0"
                step="1"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">庫存 *</label>
              <input
                type="number"
                min="0"
                step="1"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">原產地</label>
              <input
                name="origin"
                value={form.origin}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">照顧難度</label>
              <select
                name="careDifficulty"
                value={form.careDifficulty}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              >
                <option value="">未設定</option>
                <option value="easy">容易</option>
                <option value="medium">中等</option>
                <option value="hard">困難</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">日照需求</label>
              <input
                name="lightNeeds"
                value={form.lightNeeds}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">尺寸</label>
              <input
                name="sizeInfo"
                value={form.sizeInfo}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">商品描述</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          {editingProduct && editingProduct.product_images.length > 0 && (
            <div>
              <label className="mb-2 block text-sm text-forest-700">目前已上傳的圖片</label>
              <div className="flex flex-wrap gap-3">
                {editingProduct.product_images
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((img) => (
                    <div key={img.id} className="relative">
                      <img
                        src={img.image_url}
                        alt=""
                        className="h-32 w-32 rounded-lg border border-forest-100 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm text-white shadow"
                        title="刪除圖片"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-forest-700">
              商品圖片{editingId ? '（會加在現有圖片後面）' : ''}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="w-full rounded-lg border border-forest-200 px-3 py-2"
            />
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-forest-700 px-6 py-3 text-white font-semibold transition active:scale-95 hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
            >
              {saving ? '儲存中...' : editingId ? '儲存變更' : '新增商品'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-forest-200 px-6 py-3 font-semibold text-forest-700 hover:bg-forest-50"
              >
                取消編輯
              </button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="flex flex-wrap items-start gap-4 rounded-lg border border-forest-100 bg-white p-4">
              <div className="flex gap-2">
                {product.product_images.length === 0 && (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md bg-forest-50 text-xs text-forest-400">
                    無圖片
                  </div>
                )}
                {product.product_images
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((img) => (
                    <div key={img.id} className="relative">
                      <img src={img.image_url} alt="" className="h-20 w-20 rounded-md object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img)}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                        title="刪除圖片"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>

              <div className="min-w-[160px] flex-1">
                <p className="font-semibold text-forest-900">{product.name}</p>
                <p className="text-sm text-forest-500">
                  NT$ {product.price} · 庫存 {product.stock}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(product)}
                  className="rounded-lg border border-forest-200 px-4 py-2 text-sm text-forest-700 hover:bg-forest-50"
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default AdminProductsPage;
