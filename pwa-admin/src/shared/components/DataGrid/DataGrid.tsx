'use client'
import React from 'react';
import Header from './components/Header';
import Body from './components/Body';
import Footer from './components/Footer';
import { ColHeader } from './components/ColHeader';
import { calculateColumnStyles, DataGridStyles, useScreenSize } from './utils/columnStyles';
import { useState, useEffect } from 'react';
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
  sticky?: boolean; // Fijar columna al lado derecho (compatibilidad hacia atrás)
  /**
   * Acciones de fila. Norma: columna con `field` típ. `'actions'`, `headerName: ''`, `filterable: false`, `sortable: false`;
   * en el componente, IconButtons con `variant="basicSecondary"` y `size="sm"`.
   */
  actionComponent?: React.ComponentType<{ row: any; column: DataGridColumn }>;
}

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
  totalRows?: number;
  totalGeneral?: number;
  createForm?: React.ReactNode;
  createFormTitle?: string;
  onAddClick?: () => void; // Callback para el botón + (abre diálogo externo)
  addDisabled?: boolean; // Deshabilita el botón + sin ocultarlo
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
  totalRows,
  totalGeneral,
  createForm,
  createFormTitle,
  onAddClick,
  addDisabled,
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
}) => {
  // Map deprecated props to new ones
  const effectiveShowSearch = showSearch !== undefined ? showSearch : (enableSearch !== undefined ? enableSearch : true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any[]>(rows || []);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(totalRows || (rows ? rows.length : 0));
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string | number>>(new Set(defaultExpandedRowIds));
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

  const containerClasses = `${DataGridStyles.container} ${DataGridStyles.responsive.minWidth} ${DataGridStyles.responsive.mobileScroll} ${showBorder ? 'border border-border' : ''}`.trim();
  const visibleColumns = columns.filter((c) => !c.hide);
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  return (
    <div className={containerClasses} style={{ height: typeof height === 'number' ? `${height}px` : height }} data-test-id={dataTestId || "data-grid-root"}>
      {/* Header */}
      <Header
        title={title ?? ''} 
        filterMode={filterMode} 
        onToggleFilterMode={toggleFilterMode}
        columns={columns}
        createForm={createForm}
        createFormTitle={createFormTitle}
        onAddClick={onAddClick}
        addDisabled={addDisabled}
        screenWidth={screenWidth}
        onExportExcel={onExportExcel}
        headerActions={headerActions}
        showSortButton={showSortButton}
        showFilterButton={showFilterButton}
        showExportButton={showExportButton}
        showSearch={effectiveShowSearch}
        onSearchChange={onSearchChange}
      />
      {/* Scrollable container for columns header and body */}
      <div className={`${DataGridStyles.scrollContainer} relative`}>
        {/* Column Headers Row */}
        <div 
          className={`${DataGridStyles.headerRow} sticky top-0 z-30 bg-background`}
          style={{
            minWidth: 'max-content'
          }}
        >
          {/* Expand column header placeholder */}
          {expandable && (
            <div className="w-10 min-w-[40px] border-b border-border" />
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
        />
      </div>
      {/* Footer - siempre pegado abajo */}
      <Footer total={total} totalGeneral={totalGeneral}/>
    </div>
  );
};

export default DataGrid;
