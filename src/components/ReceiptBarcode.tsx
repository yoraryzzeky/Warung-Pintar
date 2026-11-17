import React, { useMemo } from 'react';
import { buildCode128SvgData } from '../utils/receiptBarcode';

interface ReceiptBarcodeProps {
  value: string;
  label?: string;
}

export const ReceiptBarcode: React.FC<ReceiptBarcodeProps> = ({ value, label }) => {
  const { normalizedText, totalWidth, height, rects } = useMemo(
    () => buildCode128SvgData(value, 42),
    [value]
  );

  return (
    <div
      className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center"
      data-testid="receipt-barcode"
    >
      <svg
        role="img"
        aria-label={label || `Barcode Struk ${normalizedText}`}
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[220px] h-11"
        preserveAspectRatio="none"
      >
        <rect x={0} y={0} width={totalWidth} height={height} fill="#ffffff" />
        {rects.map((rect, idx) => (
          <rect
            key={idx}
            x={rect.x}
            y={0}
            width={rect.width}
            height={height}
            fill="#0f172a"
          />
        ))}
      </svg>
      <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-slate-700 mt-1 select-all">
        {normalizedText}
      </span>
    </div>
  );
};
