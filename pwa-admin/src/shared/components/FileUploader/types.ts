import type { MultimediaBannerSize } from './multimedia-banner-size';

export type { MultimediaBannerSize };

export interface MultimediaUpdaterProps {
  currentUrl?: string | null;
  currentType?: 'image' | 'video' | string;
  onFileChange?: (file: File | null) => void;
  buttonText?: string;
  labelText?: string;
  acceptedTypes?: string[];
  maxSize?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  variant?: 'default' | 'avatar' | 'banner';
  /** Solo `variant="banner"`: controla ancho del área (vacío + preview): xs … full. Por defecto `md`. */
  bannerSize?: MultimediaBannerSize;
  allowDragDrop?: boolean;
  className?: string;
  previewSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
}