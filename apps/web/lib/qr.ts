import 'server-only';
import QRCode from 'qrcode';

/** QR code as an inline SVG string, in ink on white, with error correction for outdoor stickers. */
export const qrSvg = (text: string) =>
  QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'Q', margin: 1, color: { dark: '#17211D', light: '#FFFFFF' } });
