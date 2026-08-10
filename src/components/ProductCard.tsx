import { Link } from 'react-router-dom';
import type { Product } from '../types/product';

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {product.stock === 0 && (
          <span className="absolute top-2 right-2 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
            已售完
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
        <p className="mt-3 text-xl font-bold text-gray-900">NT$ {product.price}</p>
      </div>
    </Link>
  );
}

export default ProductCard;