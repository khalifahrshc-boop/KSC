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
      color: #0f172a !important;
      font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
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
  const scale = options.scale || 2;
  const imageQuality = options.imageQuality || 0.98;
  const orientation = options.isLandscape ? 'landscape' : 'portrait';

  return {
    margin,
    filename,
    image: {
      type: 'jpeg' as const,
      quality: imageQuality
    },
    html2canvas: {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
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
  
  // Calculate exact printable width in mm:
  // Standard A4: 210mm x 297mm (Portrait) or 297mm x 210mm (Landscape)
  const margins = options.margin || [6, 6, 6, 6];
  const totalPageWidthMm = isLandscape ? 297 : 210;
  const printableWidthMm = totalPageWidthMm - (margins[1] + margins[3]); // 210 - 12 = 198mm

  // Create an isolated staging sandbox attached directly to document.body
  // This completely eliminates issues with modal scroll positions, parent flex offsets, CSS scale transforms, and RTL clipping.
  const sandbox = document.createElement('div');
  sandbox.id = 'universal-pdf-sandbox';
  sandbox.style.position = 'fixed';
  sandbox.style.top = '0';
  sandbox.style.left = '0';
  sandbox.style.zIndex = '-999999';
  sandbox.style.opacity = '1';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.margin = '0';
  sandbox.style.padding = '0';
  sandbox.style.background = '#ffffff';
  sandbox.style.color = '#0f172a';
  sandbox.style.display = 'block';
  sandbox.style.overflow = 'visible';
  sandbox.style.transform = 'none';
  sandbox.style.width = `${printableWidthMm}mm`;
  sandbox.style.minWidth = `${printableWidthMm}mm`;
  sandbox.style.maxWidth = `${printableWidthMm}mm`;
  sandbox.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

  // Clone the target element
  const clone = targetElement.cloneNode(true) as HTMLElement;
  clone.classList.add('universal-pdf-container');
  clone.style.width = '100%';
  clone.style.minWidth = '100%';
  clone.style.maxWidth = '100%';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.transform = 'none';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  clone.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

  // Remove any interactive or hover scale classes that might distort dimensions
  clone.classList.remove('hover:scale-[1.01]', 'scale-90', 'scale-95');

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // Wait for all images inside the clone (logos, QR codes) to finish loading
    const images = Array.from(sandbox.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (!img.crossOrigin) img.crossOrigin = 'anonymous';
        if (img.complete) return Promise.resolve(true);
        return new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 2000); // 2s timeout safeguard
        });
      })
    );

    // Give browser a microtask tick for font and layout computation
    await new Promise((r) => setTimeout(r, 100));

    const html2pdf = (await import('html2pdf.js')).default;
    const targetWidthPx = sandbox.offsetWidth || (isLandscape ? 1100 : 750);
    const config = getUniversalPdfConfig({ ...options, margin: margins, isLandscape, isRtl }, targetWidthPx);

    await runWithOklchSanitizer(async () => {
      const worker: any = html2pdf().set(config as any).from(clone).toPdf();
      
      await worker.get('pdf').then(function(pdf: any) {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = isLandscape ? 297 : 210;
        const pageHeight = isLandscape ? 210 : 297;
        const rightMargin = margins[1];
        const bottomMargin = margins[2];
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(140);
          
          const pageString = isRtl ? `صفحة ${i} من ${totalPages}` : `Page ${i} of ${totalPages}`;
          const x = isRtl ? rightMargin : (pageWidth - rightMargin);
          const y = pageHeight - (bottomMargin / 2);
          
          pdf.text(pageString, x, y, { align: isRtl ? 'left' : 'right' });
        }
      });

      await worker.save();
    });
  } catch (error) {
    console.error('Universal PDF Export failed:', error);
    throw error;
  } finally {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
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
