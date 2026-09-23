/**
 * @file Product gallery: a main image and, when there is more than one image,
 * a row of thumbnails that choose which one is main.
 */
import { useState } from 'react';
import './ProductGallery.css';

/** Props for {@link ProductGallery}. */
export interface ProductGalleryProps {
  /** Image URLs, feed order; may be empty. */
  imageUrls: string[];
  /** Product name, the main image's alt text. */
  name: string;
}

/**
 * Render the gallery. Keyed by product in the parent, so a new product starts
 * on its first image.
 *
 * @param props - Images and the product name.
 * @returns The gallery.
 */
export default function ProductGallery({ imageUrls, name }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  // Indexes of images that failed to load; each falls back to the placeholder.
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set());

  const markFailed = (index: number) => setFailed((current) => new Set(current).add(index));
  const mainUrl = imageUrls[selected];
  const showMain = mainUrl !== undefined && !failed.has(selected);

  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        {showMain ? (
          <img className="product-gallery__image" src={mainUrl} alt={name} onError={() => markFailed(selected)} />
        ) : (
          <div className="product-gallery__placeholder" role="img" aria-label={name} />
        )}
      </div>
      {imageUrls.length > 1 ? (
        <div className="product-gallery__thumbs">
          {imageUrls.map((url, index) => (
            <button
              // The feed can repeat an image, so the URL alone is not a unique key.
              key={`${index}-${url}`}
              type="button"
              className={index === selected ? 'product-gallery__thumb is-active' : 'product-gallery__thumb'}
              aria-label={`Show image ${index + 1} of ${imageUrls.length}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              {failed.has(index) ? (
                <span className="product-gallery__placeholder" aria-hidden="true" />
              ) : (
                <img className="product-gallery__image" src={url} alt="" loading="lazy" onError={() => markFailed(index)} />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
