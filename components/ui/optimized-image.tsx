import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  style?: React.CSSProperties;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  sizes,
  fill = false,
  style,
  ...props
}: OptimizedImageProps) {
  
  // Generate WebP version path
  const getWebPSrc = (originalSrc: string) => {
    const lastDotIndex = originalSrc.lastIndexOf('.');
    if (lastDotIndex === -1) return originalSrc;
    
    const pathWithoutExt = originalSrc.substring(0, lastDotIndex);
    const extension = originalSrc.substring(lastDotIndex);
    
    // If it's already a WebP or SVG, return as is
    if (extension === '.webp' || extension === '.svg') {
      return originalSrc;
    }
    
    // For other formats, try the optimized WebP version
    return `${pathWithoutExt}.webp`;
  };

  // Generate optimized original format path
  const getOptimizedSrc = (originalSrc: string) => {
    // If it's an SVG, return as is
    if (originalSrc.endsWith('.svg')) {
      return originalSrc;
    }
    
    // For other formats, try the optimized version
    const lastDotIndex = originalSrc.lastIndexOf('.');
    if (lastDotIndex === -1) return originalSrc;
    
    const pathWithoutExt = originalSrc.substring(0, lastDotIndex);
    const extension = originalSrc.substring(lastDotIndex);
    
    return `${pathWithoutExt}${extension}`;
  };

  const webpSrc = getWebPSrc(src);
  const optimizedSrc = getOptimizedSrc(src);

  return (
    <picture>
      {/* WebP source for modern browsers */}
      <source
        srcSet={webpSrc}
        type="image/webp"
      />
      
      {/* Optimized original format as fallback */}
      <Image
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        quality={quality}
        sizes={sizes}
        fill={fill}
        style={style}
        {...props}
      />
    </picture>
  );
}

// Utility function to get optimized image paths
export function getOptimizedImagePath(originalPath: string, format: 'webp' | 'original' = 'webp') {
  if (format === 'original') {
    return getOptimizedSrc(originalPath);
  }
  
  return getWebPSrc(originalPath);
}

function getWebPSrc(originalSrc: string) {
  const lastDotIndex = originalSrc.lastIndexOf('.');
  if (lastDotIndex === -1) return originalSrc;
  
  const pathWithoutExt = originalSrc.substring(0, lastDotIndex);
  const extension = originalSrc.substring(lastDotIndex);
  
  if (extension === '.webp' || extension === '.svg') {
    return originalSrc;
  }
  
  return `${pathWithoutExt}.webp`;
}

function getOptimizedSrc(originalSrc: string) {
  if (originalSrc.endsWith('.svg')) {
    return originalSrc;
  }
  
  const lastDotIndex = originalSrc.lastIndexOf('.');
  if (lastDotIndex === -1) return originalSrc;
  
  const pathWithoutExt = originalSrc.substring(0, lastDotIndex);
  const extension = originalSrc.substring(lastDotIndex);
  
  return `${pathWithoutExt}${extension}`;
}
