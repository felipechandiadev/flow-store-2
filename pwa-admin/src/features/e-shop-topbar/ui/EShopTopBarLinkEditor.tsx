"use client";

import { TextField } from "@/shared/components/TextField/TextField";
import { Select } from "@/shared/components/Select";
import type { EShopNavLink, EShopNavLinkKind } from "../types/eshop-topbar.types";
import {
  INTERNAL_ROUTE_OPTIONS,
  NAV_LINK_KIND_LABELS,
} from "../types/eshop-topbar.types";

type Props = {
  link: EShopNavLink;
  onChange: (link: EShopNavLink) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function EShopTopBarLinkEditor({
  link,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: Props) {
  const setKind = (kind: EShopNavLinkKind) => {
    let href = link.href;
    if (kind === "route") href = "/productos";
    if (kind === "anchor") href = "#donde-estamos";
    if (kind === "external") href = "https://";
    onChange({ ...link, kind, href });
  };

  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-background p-4"
      data-test-id={`topbar-link-${link.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={link.enabled}
            onChange={(e) => onChange({ ...link, enabled: e.target.checked })}
          />
          Visible
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded border border-destructive px-2 py-1 text-xs text-destructive"
            onClick={onRemove}
          >
            Eliminar
          </button>
        </div>
      </div>
      <TextField
        label="Etiqueta"
        value={link.label}
        onChange={(e) => onChange({ ...link, label: e.target.value })}
      />
      <Select
        label="Tipo"
        value={link.kind}
        onChange={(v) => setKind(v as EShopNavLinkKind)}
        options={(
          Object.entries(NAV_LINK_KIND_LABELS) as [EShopNavLinkKind, string][]
        ).map(([id, label]) => ({ id, label }))}
      />
      {link.kind === "route" ? (
        <Select
          label="Ruta"
          value={link.href}
          onChange={(v) => onChange({ ...link, href: String(v ?? "") })}
          options={INTERNAL_ROUTE_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
        />
      ) : (
        <TextField
          label={link.kind === "anchor" ? "Ancla" : "URL"}
          value={link.href}
          onChange={(e) => onChange({ ...link, href: e.target.value })}
          placeholder={link.kind === "anchor" ? "#donde-estamos" : "https://..."}
        />
      )}
    </div>
  );
}
