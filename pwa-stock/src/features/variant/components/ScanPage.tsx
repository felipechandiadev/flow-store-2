"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/shared";
import BarcodeScanner from "./BarcodeScanner";
import ScanModeSwitch from "./ScanModeSwitch";
import VariantNotFoundAlert from "./VariantNotFoundAlert";
import QuickCreateProductDialog from "./QuickCreateProductDialog";
import { useVariantLookup } from "../hooks/use-variant-lookup";
import type { ScanMode } from "../domain/scan-mode.entity";
import { SEARCH_PATH } from "../lib/variant-routes";

export default function ScanPage() {
  const router = useRouter();
  const [skuMode, setSkuMode] = useState(false);
  const mode: ScanMode = skuMode ? "sku" : "barcode";
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

      <BarcodeScanner onScan={(code) => handleLookup(code, mode)} paused={pending} />

      <Button
        type="button"
        variant="outlined"
        className="w-full"
        disabled={pending}
        onClick={() => router.push(SEARCH_PATH)}
        data-test-id="variant-search-engine"
      >
        Motor de búsqueda…
      </Button>

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
    </div>
  );
}
