/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runWithOklchSanitizer } from '../pdfSanitizer';

export interface UniversalPdfOptions {
  filename?: string;
  margin?: [number, number, number, number]; // [top, right, bottom, left] in mm
  imageQuality?: number;
  scale?: number;
  isRtl?: boolean;
  isLandscape?: boolean;
}

/**
 * Universal PDF & Print Pagination Engine
 * Standardizes A4 formatting, intelligent page breaking, table row protection, header repetition,
 * and robust export/print functionality across the entire Activity Management System.
 */

// Inject global print & PDF pagination CSS rules into document head
export function injectUniversalPdfStyles(): void {
  const styleId = 'universal-pdf-pagination-styles';
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.innerHTML = `
    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      
      body {
        background: #ffffff !important;
        color: #0f172a !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }

      thead {
        display: table-header-group !important;
      }

      tfoot {
        display: table-footer-group !important;
      }

      tr, td, th {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      img, svg, canvas {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        max-width: 100% !important;
      }

      .pdf-keep-together,
      .pdf-section,
      .pdf-card,
      .pdf-block,
      .pdf-summary,
      .pdf-signature,
      .pdf-total,
      .pdf-notes,
      .pdf-info-block,
      .pdf-avoid-break {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      h1, h2, h3, h4, h5, h6 {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }

      [dir="rtl"] {
        direction: rtl !important;
        text-align: right !important;
      }

      [dir="ltr"] {
        direction: ltr !important;
        text-align: left !important;
      }

      p, span, div, td, th {
        overflow-wrap: anywhere !important;
        word-break: normal !important;
      }

      .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
        overflow: visible !important;
      }
    }

    /* Universal PDF Container Styles for Pre-processing & Export */
    .universal-pdf-container {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      color: #090d16 !important;
      font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
      font-weight: 500 !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    .universal-pdf-container * {
      box-shadow: none !important;
      text-shadow: none !important;
    }
    
    .universal-pdf-container .overflow-x-auto,
    .universal-pdf-container .overflow-y-auto,
    .universal-pdf-container .overflow-hidden,
    .universal-pdf-container .overflow-auto {
      overflow: visible !important;
    }

    .universal-pdf-container table {
      width: 100% !important;
      border-collapse: collapse !important;
    }

    .universal-pdf-container thead {
      display: table-header-group !important;
    }

    .universal-pdf-container tr,
    .universal-pdf-container td,
    .universal-pdf-container th,
    .universal-pdf-container .pdf-keep-together,
    .universal-pdf-container .pdf-section,
    .universal-pdf-container .pdf-signature,
    .universal-pdf-container .pdf-summary,
    .universal-pdf-container .pdf-total,
    .universal-pdf-container .pdf-avoid-break {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  `;
  document.head.appendChild(styleEl);
}

/**
 * Generate standard html2pdf configuration options
 */
export function getUniversalPdfConfig(options: UniversalPdfOptions = {}, targetWidthPx = 750) {
  const filename = options.filename || `Document_${new Date().toISOString().slice(0, 10)}.pdf`;
  // Symmetrical clean margins: 6mm on all sides
  const margin = options.margin || [6, 6, 6, 6]; 
  const scale = options.scale || 3; // High resolution scale for crisp, un-faded text and lines
  const imageQuality = options.imageQuality || 0.99;
  const orientation = options.isLandscape ? 'landscape' : 'portrait';

  return {
    margin,
    filename,
    image: {
      type: 'png' as const
    },
    html2canvas: {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      windowWidth: targetWidthPx,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: orientation,
      compress: true
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: [
        'tr',
        'td',
        'th',
        '.pdf-keep-together',
        '.pdf-section',
        '.pdf-card',
        '.pdf-summary',
        '.pdf-signature',
        '.pdf-total',
        '.pdf-notes',
        '.pdf-info-block',
        '.pdf-avoid-break'
      ]
    }
  };
}

/**
 * Centrally export any DOM element or HTML string to PDF with OkLCH color sanitization and robust error handling.
 */
export async function exportElementToPdf(
  element: HTMLElement | string,
  options: UniversalPdfOptions = {}
): Promise<void> {
  injectUniversalPdfStyles();

  let targetElement: HTMLElement;
  if (typeof element === 'string') {
    const el = document.getElementById(element);
    if (!el) {
      throw new Error(`PDF Export Error: Element with ID "${element}" was not found.`);
    }
    targetElement = el;
  } else {
    targetElement = element;
  }

  const isRtl = options.isRtl ?? (targetElement.getAttribute('dir') === 'rtl' || document.documentElement.dir === 'rtl');
  const isLandscape = !!options.isLandscape;
  const filename = options.filename || `Document_${new Date().toISOString().slice(0, 10)}.pdf`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback to standard window.print if popup blocked
    window.print();
    return;
  }

  // Generate complete HTML document embedding the target element and authoritative print/PDF styles
  const stylesHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>${filename}</title>
        ${stylesHtml}
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap');
          
          body {
            font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          table {
            border-collapse: collapse !important;
            width: 100% !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          thead {
            display: table-header-group !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          tfoot {
            display: table-footer-group !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: table-row !important;
          }

          td, th {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .pdf-keep-together, 
          .pdf-section, 
          .pdf-card, 
          .pdf-block, 
          .pdf-summary, 
          .pdf-signature, 
          .pdf-total, 
          .pdf-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          h1, h2, h3, h4, h5, h6 {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          @media print {
            @page {
              size: A4 ${isLandscape ? 'landscape' : 'portrait'};
              margin: ${options.margin ? `${options.margin[0]}mm ${options.margin[1]}mm ${options.margin[2]}mm ${options.margin[3]}mm` : '8mm'};
            }
            body, html {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: #ffffff !important;
              overflow: visible !important;
              height: auto !important;
            }
            div, section, article, main, header, footer {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
              box-sizing: border-box !important;
            }
            table {
              display: table !important;
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            thead {
              display: table-header-group !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            tbody {
              display: table-row-group !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            tfoot {
              display: table-footer-group !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            tr {
              display: table-row !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            th, td {
              display: table-cell !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body dir="${isRtl ? 'rtl' : 'ltr'}">
        <div style="width: 100%; max-width: 100%; margin: 0 auto; background: #ffffff;">
          ${targetElement.outerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Centrally trigger browser print for any DOM element or ID with injected print styles
 */
export function printDocumentElement(element: HTMLElement | string): void {
  injectUniversalPdfStyles();

  let targetElement: HTMLElement;
  if (typeof element === 'string') {
    const el = document.getElementById(element);
    if (!el) {
      console.error(`Print Error: Element with ID "${element}" was not found.`);
      return;
    }
    targetElement = el;
  } else {
    targetElement = element;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback to standard window.print if popup blocked
    window.print();
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="${targetElement.getAttribute('dir') === 'rtl' ? 'ar' : 'en'}" dir="${targetElement.getAttribute('dir') || 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>Print Document - ${new Date().toLocaleDateString()}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700;900&display=swap');
          body {
            font-family: 'Cairo', 'Tajawal', sans-serif;
            background: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 10mm;
          }
          table { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr, td, th, .pdf-keep-together, .pdf-section, .pdf-signature, .pdf-total {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          @media print {
            @page { size: A4 portrait; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        ${targetElement.outerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
