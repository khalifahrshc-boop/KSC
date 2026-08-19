/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkPermit, StartCard, SystemSettings } from '../../types';
import { PermitPrintableDoc } from './PermitPrintableDoc';
import { StartCardPrintableDoc } from './StartCardPrintableDoc';
import { generateQRCode, generatePTWQRCode, generateStartCardQRCode } from '../../utils/ptwCalculations';
import { runWithOklchSanitizer } from '../../utils/pdfSanitizer';
import { 
  X, 
  Printer, 
  Download, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw,
  Languages,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Smartphone,
  Check
} from 'lucide-react';

interface PTWPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'permit' | 'startCard';
  permit?: WorkPermit | null;
  startCard?: StartCard | null;
  settings: SystemSettings;
  lang: 'ar' | 'en';
}

export const PTWPrintPreviewModal: React.FC<PTWPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  type,
  permit,
  startCard,
  settings,
  lang: initialLang
}) => {
  const [docLang, setDocLang] = useState<'ar' | 'en'>(initialLang);
  const isRtl = docLang === 'ar';

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Zoom & Viewport state for mobile and desktop
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');
  const [viewportWidth, setViewportWidth] = useState<number>(800);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDocLang(initialLang);
  }, [initialLang, isOpen]);

  // Update viewport measurement on resize or open
  useEffect(() => {
    if (!isOpen) return;
    const updateDimensions = () => {
      if (viewportRef.current) {
        setViewportWidth(viewportRef.current.clientWidth);
      }
    };
    updateDimensions();
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    if (type === 'permit' && permit) {
      generatePTWQRCode(permit, isRtl ? settings.companyNameAr : settings.companyNameEn).then(url => {
        if (isMounted && url) setQrCodeUrl(url);
      });
    } else if (type === 'startCard' && startCard) {
      generateStartCardQRCode(startCard, isRtl ? startCard.projectNameAr : startCard.projectNameEn).then(url => {
        if (isMounted && url) setQrCodeUrl(url);
      });
    }

    return () => { isMounted = false; };
  }, [isOpen, type, permit, startCard, settings, isRtl]);

  if (!isOpen) return null;

  const docId = type === 'permit' 
    ? `permit-preview-doc-${permit?.id || 'new'}` 
    : `startcard-preview-doc-${startCard?.id || 'new'}`;

  const docTitle = type === 'permit'
    ? (isRtl ? `تصريح عمل رسمي: ${permit?.permitNumber || ''}` : `Official Work Permit: ${permit?.permitNumber || ''}`)
    : (isRtl ? `كارت بدء العمل: ${startCard?.cardNumber || ''}` : `Official Start Card: ${startCard?.cardNumber || ''}`);

  // Handle direct browser print
  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add('printing-ptw-active');
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error('Print error:', e);
      } finally {
        setIsPrinting(false);
        document.body.classList.remove('printing-ptw-active');
      }
    }, 400);
  };

  // Standard A4 width in 96 DPI CSS pixels is 794px (~210mm)
  const standardA4Px = 794;
  const paddingOffset = window.innerWidth < 640 ? 20 : 48;
  const fitScale = Math.min(1, Math.max(0.35, (viewportWidth - paddingOffset) / standardA4Px));
  const effectiveScale = zoomMode === 'fit' ? fitScale : zoomMode;

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    const element = document.getElementById(docId);
    if (!element) {
      alert(isRtl ? 'تعذر العثور على عنصر الوثيقة للتحميل' : 'Document element not found');
      return;
    }

    setIsDownloadingPdf(true);
    const previousZoom = zoomMode;
    // Reset zoom temporarily to 1 for pristine capture
    setZoomMode(1);
    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const fileName = type === 'permit'
        ? `${permit?.permitNumber || 'PTW_Permit'}_${permit?.status || 'Doc'}.pdf`
        : `${startCard?.cardNumber || 'StartCard'}_Rev${startCard?.revision || 1}.pdf`;

      const opt = {
        margin: [6, 4, 6, 4] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794,
          logging: false
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['.pdf-avoid-break', 'tr', 'table'] 
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(element).save();
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(isRtl ? 'حدث خطأ أثناء تصدير ملف PDF' : 'An error occurred during PDF generation');
    } finally {
      setZoomMode(previousZoom);
      setIsDownloadingPdf(false);
    }
  };

  const handleZoomIn = () => {
    if (zoomMode === 'fit') {
      setZoomMode(Math.min(1.5, Number((fitScale + 0.2).toFixed(2))));
    } else {
      setZoomMode(prev => Math.min(1.5, Number((Number(prev) + 0.15).toFixed(2))));
    }
  };

  const handleZoomOut = () => {
    if (zoomMode === 'fit') {
      setZoomMode(Math.max(0.4, Number((fitScale - 0.15).toFixed(2))));
    } else {
      setZoomMode(prev => Math.max(0.4, Number((Number(prev) - 0.15).toFixed(2))));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="bg-slate-100 dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[96vh] flex flex-col overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Top Header Bar */}
        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${
              type === 'permit' 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50' 
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
            } flex items-center justify-center shrink-0`}>
              {type === 'permit' ? <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" /> : <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {docTitle}
                </h2>
                <span className={`hidden xs:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${
                  type === 'permit' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  A4
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isRtl ? 'معاينة المستند قبل الطباعة أو التنزيل' : 'Print Preview & PDF Export'}
              </p>
            </div>
          </div>

          {/* Desktop Top Actions */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Zoom Controls Pill */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={handleZoomOut}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                title={isRtl ? 'تصغير المعاينة' : 'Zoom Out'}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={() => setZoomMode('fit')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  zoomMode === 'fit' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title={isRtl ? 'ملائمة الشاشة تلقائياً' : 'Fit to Screen'}
              >
                {isRtl ? 'ملائمة' : 'Fit'}
              </button>

              <button
                onClick={() => setZoomMode(1)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  zoomMode === 1 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title={isRtl ? 'الحجم الفعلي 100%' : '100% Scale'}
              >
                100%
              </button>

              <button
                onClick={handleZoomIn}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                title={isRtl ? 'تكبير المعاينة' : 'Zoom In'}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Language Switcher */}
            <button
              onClick={() => setDocLang(prev => prev === 'ar' ? 'en' : 'ar')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
              title={isRtl ? 'تبديل لغة الوثيقة' : 'Switch Document Language'}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{docLang === 'ar' ? 'English Doc' : 'عربي'}</span>
            </button>

            {/* Direct Print */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 active:scale-95 cursor-pointer"
              title={isRtl ? 'طباعة مباشرة عبر المتصفح' : 'Direct Browser Print'}
            >
              <Printer className="w-4 h-4" />
              <span>{isRtl ? 'طباعة' : 'Print'}</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className={`px-4 py-1.5 rounded-lg ${
                type === 'permit' 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95 cursor-pointer`}
              title={isRtl ? 'تصدير وحفظ ملف PDF' : 'Download High-Res PDF'}
            >
              {isDownloadingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingPdf ? (isRtl ? 'جاري الإنشاء...' : 'Generating...') : (isRtl ? 'تنزيل PDF' : 'Download PDF')}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ms-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Top Close */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Control Strip (Below Top Header on small screens) */}
        <div className="flex sm:hidden items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 text-xs shrink-0">
          {/* Zoom Buttons on Mobile */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setZoomMode('fit')}
              className={`px-2 py-1 rounded text-[10.5px] font-bold ${
                zoomMode === 'fit' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold' : 'text-slate-600'
              }`}
            >
              {isRtl ? 'ملائمة الشاشة' : 'Fit Screen'}
            </button>
            <button
              onClick={() => setZoomMode(1)}
              className={`px-2 py-1 rounded text-[10.5px] font-bold ${
                zoomMode === 1 ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold' : 'text-slate-600'
              }`}
            >
              100%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
              title={isRtl ? 'تكبير' : 'Zoom In'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Language Switch on Mobile */}
          <button
            onClick={() => setDocLang(prev => prev === 'ar' ? 'en' : 'ar')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-xs"
          >
            <Languages className="w-3.5 h-3.5 text-blue-600" />
            <span>{docLang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>

        {/* Preview Viewport Canvas */}
        <div 
          ref={viewportRef}
          className="flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-6 flex items-start justify-center bg-slate-200/90 dark:bg-slate-950 select-none relative touch-pan-x touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Scaled Preview Document Wrapper */}
          <div 
            style={{
              width: `${standardA4Px * effectiveScale}px`,
              minHeight: `${1123 * effectiveScale}px`,
              transition: 'width 0.2s ease, transform 0.2s ease',
              margin: '0 auto'
            }}
            className="relative flex justify-center origin-top shadow-xl rounded-sm"
          >
            <div 
              style={{
                width: `${standardA4Px}px`,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease'
              }}
              className="absolute top-0 left-1/2 -translate-x-1/2"
            >
              <div id={docId} className="w-full bg-white">
                {type === 'permit' && permit && (
                  <PermitPrintableDoc
                    permit={permit}
                    settings={settings}
                    lang={docLang}
                    qrCodeUrl={qrCodeUrl}
                  />
                )}

                {type === 'startCard' && startCard && (
                  <StartCardPrintableDoc
                    startCard={startCard}
                    settings={settings}
                    lang={docLang}
                    qrCodeUrl={qrCodeUrl}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Action Bar */}
        <div className="flex sm:hidden items-center gap-2 p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg shrink-0">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 active:bg-slate-200 min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>{isRtl ? 'طباعة' : 'Print'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className={`flex-[2] py-2.5 px-4 rounded-xl ${
              type === 'permit' ? 'bg-rose-600 active:bg-rose-700' : 'bg-blue-600 active:bg-blue-700'
            } text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md min-h-[44px]`}
          >
            {isDownloadingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloadingPdf ? (isRtl ? 'جاري التحميل...' : 'Downloading...') : (isRtl ? 'تنزيل ملف PDF' : 'Download PDF')}</span>
          </button>
        </div>

        {/* Desktop Bottom Footer Status */}
        <div className="hidden sm:flex px-6 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px]">
              {isRtl 
                ? 'معاينة متطابقة تماماً مع مواصفات الطباعة A4 المعتمدة وحفظ ملف PDF.' 
                : 'Preview calibrated to official A4 specifications and high-resolution PDF generation.'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>Scale: {Math.round(effectiveScale * 100)}%</span>
            <span>•</span>
            <span>{type === 'permit' ? permit?.permitNumber : startCard?.cardNumber}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PTWPrintPreviewModal;
