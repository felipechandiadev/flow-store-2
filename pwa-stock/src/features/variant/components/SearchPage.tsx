"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, IconButton, TextField } from "@/shared";
import ScanModeSwitch from "./ScanModeSwitch";
import VariantNotFoundAlert from "./VariantNotFoundAlert";
import QuickCreateProductDialog from "./QuickCreateProductDialog";
import { useVariantLookup } from "../hooks/use-variant-lookup";
import type { ScanMode } from "../domain/scan-mode.entity";
import { SCAN_PATH } from "../lib/variant-routes";

export default function SearchPage() {
  const [skuMode, setSkuMode] = useState(false);
  const mode: ScanMode = skuMode ? "sku" : "barcode";
  const [manualCode, setManualCode] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateCode, setQuickCreateCode] = useState("");

  const {
    error,
    pickerItems,
    notFoundCode,
    setNotFoundCode,
    pending,
    handleLookup,
    goToVariant,
    setPickerItems,
  } = useVariantLookup();

  const inputLabel = mode === "sku" ? "SKU" : "Código de barras";

  return (
    <div className="flex flex-col gap-4 pb-8">
      <ScanModeSwitch skuMode={skuMode} onChange={setSkuMode} />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {notFoundCode ? (
        <VariantNotFoundAlert
          code={notFoundCode}
          pending={pending}
          onDismiss={() => setNotFoundCode(null)}
          onCreate={() => {
            setQuickCreateCode(notFoundCode);
            setNotFoundCode(null);
            setQuickCreateOpen(true);
          }}
        />
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLookup(manualCode, mode);
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-end gap-2">
          <TextField
            label={inputLabel}
            placeholder={inputLabel}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={pending}
            className="min-w-0 flex-1"
          />
          <IconButton
            icon="Search"
            type="submit"
            variant="containedPrimary"
            size="md"
            ariaLabel="Buscar"
            disabled={pending}
            isLoading={pending}
            data-test-id="variant-manual-search"
          />
        </div>
      </form>

      {pickerItems && pickerItems.length > 1 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Varias coincidencias:</p>
          {pickerItems.map((item) => (
            <Button
              key={item.variantId}
              type="button"
              variant="secondary"
              onClick={() => {
                setPickerItems(null);
                goToVariant(item.variantId);
              }}
            >
              {item.productName} — {item.sku}
            </Button>
          ))}
        </div>
      ) : null}

      <QuickCreateProductDialog
        open={quickCreateOpen}
        scannedCode={quickCreateCode}
        mode={mode}
        onClose={() => setQuickCreateOpen(false)}
        onCreated={(variantId) => {
          setQuickCreateOpen(false);
          goToVariant(variantId);
        }}
      />

      <Link
        href={SCAN_PATH}
        className="text-center text-sm font-medium text-secondary underline-offset-2 hover:underline"
        data-test-id="search-back-to-scan"
      >
        Volver al escáner
      </Link>
    </div>
  );
}
