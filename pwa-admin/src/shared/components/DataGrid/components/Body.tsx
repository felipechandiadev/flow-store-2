'use client'
import React from 'react';
import { useState } from 'react';
import { calculateColumnStyles } from '../utils/columnStyles';
import type { DataGridColumn } from '../DataGrid';
import IconButton from '@/shared/components/IconButton';

interface BodyProps {
  columns?: DataGridColumn[];
  rows?: any[];
  filterMode?: boolean;
  screenWidth?: number;
  expandable?: boolean;
  expandedRowIds?: Set<string | number>;
  onToggleExpand?: (rowId: string | number) => void;
  expandableRowContent?: (row: any) => React.ReactNode;
  pinActionsColumn?: boolean;
  actionsColumnField?: string;
  /** Si está definido y la fila está expandida, la fila de datos queda `sticky` bajo el header al hacer scroll. */
  stickyExpandedRowTopPx?: number;
  onRowClick?: (row: any) => void;
  selectedRowId?: string | number | null;
}

const Body: React.FC<BodyProps> = ({ 
  columns = [], 
  rows = [], 
  filterMode = false, 
  screenWidth = 1024,
  expandable = false,
  expandedRowIds = new Set(),
  onToggleExpand,
  expandableRowContent,
  pinActionsColumn = false,
  actionsColumnField = 'actions',
  stickyExpandedRowTopPx,
  onRowClick,
  selectedRowId = null,
}) => {
  const [hoveredRowId, setHoveredRowId] = useState<string | number | null>(null);
  const visibleColumns = columns.filter((c) => !c.hide);

  // Usar utilidad centralizada para calcular estilos
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  return (
    <div className="flex-1" data-test-id="data-grid-body">
      {/* Renderizar por filas para sincronizar alturas */}
      {rows.map((row, rowIndex) => {
        const rowId = row.id ?? rowIndex;
        const isExpanded = expandedRowIds.has(rowId);
        const isSelected =
          selectedRowId != null && selectedRowId !== '' && String(rowId) === String(selectedRowId);
        
        return (
          <React.Fragment key={rowId}>
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`flex min-w-full items-stretch data-grid-row ${
                onRowClick ? 'cursor-pointer' : ''
              } ${
                expandable && isExpanded && stickyExpandedRowTopPx != null
                  ? 'sticky z-[25] border-b border-border bg-background shadow-sm'
                  : ''
              }`}
              style={{
                minWidth: 'max-content',
                ...(expandable && isExpanded && stickyExpandedRowTopPx != null
                  ? { top: stickyExpandedRowTopPx }
                  : undefined),
              }}
              data-test-id="data-grid-row"
              aria-selected={onRowClick ? isSelected : undefined}
            >
              {/* Expand/Collapse button */}
              {expandable && (
                <div
                  className="w-10 min-w-[40px] px-1 py-1 border-b border-border flex items-center justify-center"
                    style={{
                    backgroundColor: hoveredRowId === rowId ? "var(--color-hover)" : "transparent",
                  }}
                  onMouseEnter={() => setHoveredRowId(rowId)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  <IconButton
                    icon="ChevronDown"
                    variant="basicSecondary"
                    size="sm"
                    onClick={() => onToggleExpand?.(rowId)}
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    ariaLabel={isExpanded ? 'Colapsar fila' : 'Expandir fila'}
                  />
                </div>
              )}
              {visibleColumns.map((column, colIndex) => {
                // compute raw value from row field
                const rawValue = row[column.field];
                const style = computedStyles[colIndex];
                const isPinnedActionsColumn =
                  pinActionsColumn && column.field === actionsColumnField;
                const rowBackgroundColor = isSelected
                  ? "color-mix(in srgb, var(--color-primary) 16%, var(--color-background))"
                  : hoveredRowId === rowId
                    ? "var(--color-hover)"
                    : "var(--color-background)";

                const cellStyle = {
                  ...style,
                  backgroundColor: rowBackgroundColor,
                  ...(isPinnedActionsColumn
                    ? {
                        position: 'sticky' as const,
                        right: 0,
                        zIndex: 8,
                        borderLeft: "1px solid var(--color-border)",
                        flex: '0 0 auto',
                      }
                    : {}),
                };

                // if a valueGetter is provided, use it to derive the value
                const value = column.valueGetter
                  ? column.valueGetter({ row, value: rawValue, column, rowIndex })
                  : rawValue;

                // Renderizar actionComponent si existe
                if (column.actionComponent) {
                  const ActionComponent = column.actionComponent;
                  return (
                    <div
                      key={`${column.field}-${rowId}`}
                      className="px-3 py-1 border-b border-border text-xs flex items-center justify-start"
                      style={cellStyle}
                      onMouseEnter={() => setHoveredRowId(rowId)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      <ActionComponent row={row} column={column} />
                    </div>
                  );
                }

                // Usar renderCell personalizado si existe
                if (column.renderCell) {
                  return (
                    <div
                      key={`${column.field}-${rowId}`}
                      className="px-3 py-1 border-b border-border text-xs flex items-center justify-start"
                      style={cellStyle}
                      onMouseEnter={() => setHoveredRowId(rowId)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      {column.renderCell({ row, value, column })}
                    </div>
                  );
                }

                return (
                  <div
                    key={`${column.field}-${rowId}`}
                    className="px-3 py-1 border-b border-border text-xs flex items-center justify-start"
                    style={cellStyle}
                    onMouseEnter={() => setHoveredRowId(rowId)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <span className="truncate">{value !== null && value !== undefined ? String(value) : '-'}</span>
                  </div>
                );
              })}
            </div>
            {/* Expanded content panel */}
            {expandable && isExpanded && expandableRowContent && (
              <div
                className="min-w-full w-full max-w-none bg-neutral/50 border-b border-border"
                style={{ minWidth: "max-content" }}
                data-test-id="data-grid-expanded-row"
              >
                <div className="w-full min-w-0 max-w-none p-4">
                  {expandableRowContent(row)}
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Body;