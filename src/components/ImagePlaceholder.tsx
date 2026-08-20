interface ImagePlaceholderProps {
  className?: string;
}

function ImagePlaceholder({ className }: ImagePlaceholderProps) {
  return (
    <div className={`relative overflow-hidden bg-forest-50 ${className ?? ''}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="animate-pulse-soft text-4xl">🌿</span>
      </div>
      <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
}

export default ImagePlaceholder;
