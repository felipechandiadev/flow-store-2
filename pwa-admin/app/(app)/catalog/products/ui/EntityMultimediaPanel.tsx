"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@/shared/components/Alert/Alert";
import MultimediaUpdater from "@/shared/components/FileUploader/MultimediaUpdater";
import { MultimediaUploader } from "@/shared/components/FileUploader/MultimediaUploader";
import {
  listMultimediaForEntityAction,
  uploadMultimediaForEntityAction,
  unlinkMultimediaFromEntityAction,
} from "@/features/multimedia/actions/multimedia.action";
import type { MultimediaAssetListItem, MultimediaEntityType } from "@/features/multimedia/types/multimedia.types";
import IconButton from "@/shared/components/IconButton/IconButton";

export type EntityMultimediaPanelProps = {
  entityType: MultimediaEntityType;
  entityId: string;
  title?: string;
  /** Oculta el encabezado con título y el borde superior asociado (p. ej. variante con sección «Multimedia» propia). */
  omitHeading?: boolean;
  /** Tras subir o quitar (p. ej. `router.refresh()`). */
  onChanged?: () => void;
  /** Deshabilita acciones (p. ej. id aún no persistido). */
  disabled?: boolean;
  /**
   * Solo `MultimediaUploader` en modo colección (rejilla de varios archivos).
   * Oculta el bloque de un único archivo (`MultimediaUpdater` / banner).
   */
  collectionOnly?: boolean;
};

export function EntityMultimediaPanel({
  entityType,
  entityId,
  title = "Imágenes",
  omitHeading = false,
  onChanged,
  disabled = false,
  collectionOnly = false,
}: EntityMultimediaPanelProps) {
  const [assets, setAssets] = useState<MultimediaAssetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Reinicia el estado local del `MultimediaUploader` / `MultimediaUpdater` tras subidas exitosas. */
  const [uploaderKey, setUploaderKey] = useState(0);
  const [updaterKey, setUpdaterKey] = useState(0);

  const load = useCallback(async () => {
    const id = entityId.trim();
    if (!id || disabled) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const r = await listMultimediaForEntityAction(entityType, id);
    setLoading(false);
    if (r.success) {
      setAssets(r.assets);
    } else {
      setError(r.error);
      setAssets([]);
    }
  }, [entityType, entityId, disabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadStagingFiles = async (files: File[]) => {
    const id = entityId.trim();
    if (!id || disabled || files.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let markPrimary = assets.length === 0;
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("entityType", entityType);
        form.append("entityId", id);
        form.append("isPrimary", markPrimary ? "true" : "false");
        markPrimary = false;
        const r = await uploadMultimediaForEntityAction(form);
        if (!r.success) {
          setError(r.error);
          break;
        }
      }
      await load();
      onChanged?.();
      setUploaderKey((k) => k + 1);
      setUpdaterKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (assetId: string) => {
    const id = entityId.trim();
    if (!id || disabled || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const r = await unlinkMultimediaFromEntityAction({
      assetId,
      entityType,
      entityId: id,
      usageType: "default",
    });
    setBusy(false);
    if (r.success) {
      await load();
      onChanged?.();
    } else {
      setError(r.error);
    }
  };

  if (!entityId.trim() || disabled) {
    return null;
  }

  const uploadPath = `${entityType}:${entityId}`;
  const isVariantEntity = entityType === "product-variant";
  /** Colección en variantes: solo botón con icono (sin etiqueta de texto). */
  const collectionButtonType = isVariantEntity ? "icon" : "normal";
  const collectionLabel = isVariantEntity
    ? ""
    : "Elegir uno o más archivos; la subida es inmediata.";
  /** Variantes: la colección se añade solo con IconButton (sin párrafo introductorio). */
  const showCollectionHint = !isVariantEntity;

  const uploaderTopClass =
    omitHeading && collectionOnly
      ? "space-y-6 border-t-0 pt-0"
      : `space-y-6 border-t border-border pt-3 ${collectionOnly ? "space-y-0" : ""}`;

  return (
    <div
      className="rounded-lg border border-border bg-muted/10 p-3"
      data-test-id={`entity-multimedia-${entityType}-${entityId}`}
    >
      {!omitHeading ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        </div>
      ) : null}

      {error ? (
        <Alert variant="error" className="mb-2">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : assets.length > 0 ? (
        <div className="mb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((a) => {
              const isVideo = a.mimeType.startsWith("video/") || a.kind === "video";
              return (
                <div
                  key={a.id}
                  className="relative inline-block w-full max-w-[180px]"
                  data-test-id={`entity-multimedia-thumb-${a.id}`}
                >
                  {isVideo ? (
                    <video
                      src={a.publicUrl}
                      className="aspect-video w-full rounded-lg object-cover shadow"
                      muted
                      playsInline
                      controls={false}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.publicUrl}
                      alt=""
                      className="aspect-video w-full rounded-lg object-cover shadow"
                      loading="lazy"
                    />
                  )}
                  <IconButton
                    icon="Trash2"
                    variant="basicSecondary"
                    size="sm"
                    className="absolute bottom-2 right-2 !rounded-md !border !border-neutral-200/90 !bg-white text-destructive !shadow-md backdrop-blur-sm hover:!bg-neutral-100"
                    ariaLabel="Quitar del catálogo"
                    title="Quitar del catálogo"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleUnlink(a.id);
                    }}
                    data-test-id={`entity-multimedia-unlink-${a.id}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className={uploaderTopClass}>
        {!collectionOnly ? (
          <div data-test-id={`entity-multimedia-updater-${entityType}-${entityId}`}>
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              Un archivo: arrastre aquí o pulse +
            </p>
            <MultimediaUpdater
              key={updaterKey}
              currentUrl={null}
              currentType="image"
              variant="banner"
              bannerSize="lg"
              aspectRatio="16:9"
              previewSize="sm"
              allowDragDrop
              acceptedTypes={["image/*", "video/*"]}
              maxSize={9}
              labelText=""
              disabled={busy || loading}
              className="mt-0 space-y-3"
              onFileChange={(file) => {
                if (file) {
                  void uploadStagingFiles([file]);
                }
              }}
            />
          </div>
        ) : null}

        <div data-test-id={`entity-multimedia-uploader-${entityType}-${entityId}`}>
          {showCollectionHint ? (
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">
              {collectionOnly
                ? "Subida por colección: elija uno o más archivos (rejilla y envío inmediato)"
                : "Varios archivos: vista previa en rejilla y envío inmediato"}
            </p>
          ) : null}
          <MultimediaUploader
            key={uploaderKey}
            uploadPath={uploadPath}
            variant="collection"
            label={collectionLabel}
            buttonType={collectionButtonType}
            accept="image/*,video/*"
            maxFiles={12}
            maxSize={9}
            aspectRatio="16:9"
            previewSize="sm"
            disabled={busy || loading}
            onChange={(files) => void uploadStagingFiles(files)}
          />
        </div>
      </div>
    </div>
  );
}
