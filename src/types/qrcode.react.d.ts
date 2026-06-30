declare module 'qrcode.react' {
  import type { ComponentType, CanvasHTMLAttributes } from 'react';

  export interface QRCodeCanvasProps extends CanvasHTMLAttributes<HTMLCanvasElement> {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    marginSize?: number;
  }

  export const QRCodeCanvas: ComponentType<QRCodeCanvasProps>;
}
