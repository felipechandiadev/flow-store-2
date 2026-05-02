"use client";
import React, { useRef, useState } from 'react';
import { User, ImageOff, Image as ImageIcon, RotateCcw, Plus } from 'lucide-react';
import { Button } from '../Button/Button';
import IconButton from '../IconButton/IconButton';
import type { MultimediaBannerSize } from './multimedia-banner-size';
import { bannerAreaClassName, bannerPlaceholderIconDimension } from './multimedia-banner-size';
// TODO: Create shared/hooks/useAlert hook
// import { useAlert } from '@/shared/hooks/useAlert';

interface MultimediaUploaderProps {
  /** Identificador contextual (p. ej. entidad destino); no envía el archivo por sí solo. */
  uploadPath: string;
  onChange?: (files: File[]) => void;
  label?: string;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // Tamaño máximo en MB
  aspectRatio?: 'square' | 'video' | '16:9' | 'auto';
  buttonType?: 'icon' | 'normal';
  /** `collection` = varios archivos + rejilla; `avatar` / `banner` = un solo archivo con layout fijo. */
  variant?: 'collection' | 'avatar' | 'banner';
  /** Solo `variant="banner"`: ancho del área 16:9 (vacío + preview): xs … full. Por defecto `md`. */
  bannerSize?: MultimediaBannerSize;
  previewSize?: 'xs' | 'sm' | 'normal' | 'lg' | 'xl'; // Opciones de tamaño de miniatura
  disabled?: boolean;
}

export const MultimediaUploader: React.FC<MultimediaUploaderProps> = ({
  uploadPath,
  onChange,
  label = '',
  accept = 'image/*,video/*',
  maxFiles = 5,
  maxSize = 9, // 9MB por defecto (margen con el límite de 10MB de Next.js)
  aspectRatio = '16:9',
  buttonType = 'icon',
  variant = 'collection',
  bannerSize = 'md',
  previewSize = 'normal', // xs | sm | normal | lg | xl
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  // TODO: Implement useAlert hook
  // const { error } = useAlert();

  // Función para validar tamaño de archivo según tipo
  const validateFileSize = (file: File): string | null => {
    const isVideo = file.type.startsWith('video/');
    const maxSizeInBytes = isVideo ? 70 * 1024 * 1024 : 10 * 1024 * 1024; // 70MB para videos, 10MB para imágenes
    const maxSizeLabel = isVideo ? '70MB' : '10MB';
    const fileType = isVideo ? 'videos' : 'imágenes';

    if (file.size > maxSizeInBytes) {
      return `El archivo excede el límite de ${maxSizeLabel} para ${fileType}`;
    }

    return null;
  };

  // Cleanup function para URLs de preview
  React.useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) return;

    // Para variante avatar: solo un archivo y solo imágenes
    if (variant === 'avatar' || variant === 'banner') {
      const file = selectedFiles[0];
      
      // Solo imágenes
      if (!file.type.startsWith('image/')) {
        console.error(`${file.name}: Solo se permiten imágenes para esta variante`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      // No se aplica límite de tamaño en el front para avatar/banner;
      // el backend se encargará de cualquier restricción adicional.
      // (antes se imponía un máximo de 2MB, ahora se elimina)

      // Limpiar URLs de preview anteriores
      previewUrls.forEach(url => URL.revokeObjectURL(url));

      // Reemplazar completamente (no agregar)
      const newFiles = [file];
      const newPreviewUrls = [URL.createObjectURL(file)];

      setFiles(newFiles);
      setPreviewUrls(newPreviewUrls);
      onChange?.(newFiles);

      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Variante collection: varios archivos + rejilla
    const validFiles: File[] = [];
    const errorMessages: string[] = [];

    for (const file of selectedFiles) {
      // Validar tipo de archivo
      if (!file.type.match(/^(image|video)\//)) {
        errorMessages.push(`${file.name}: Solo se permiten imágenes y videos`);
        continue;
      }

      // Validar tamaño específico por tipo
      const sizeError = validateFileSize(file);
      if (sizeError) {
        errorMessages.push(`${file.name}: ${sizeError}`);
        continue;
      }

      validFiles.push(file);
    }

    // Mostrar errores si los hay
    if (errorMessages.length > 0) {
      // TODO: Implement useAlert hook
      // error(errorMessages.join('\n'));
      console.error(errorMessages.join('\n'));
    }

    // Solo procesar archivos válidos
    if (validFiles.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Verificar límite de archivos
    const totalFiles = files.length + validFiles.length;
    if (totalFiles > maxFiles) {
      // TODO: Implement useAlert hook
      // error(`Solo se permiten máximo ${maxFiles} archivo(s). Actualmente tienes ${files.length}, intentas agregar ${validFiles.length}.`);
      console.error(`Solo se permiten máximo ${maxFiles} archivo(s). Actualmente tienes ${files.length}, intentas agregar ${validFiles.length}.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Limpiar URLs de preview anteriores
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    // Crear nuevas URLs y actualizar archivos
    const newFiles = [...files, ...validFiles];
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));

    setFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
    onChange?.(newFiles);

    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    // Revocar URL del archivo que se elimina
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }

    const newFiles = files.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);

    setFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
    onChange?.(newFiles);
  };

  // Calcular clases según tamaño de miniatura
  const getPreviewSizeClasses = () => {
    switch (previewSize) {
      case 'xs': return 'w-full max-w-[120px] mx-auto'; // Extra pequeño (120px)
      case 'sm': return 'w-full max-w-[180px] mx-auto'; // Pequeño (180px)
      case 'lg': return 'w-full max-w-[320px] mx-auto'; // Grande (320px)
      case 'xl': return 'w-full max-w-[420px] mx-auto'; // Extra grande (420px)
      case 'normal':
      default:
        return 'w-full'; // Normal (sin límite)
    }
  };

  const previewContainerClass = getPreviewSizeClasses();

  const openPicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 w-full ${disabled ? "pointer-events-none opacity-60" : ""}`}
      data-test-id="multimedia-uploader-root"
      data-upload-context={uploadPath}
    >
            <input
        ref={inputRef}
        type="file"
        accept={variant === 'avatar' || variant === 'banner' ? 'image/*' : accept}
        multiple={variant !== 'avatar' && variant !== 'banner'} // solamente single para avatar/banner
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={handleFileChange}
      />
      {variant === 'avatar' ? (
        // Renderizado para variante avatar
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative w-24 h-24 mx-auto rounded-full border-4 border-secondary bg-neutral-100 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={openPicker}
          >
            {previewUrls.length > 0 ? (
              <img
                src={previewUrls[0]}
                alt="Avatar preview"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className="text-secondary" size={64} />
            )}
          </div>

          <IconButton
            icon="Plus"
            variant="containedSecondary"
            onClick={openPicker}
            disabled={disabled}
            ariaLabel="Seleccionar avatar"
          />
        </div>
      ) : variant === 'banner' ? (
        // Renderizado para variante banner (16:9 rectangle)
        <div
          className={`flex flex-col gap-4 ${bannerSize === 'full' ? 'w-full' : 'items-center'}`}
        >
          <div
            className={`${bannerAreaClassName(bannerSize)} hover:border-blue-500 border border-transparent bg-muted/25`}
            onClick={openPicker}
          >
            {previewUrls.length > 0 ? (
              <img
                src={previewUrls[0]}
                alt="Preview"
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <ImageIcon className="text-secondary" size={bannerPlaceholderIconDimension(bannerSize)} />
            )}
          </div>

          <IconButton
            icon="Plus"
            variant="containedSecondary"
            onClick={openPicker}
            disabled={disabled}
            ariaLabel="Seleccionar imagen"
          />
        </div>
      ) : (
        // Variante collection: botón + rejilla de previews
        <>
          <div className="flex flex-col items-start gap-0.5">
            {buttonType === 'icon' ? (
              <>
                {label ? (
                  <span className="text-xs font-normal text-foreground leading-none">
                    {label}
                  </span>
                ) : null}
                <IconButton
                  icon="Plus"
                  variant="containedSecondary"
                  onClick={openPicker}
                  disabled={disabled}
                  ariaLabel={label?.trim() ? `Subir multimedia: ${label}` : "Subir multimedia"}
                />
              </>
            ) : (
              <Button variant="secondary" type="button" onClick={openPicker} disabled={disabled}>
                Subir multimedia
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {previewUrls.map((url: string, idx: number) => {
              const file = files[idx];
              const isVideo = file?.type.startsWith('video/');

              return (
                <div key={idx} className={`relative inline-block flex-none ${previewContainerClass}`}>
                  {isVideo ? (
                    <video
                      src={url}
                      className={`w-full object-cover rounded-lg shadow ${
                        aspectRatio === 'square' ? 'aspect-square' :
                        aspectRatio === 'video' ? 'aspect-video h-24' :
                        aspectRatio === '16:9' ? 'aspect-video' :
                        'h-40 sm:h-48 md:h-52'
                      }`}
                      controls={false}
                      muted
                    />
                  ) : (
                    <img
                      src={url}
                      alt={`preview-${idx}`}
                      className={`w-full object-cover rounded-lg shadow ${
                        aspectRatio === 'square' ? 'aspect-square' :
                        aspectRatio === 'video' ? 'aspect-video h-24' :
                        aspectRatio === '16:9' ? 'aspect-video' :
                        'h-40 sm:h-48 md:h-52'
                      }`}
                    />
                  )}
                  <IconButton
                    aria-label="Eliminar archivo"
                    icon="X"
                    variant="containedSecondary"
                    onClick={() => handleRemove(idx)}
                    disabled={disabled}
                    style={{ position: 'absolute', top: 2, right: 2, borderRadius: '50%', minWidth: 24, minHeight: 24, padding: 0, width: 24, height: 24, lineHeight: 1 }}
                  />

                  {/* Indicador de tipo de archivo */}
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white p-2 rounded-full flex items-center justify-center">
                    {isVideo ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MultimediaUploader;