import type { CSSProperties } from 'react'

type ContextPhotoProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  sizes?: string
  srcSet?: string
  style?: CSSProperties
  objectFit?: CSSProperties['objectFit']
  objectPosition?: CSSProperties['objectPosition']
}

export function ContextPhoto({
  src,
  alt,
  width,
  height,
  className = '',
  sizes,
  srcSet,
  style,
  objectFit,
  objectPosition,
}: ContextPhotoProps) {
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      alt={alt}
      className={`context-photo ${className}`.trim()}
      style={{ objectFit, objectPosition, ...style }}
    />
  )
}
