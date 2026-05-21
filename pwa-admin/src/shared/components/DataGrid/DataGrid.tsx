'use client'
import React from 'react';
import Header from './components/Header';
import Body from './components/Body';
import Footer from './components/Footer';
import { ColHeader } from './components/ColHeader';
import {
  calculateColumnStyles,
  DataGridStyles,
  useScreenSize,
  type DataGridCellOverflow,
} from './utils/columnStyles';

export type { DataGridCellOverflow };
import {
  dataGridFillViewportFallbackHeight,
  useDataGridFillViewportHeight,
} from './utils/useDataGridFillViewportHeight';
import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type DataGridColumnType =
  | 'string'
  | 'number'
  | 'date'
  | 'dateTime'
  | 'boolean'
  | 'id';

export interface DataGridColumn {
  field: string;
  headerName: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  type?: DataGridColumnType;
  sortable?: boolean;
  editable?: boolean;
  filterable?: boolean; // Nueva propiedad para controlar si la columna es filtrable
  // Use serializable render hints instead of passing functions from server
  renderCell?: (params: any) => React.ReactNode;
  renderType?: 'currency' | 'badge' | 'dateString';
  valueGetter?: (params: any) => any;
  align?: 'left' | 'right' | 'center';
  headerAlign?: 'left' | 'right' | 'center';
  hide?: boolean;
  /**
   * Contenido largo en la celda: `truncate` (ellipsis, default), `wrap`, `clip` u `visible`.
   * Aplica a texto por defecto, `renderCell` y `actionComponent` (contenedor con `min-w-0`).
   */
  cellOverflow?: DataGridCellOverflow;
  sticky?: boolean; // Fijar columna al lado derecho (compatibilidad hacia atrás)
  /**
   * Acciones de fila. Norma: columna con `field` típ. `'actions'`, `headerName: ''`, `filterable: false`, `sortable: false`;
   * en el componente, IconButtons con `variant="basicSecondary"` y `size="sm"`.
   */
  actionComponent?: React.ComponentType<{ row: any; column: DataGridColumn }>;
}

/** Variante del botón de alta en el header del DataGrid. */
export type DataGridAddButtonVariant = 'icon' | 'pillOutlined';

export interface DataGridProps {
  columns: DataGridColumn[];
  title?: string;
  rows?: any[];
  loading?: boolean; // Deprecated: mantener para compatibilidad hacia atrás
  enableSearch?: boolean; // Deprecated: usar showSearch en su lugar
  enablePagination?: boolean; // Deprecated: siempre habilitado
  sort?: 'asc' | 'desc';
  sortField?: string;
  search?: string;
  filters?: string;
  height?: number | string;
  /**
   * Ajusta la altura del grid para que el pie quede al borde inferior del viewport;
   * el cuerpo (filas) hace scroll dentro del espacio restante. Ignora `height` si está activo.
   */
  fillViewport?: boolean;
  /** Margen inferior en px al calcular `fillViewport` (p. ej. `pb-6` del `<main>`). Default 24. */
  viewportBottomInset?: number;
  totalRows?: number;
  totalGeneral?: number;
  createForm?: React.ReactNode;
  createFormTitle?: string;
  onAddClick?: () => void; // Callback para el botón + (abre diálogo externo)
  addDisabled?: boolean; // Deshabilita el botón + sin ocultarlo
  /** `icon` (default): IconButton +. `pillOutlined`: ButtonPill outlined con icono + y texto (p. ej. "Recepción"). */
  addButtonVariant?: DataGridAddButtonVariant;
  /** Texto del pill outlined (el icono + va aparte, sin prefijo en el texto). */
  addButtonLabel?: string;
  ["data-test-id"]?: string;
  excelUrl?: string; // Absolute URL for Excel export endpoint
  excelFields?: string;
  limit?: number;
  onExportExcel?: () => Promise<void>; // Callback para exportar a Excel
  showBorder?: boolean;
  showSortButton?: boolean;
  showFilterButton?: boolean;
  showExportButton?: boolean;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
  // Expandable rows
  expandable?: boolean; // Habilita filas expandibles
  expandableRowContent?: (row: any) => React.ReactNode; // Contenido del panel expandido
  defaultExpandedRowIds?: (string | number)[]; // IDs de filas expandidas por defecto
  // Header slots
  headerActions?: React.ReactNode; // Componentes adicionales en el header (ej: filtros externos)
  // Sticky actions column
  pinActionsColumn?: boolean;
  actionsColumnField?: string;
  /** Clic en la fila (p. ej. cambiar selección vía URL). */
  onRowClick?: (row: any) => void;
  /** Resalta la fila cuyo `row.id` coincide (selección controlada desde fuera). */
  selectedRowId?: string | number | null;
  /** Oculta pie de paginación (listas cortas estáticas). */
  showFooter?: boolean;
}

const DataGrid: React.FC<DataGridProps> = ({
  columns,
  title,
  rows,
  loading: _deprecated_loading = false, // deprecated
  enableSearch, // deprecated: map to showSearch
  enablePagination, // deprecated: always enabled
  sort,
  sortField,
  search,
  filters,
  height = '70vh',
  fillViewport = false,
  viewportBottomInset = 24,
  totalRows,
  totalGeneral,
  createForm,
  createFormTitle,
  onAddClick,
  addDisabled,
  addButtonVariant = 'icon',
  addButtonLabel,
  ["data-test-id"]: dataTestId,
  excelUrl,
  excelFields,
  limit = 25,
  onExportExcel,
  showBorder = false,
  showSortButton = true,
  showFilterButton = true,
  showExportButton = true,
  showSearch,
  onSearchChange,
  expandable = false,
  expandableRowContent,
  defaultExpandedRowIds = [],
  headerActions,
  pinActionsColumn = false,
  actionsColumnField = 'actions',
  onRowClick,
  selectedRowId = null,
  showFooter = true,
}) => {
  // Map deprecated props to new ones
  const effectiveShowSearch = showSearch !== undefined ? showSearch : (enableSearch !== undefined ? enableSearch : true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any[]>(rows || []);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(totalRows || (rows ? rows.length : 0));
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string | number>>(new Set(defaultExpandedRowIds));
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const columnHeaderRowRef = useRef<HTMLDivElement>(null);
  const fillViewportHeightPx = useDataGridFillViewportHeight(
    fillViewport,
    containerRef,
    viewportBottomInset,
  );
  /**
   * Distancia desde el borde superior del área con scroll hasta donde debe pegarse la fila expandida
   * (= debajo del header sticky). Se mide con rect para incluir bordes y evitar que la fila quede tapada.
   */
  const [expandedStickyRowTopPx, setExpandedStickyRowTopPx] = useState(44);

  useLayoutEffect(() => {
    const scrollEl = scrollAreaRef.current;
    const headerEl = columnHeaderRowRef.current;
    if (!scrollEl || !headerEl) {
      return;
    }

    /**
     * `sticky top` se resuelve respecto al scrollport del contenedor con overflow (padding edge),
     * no al viewport. `getBoundingClientRect()` puede desalinearse con zoom, bordes del scroll o DPR.
     * `offsetTop + offsetHeight` del header respecto a su offsetParent (el área con scroll) coincide
     * con la distancia desde el borde superior del scrollport hasta el borde inferior del header.
     */
    const measure = () => {
      const h = columnHeaderRowRef.current;
      const s = scrollAreaRef.current;
      if (!h || !s) return;
      const topPx = h.offsetTop + h.offsetHeight;
      if (topPx > 0) {
        setExpandedStickyRowTopPx(Math.round(topPx));
      }
    };

    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(headerEl);
    ro.observe(scrollEl);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  // Inicializar filterMode basado en si hay filtros activos en la URL
  const [filterMode, setFilterMode] = useState(() => {
    const filtration = searchParams.get('filtration') === 'true';
    return filtration;
  });

  // Hook para detectar tamaño de pantalla
  const { width: screenWidth, isMobile } = useScreenSize();

  const toggleFilterMode = () => setFilterMode((v) => !v);

  // Toggle expandir/colapsar una fila
  const toggleRowExpanded = (rowId: string | number) => {
    setExpandedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  // Update data when rows prop changes (server-side updates)
  useEffect(() => {
    setData(rows || []);
    setTotal(totalRows || (rows ? rows.length : 0));
  }, [rows, totalRows]);

  // Sincronizar filterMode con la URL
  useEffect(() => {
    const filtration = searchParams.get('filtration') === 'true';
    setFilterMode(filtration);
  }, [searchParams]);

  // Inicializar limit en la URL si no está presente
  useEffect(() => {
    const currentLimit = searchParams.get('limit');
    if (!currentLimit) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('limit', limit.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, limit, router]);

  const containerClasses = [
    DataGridStyles.container,
    DataGridStyles.responsive.minWidth,
    DataGridStyles.responsive.mobileScroll,
    fillViewport ? 'min-h-0' : '',
    showBorder ? 'border border-border' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const visibleColumns = columns.filter((c) => !c.hide);
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  const containerStyle = useMemo((): React.CSSProperties => {
    if (fillViewport) {
      if (fillViewportHeightPx != null) {
        return { height: fillViewportHeightPx };
      }
      return { height: dataGridFillViewportFallbackHeight(viewportBottomInset) };
    }
    return {
      height: typeof height === 'number' ? `${height}px` : height,
    };
  }, [fillViewport, fillViewportHeightPx, height, viewportBottomInset]);

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={containerStyle}
      data-test-id={dataTestId || "data-grid-root"}
    >
      <div className="shrink-0">
        <Header
        title={title} 
        filterMode={filterMode} 
        onToggleFilterMode={toggleFilterMode}
        columns={columns}
        createForm={createForm}
        createFormTitle={createFormTitle}
        onAddClick={onAddClick}
        addDisabled={addDisabled}
        addButtonVariant={addButtonVariant}
        addButtonLabel={addButtonLabel}
        screenWidth={screenWidth}
        onExportExcel={onExportExcel}
        headerActions={headerActions}
        showSortButton={showSortButton}
        showFilterButton={showFilterButton}
        showExportButton={showExportButton}
        showSearch={effectiveShowSearch}
        onSearchChange={onSearchChange}
        />
      </div>
      {/* Scrollable container for columns header and body */}
      <div ref={scrollAreaRef} className={`${DataGridStyles.scrollContainer} relative`}>
        {/* Column Headers Row */}
        <div 
          ref={columnHeaderRowRef}
          className={`${DataGridStyles.headerRow} sticky top-0 z-30 w-full min-w-0 bg-background`}
        >
          {/* Expand column header placeholder */}
          {expandable && (
            <div className="w-10 min-w-[40px] shrink-0" />
          )}
          {visibleColumns.map((column, i) => {
            const style = computedStyles[i];
            const isPinnedActionsColumn =
              pinActionsColumn && column.field === actionsColumnField;

            return (
              <ColHeader
                key={column.field}
                column={column}
                computedStyle={style}
                filterMode={filterMode}
                isPinned={isPinnedActionsColumn}
                sortingEnabled={showSortButton}
              />
            );
          })}
        </div>
        {/* Body */}
        <Body 
          columns={columns} 
          rows={loading ? [] : data} 
          filterMode={filterMode} 
          screenWidth={screenWidth}
          expandable={expandable}
          expandedRowIds={expandedRowIds}
          onToggleExpand={toggleRowExpanded}
          expandableRowContent={expandableRowContent}
          pinActionsColumn={pinActionsColumn}
          actionsColumnField={actionsColumnField}
          stickyExpandedRowTopPx={expandable ? expandedStickyRowTopPx : undefined}
          onRowClick={onRowClick}
          selectedRowId={selectedRowId}
        />
      </div>
      {showFooter ? (
        <div className="shrink-0">
          <Footer total={total} totalGeneral={totalGeneral} />
        </div>
      ) : null}
    </div>
  );
};

export default DataGrid;
