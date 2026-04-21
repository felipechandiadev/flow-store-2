'use client';

import React from 'react';
import Dialog from '@/shared/components/Dialog';
import { Button } from '@/shared/components/Button';
import { usePrint } from './usePrint';
import { PrintDialogProps } from './PrintDialog.types';
import styles from './PrintDialog.module.css';

export const PrintDialog: React.FC<PrintDialogProps> = ({
  open,
  onClose,
  children,
  title = 'Imprimir',
  fileName = 'documento',
  disablePrint = false,
  printLoading = false,
  showPrintButton = true,
  size = 'md',
  customSize,
  maxWidth,
  fullWidth = false,
  scroll = 'body',
  zIndex = 50,
  contentStyle,
  extraActions,
  pageSize = 'A4',
  pageOrientation = 'portrait',
}) => {
  const { contentRef, handlePrint } = usePrint(fileName, pageSize, pageOrientation);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      customSize={customSize}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      scroll={scroll}
      zIndex={zIndex}
      contentStyle={contentStyle}
    >
      <div className={styles.printContainer}>
        {/* Contenido a imprimir */}
        <div ref={contentRef} className={styles.printContent}>
          {children}
        </div>

        {/* Botones de acción */}
          <div className={styles.actions}>
            {extraActions && <div className={styles.extraActions}>{extraActions}</div>}
          {showPrintButton && (
            <Button
              variant="primary"
              disabled={disablePrint}
              loading={printLoading}
              onClick={() => {
                handlePrint();
              }}
            >
              {printLoading ? 'Cargando análisis...' : '🖨️ Imprimir'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default PrintDialog;
