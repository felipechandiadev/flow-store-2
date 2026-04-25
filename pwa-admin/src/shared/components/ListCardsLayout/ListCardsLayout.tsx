'use client'

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import IconButton from '../IconButton/IconButton';
import { TextField } from '../TextField/TextField';

type ListCardsLayoutKey = string | number;

export interface ListCardsLayoutProps<T> {
  title: string;
  cards: T[];
  onAddClick: () => void;
  renderCard: (card: T, index: number) => React.ReactNode;
  getCardKey?: (card: T, index: number) => ListCardsLayoutKey;
  searchPlaceholder?: string;
  searchParamKey?: string;
  basePath?: string;
  showSearch?: boolean;
  syncSearchWithUrl?: boolean;
  debounceMs?: number;
  onSearchChange?: (value: string) => void;
  emptyState?: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
  gridClassName?: string;
  addButtonAriaLabel?: string;
  ['data-test-id']?: string;
}

const DEFAULT_GRID_CLASSES = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

function resolveDefaultKey<T>(card: T, index: number): ListCardsLayoutKey {
  if (typeof card === 'object' && card !== null && 'id' in card) {
    const id = (card as { id?: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') {
      return id;
    }
  }

  return index;
}

function ListCardsLayout<T>({
  title,
  cards,
  onAddClick,
  renderCard,
  getCardKey,
  searchPlaceholder = 'Buscar...',
  searchParamKey = 'search',
  basePath,
  showSearch = true,
  syncSearchWithUrl = true,
  debounceMs = 300,
  onSearchChange,
  emptyState,
  headerActions,
  className = '',
  gridClassName = '',
  addButtonAriaLabel = 'Agregar',
  ['data-test-id']: dataTestId,
}: ListCardsLayoutProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchValue = searchParams.get(searchParamKey) || '';
  const [searchInput, setSearchInput] = React.useState(searchValue);

  React.useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  React.useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const pushSearchToUrl = React.useCallback((value: string) => {
    if (!syncSearchWithUrl) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set(searchParamKey, value.trim());
    } else {
      params.delete(searchParamKey);
    }

    if (params.has('page')) {
      params.set('page', '1');
    }

    const targetPath = basePath || pathname;
    const query = params.toString();
    router.replace(query ? `${targetPath}?${query}` : targetPath, { scroll: false });
  }, [basePath, pathname, router, searchParamKey, searchParams, syncSearchWithUrl]);

  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    setSearchInput(nextValue);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(nextValue);
      }

      pushSearchToUrl(nextValue);
    }, debounceMs);
  }, [debounceMs, onSearchChange, pushSearchToUrl]);

  const containerClass = ['w-full', className].filter(Boolean).join(' ');
  const cardsGridClass = [DEFAULT_GRID_CLASSES, gridClassName].filter(Boolean).join(' ');

  return (
    <div className={containerClass} data-test-id={dataTestId || 'list-cards-layout-root'}>
      <div className="flex flex-col gap-3 px-4 pt-4 pb-2 sm:flex-row sm:items-center" data-test-id="list-cards-layout-header">
        <div className="flex min-w-0 items-center">
          <div className="mr-4 flex items-center">
            <IconButton
              icon="Plus"
              variant="ghost"
              size="md"
              onClick={onAddClick}
              ariaLabel={addButtonAriaLabel}
              data-test-id="list-cards-layout-add-button"
            />
          </div>

          <h2 className="truncate whitespace-nowrap text-lg font-semibold text-foreground">{title}</h2>
        </div>

        <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto">
          {headerActions}
          {showSearch && (
            <TextField
              label=""
              name="list-cards-layout-search"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              startIcon="search"
              className="w-full sm:w-64"
              data-test-id="list-cards-layout-search-input"
            />
          )}
        </div>
      </div>

      <div className="px-4 pb-4" data-test-id="list-cards-layout-content">
        {cards.length === 0 ? (
          emptyState || (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
              No hay resultados para mostrar.
            </div>
          )
        ) : (
          <div className={cardsGridClass} data-test-id="list-cards-layout-grid">
            {cards.map((card, index) => (
              <React.Fragment key={getCardKey ? getCardKey(card, index) : resolveDefaultKey(card, index)}>
                {renderCard(card, index)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ListCardsLayout;