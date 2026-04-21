'use client';

import React, { useState, useRef, useCallback } from 'react';
import IconButton from '../IconButton/IconButton';
import Alert from '../Alert/Alert';
import { MultimediaUpdaterProps } from './types';

const MultimediaUpdater: React.FC<MultimediaUpdaterProps> = ({
  currentUrl,
  currentType,
  onFileChange,
  buttonText = 'Actualizar multimedia',
  labelText = '',
  acceptedTypes = ['image/*', 'video/*'],
  maxSize = 5,
  aspectRatio = '1:1',
  variant = 'default',
  allowDragDrop = false,
  className = '',
  previewSize = 'md',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar previewUrl cuando currentUrl cambia (después de guardar)
  React.useEffect(() => {
    if (!selectedFile && currentUrl) {
      setPreviewUrl(currentUrl);
      setImageError(false);
    }
  }, [currentUrl, selectedFile]);

  const aspectRatioClass: string = ({
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
  } as const)[aspectRatio || '1:1'] || 'aspect-square';

  const previewSizeClass: string = ({
    'xs': 'max-w-20 max-h-20',
    'sm': 'max-w-32 max-h-32',
    'md': 'max-w-48 max-h-48',
    'lg': 'max-w-64 max-h-64',
    'xl': 'max-w-96 max-h-96',
  } as const)[previewSize || 'md'] || 'max-w-48 max-h-48';

  const getPreviewSizeClasses = () => {
    switch (previewSize) {
      case 'xs':
        return 'w-full max-w-[120px] mx-auto';
      case 'sm':
        return 'w-full max-w-[180px] mx-auto';
      case 'lg':
        return 'w-full max-w-[320px] mx-auto';
      case 'xl':
        return 'w-full max-w-[420px] mx-auto';
      case 'md':
      default:
        return 'w-full';
    }
  };

  const previewContainerClass = getPreviewSizeClasses();

  const validateFile = (file: File): boolean => {
    if (!acceptedTypes.some((type: string) => file.type.match(type))) {
      setError(`Tipo de archivo no permitido. Permitidos: ${acceptedTypes.join(', ')}`);
      return false;
    }
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Archivo demasiado grande. Máximo: ${maxSize}MB`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      setImageError(false);
      onFileChange?.(file);
    }
  }, [onFileChange, acceptedTypes, maxSize]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(currentUrl || null);
    onFileChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (allowDragDrop) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (allowDragDrop) {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    }
  };

  const renderPreview = () => {
    if (!previewUrl) {
      if (variant === 'avatar') {
        return <span className="material-symbols-outlined text-secondary" style={{ fontSize: '4rem' }}>person</span>;
      }
      return <div className="flex items-center justify-center h-full text-gray-400">Sin multimedia</div>;
    }

    // Mostrar ícono de error si la imagen no cargó
    if (imageError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '3rem' }}>image_not_supported</span>
        </div>
      );
    }

    const commonClasses = `w-full h-full object-cover ${variant === 'avatar' ? 'rounded-full' : 'rounded-lg'}`;

    if (currentType === 'video' || selectedFile?.type.startsWith('video/')) {
      return (
        <video className={commonClasses} controls>
          <source src={previewUrl} type={selectedFile?.type || 'video/mp4'} />
        </video>
      );
    }

    return (
      <img 
        src={previewUrl} 
        alt="Preview" 
        className={commonClasses}
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    );
  };

  return (
    <div className={`space-y-4 mt-2 ${className}`}>
      {variant === 'avatar' ? (
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative w-24 h-24 mx-auto rounded-full border-4 border-secondary bg-neutral-100 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              renderPreview()
            ) : (
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: '4rem' }}>
                person
              </span>
            )}
            {allowDragDrop && isDragOver && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-50 flex items-center justify-center text-white font-semibold rounded-full">
                Arrastra aquí
              </div>
            )}
          </div>
          <IconButton
            icon={previewUrl ? 'refresh' : 'add'}
            variant="containedSecondary"
            onClick={() => fileInputRef.current?.click()}
            ariaLabel="Seleccionar avatar"
          />
        </div>
      ) : variant === 'banner' ? (
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative w-full max-w-[480px] aspect-video flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors rounded-lg"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              renderPreview()
            ) : (
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: '4rem' }}>
                image
              </span>
            )}
            {allowDragDrop && isDragOver && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-50 flex items-center justify-center text-white font-semibold rounded-lg">
                Arrastra aquí
              </div>
            )}
          </div>
          <IconButton
            icon={previewUrl ? 'refresh' : 'add'}
            variant="containedSecondary"
            onClick={() => fileInputRef.current?.click()}
            ariaLabel="Seleccionar imagen"
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col items-start gap-0.5">
            {labelText && !previewUrl && (
              <span className="text-xs font-normal text-foreground leading-none">
                {labelText}
              </span>
            )}
            <IconButton
              icon="add"
              variant="containedSecondary"
              onClick={() => fileInputRef.current?.click()}
              ariaLabel="Subir multimedia"
            />
          </div>
          {previewUrl && (
            <div className={`${previewContainerClass} relative`}>{renderPreview()}</div>
          )}
        </>
      )}

      {/* Error Alert */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Hidden File Input */}
      <input
        id="multimedia-input"
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
};

export default MultimediaUpdater;