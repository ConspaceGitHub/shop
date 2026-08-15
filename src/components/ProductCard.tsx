import { Link } from 'react-router-dom';
import type { Product } from '../types/product';

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative overflow-hidden bg-forest-50">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.stock === 0 && (
          <span className="absolute top-3 right-3 rounded-full bg-forest-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            已售完
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display line-clamp-2 text-lg font-semibold text-forest-900">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-forest-500">{product.description}</p>
        <p className="mt-auto pt-3 text-xl font-bold text-terracotta-600">NT$ {product.price}</p>
      </div>
    </Link>
  );
}

export default ProductCard;
