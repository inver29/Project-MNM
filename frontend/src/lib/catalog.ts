import { resolveAssetUrl } from "@/lib/api";
import { Product, Space } from "@/types/domain";

const PRODUCT_PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'><rect width='640' height='480' fill='%23f1eadf'/><rect x='70' y='84' width='500' height='312' rx='36' fill='%23e0d2bf'/><text x='320' y='250' text-anchor='middle' dominant-baseline='middle' fill='%23635749' font-family='Georgia,serif' font-size='34'>No image</text></svg>";

export function getProductPrice(product: Product) {
  return product.sale_price ?? product.list_price;
}

export function getProductImage(product: Product) {
  return (
    resolveAssetUrl(product.primary_image_url) ||
    resolveAssetUrl(product.media_assets.find((media) => media.is_primary)?.media_url) ||
    resolveAssetUrl(product.media_assets[0]?.media_url) ||
    PRODUCT_PLACEHOLDER_IMAGE
  );
}

export function getSpaceImage(space: Space, fallbackImage: string) {
  return resolveAssetUrl(space.cover_image_url) || fallbackImage;
}

export function getProductSummary(product: Product) {
  return product.summary_text;
}

export function getProductCategory(product: Product) {
  return product.space.space_name;
}

export function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value)}\u00a0đ`;
}
