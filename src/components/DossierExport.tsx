'use client';

import React, { useState } from 'react';
import {
  FileDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronDown,
  FileCode,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { AnalysisResult } from '@/types/chem';
import { generateDossierPdfBlob } from '@/lib/pdf-service';

interface DossierExportProps {
  analysisData: AnalysisResult;
}

function svgToPngDataUrl(svgString: string, width = 360, height = 270): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const pngUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(pngUrl);
            return;
          }
        } catch {
          // ignore
        }
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.src = url;
    } catch {
      resolve('');
    }
  });
}

export const DossierExport: React.FC<DossierExportProps> = ({ analysisData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedSmiles, setCopiedSmiles] = useState(false);

  const compoundName = analysisData.metadata.name?.replace(/[\s/\\:]+/g, '_') || 'molecule';

  const handleExportPdf = async () => {
    setIsExporting(true);
    setStatusMessage('Compiling PDF...');
    setIsError(false);

    try {
      // 1. Prepare data with rasterized PNG if skeletal_svg exists
      let enrichedData = { ...analysisData };
      if (
        (!enrichedData.depictions?.skeletal || enrichedData.depictions?.skeletal.length < 50) &&
        enrichedData.depictions?.skeletal_svg
      ) {
        try {
          const pngDataUrl = await svgToPngDataUrl(enrichedData.depictions.skeletal_svg);
          if (pngDataUrl) {
            enrichedData = {
              ...enrichedData,
              depictions: {
                ...enrichedData.depictions,
                skeletal: pngDataUrl,
              },
            };
          }
        } catch {
          // ignore
        }
      }

      let pdfBlob: Blob | null = null;

      // 2. Attempt serverless endpoint /api/export-pdf
      try {
        const response = await fetch('/api/export-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysis_data: enrichedData,
          }),
        });

        if (response.ok) {
          pdfBlob = await response.blob();
        }
      } catch (netErr) {
        console.warn('Network call to /api/export-pdf failed, using direct client PDF generator', netErr);
      }

      // 3. Resilient client-side fallback if server response was not ok
      if (!pdfBlob) {
        pdfBlob = generateDossierPdfBlob(enrichedData);
      }

      // 4. Trigger direct file download in browser
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${compoundName}_Cheminformatics_Dossier.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatusMessage('Dossier downloaded!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Export error:', err);
      setIsError(true);
      setStatusMessage(err.message || 'Failed to export PDF');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMol = () => {
    const molblock = analysisData.conformer_3d.molblock;
    if (!molblock) return;
    const blob = new Blob([molblock], { type: 'chemical/x-mdl-molfile;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${compoundName}.mol`;
    link.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const handleDownloadSdf = () => {
    const molblock = analysisData.conformer_3d.molblock;
    if (!molblock) return;
    // Format simple SDF
    const sdfContent = `${molblock}\n> <Compound_Name>\n${analysisData.metadata.name}\n\n> <Canonical_SMILES>\n${analysisData.metadata.smiles}\n\n> <Formula>\n${analysisData.metadata.formula}\n\n$$$$\n`;
    const blob = new Blob([sdfContent], { type: 'chemical/x-mdl-sdfile;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${compoundName}.sdf`;
    link.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const handleDownloadSmiles = () => {
    const smiles = analysisData.metadata.smiles;
    if (!smiles) return;
    const blob = new Blob([smiles], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${compoundName}.smi`;
    link.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const handleDownloadSvg = () => {
    const svg = analysisData.depictions.skeletal_svg;
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${compoundName}_2D.svg`;
    link.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const handleCopySmiles = () => {
    navigator.clipboard.writeText(analysisData.metadata.smiles);
    setCopiedSmiles(true);
    setTimeout(() => setCopiedSmiles(false), 2000);
    setMenuOpen(false);
  };

  return (
    <div className="relative flex items-center gap-2">
      {statusMessage && (
        <span
          className={`text-xs flex items-center gap-1 font-medium animate-fade-in ${
            isError ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>{statusMessage}</span>
        </span>
      )}

      {/* Main Action Button: Export Compound Dossier (PDF) */}
      <button
        type="button"
        onClick={handleExportPdf}
        disabled={isExporting}
        className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Dossier (PDF)</span>
          </>
        )}
      </button>

      {/* Direct File Download Dropdown (.mol, .sdf, .smi, .svg) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          title="Direct Structure & Data File Exports"
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1.5 w-52 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 text-xs">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
              Download Structure Files
            </div>

            <button
              type="button"
              onClick={handleDownloadMol}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200"
            >
              <span>MDL Molfile</span>
              <span className="font-mono text-[10px] text-slate-400">.mol</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSdf}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200"
            >
              <span>Structure Data File</span>
              <span className="font-mono text-[10px] text-slate-400">.sdf</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSmiles}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200"
            >
              <span>Canonical SMILES</span>
              <span className="font-mono text-[10px] text-slate-400">.smi</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200"
            >
              <span>High-Res Vector</span>
              <span className="font-mono text-[10px] text-slate-400">.svg</span>
            </button>

            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

            <button
              type="button"
              onClick={handleCopySmiles}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200"
            >
              <span>Copy SMILES string</span>
              {copiedSmiles ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
