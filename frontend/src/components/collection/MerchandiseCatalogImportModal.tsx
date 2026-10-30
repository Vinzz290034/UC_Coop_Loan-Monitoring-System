'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ChevronRight,
  Eye,
  Check,
  HelpCircle,
  Loader2
} from 'lucide-react';
import api from '@/lib/api';

export interface CatalogImportItem {
  item_name: string;
  description: string;
  size: string;
  cost_price: number;
  selling_price: number;
  cost_price_2025?: number;
  selling_price_2025?: number;
  category?: string;
  effective_date?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => Promise<void> | void;
}

export default function MerchandiseCatalogImportModal({ isOpen, onClose, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<CatalogImportItem[]>([]);
  const [effectiveDate, setEffectiveDate] = useState('As of October 15, 2026');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<'preview' | 'help'>('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to array of arrays
      const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

      if (rawRows.length < 2) {
        setError('The selected spreadsheet appears to be empty or missing required data rows.');
        setIsProcessing(false);
        return;
      }

      // Check row 0/1 for effective date (e.g. "As of October 15, 2026")
      let detectedDate = 'As of October 15, 2026';
      for (let r = 0; r < Math.min(5, rawRows.length); r++) {
        const rowStr = rawRows[r].join(' ');
        const dateMatch = rowStr.match(/as of [a-z]+ \d{1,2},? \d{4}/i);
        if (dateMatch) {
          detectedDate = dateMatch[0];
          break;
        }
      }
      setEffectiveDate(detectedDate);

      // Detect header row index
      let headerRowIdx = -1;
      let colIdxMap: { [key: string]: number } = {};

      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const row = rawRows[r].map(c => String(c).trim().toLowerCase());
        const hasItem = row.some(c => c === 'item' || c.includes('item name') || c === 'item_name');
        const hasDesc = row.some(c => c === 'description' || c.includes('desc') || c === 'category');
        const hasCost = row.some(c => c.includes('cost'));
        const hasPrice = row.some(c => c.includes('selling') || c.includes('price'));

        if (hasItem && (hasCost || hasPrice || hasDesc)) {
          headerRowIdx = r;
          row.forEach((colName, cIdx) => {
            if (colName === 'item' || colName.includes('item name')) colIdxMap['item'] = cIdx;
            else if (colName.includes('description') || colName === 'desc') colIdxMap['desc'] = cIdx;
            else if (colName.includes('size')) colIdxMap['size'] = cIdx;
            else if (colName === 'cost' || (colName.includes('cost') && !colName.includes('2025'))) {
              if (colIdxMap['cost'] === undefined) colIdxMap['cost'] = cIdx;
            } else if (colName.includes('selling') || (colName.includes('price') && !colName.includes('2025'))) {
              if (colIdxMap['selling'] === undefined) colIdxMap['selling'] = cIdx;
            } else if (colName.includes('2025') && colName.includes('cost')) {
              colIdxMap['cost_2025'] = cIdx;
            } else if (colName.includes('2025') && (colName.includes('selling') || colName.includes('price'))) {
              colIdxMap['selling_2025'] = cIdx;
            }
          });
          break;
        }
      }

      // Fallback index mapping if not explicitly found by names (standard layout from user image: A=Item, B=Desc, C=Size, D=Cost 2026, E=Price 2026, F=Cost 2025, G=Price 2025)
      if (headerRowIdx === -1) {
        headerRowIdx = 1; // 2nd row (index 1) usually holds ITEM, DESCRIPTION, SIZE, etc.
        colIdxMap = {
          item: 0,
          desc: 1,
          size: 2,
          cost: 3,
          selling: 4,
          cost_2025: 5,
          selling_2025: 6
        };
      }

      // Parse records
      const items: CatalogImportItem[] = [];
      let lastKnownItem = '';
      let currentSection = 'Merchandise'; // Tracks section headers (e.g. "PERSONAL PROTECTIVE EQUIPMENT( PPE)", "SCHOOL PARAPHERNALIA", "SERVICES", "MARITIME ACCESSORIES", "ESSENTIALS")

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        let rawItem = String(row[colIdxMap['item'] ?? 0] || '').trim();
        const rawDesc = String(row[colIdxMap['desc'] ?? 1] || '').trim();
        const rawSize = String(row[colIdxMap['size'] ?? 2] || '').trim();
        const rawCost = parseFloat(String(row[colIdxMap['cost'] ?? 3] || '0').replace(/[^0-9.-]/g, '')) || 0;
        const rawSelling = parseFloat(String(row[colIdxMap['selling'] ?? 4] || '0').replace(/[^0-9.-]/g, '')) || 0;
        const rawCost2025 = parseFloat(String(row[colIdxMap['cost_2025'] ?? 5] || '0').replace(/[^0-9.-]/g, '')) || 0;
        const rawSelling2025 = parseFloat(String(row[colIdxMap['selling_2025'] ?? 6] || '0').replace(/[^0-9.-]/g, '')) || 0;

        // Check if this row is a section banner (e.g., "PERSONAL PROTECTIVE EQUIPMENT( PPE)", "SERVICES", "MARITIME ACCESSORIES", "ESSENTIALS", "SCHOOL PARAPHERNALIA")
        const fullRowText = row.filter((c: any) => c !== undefined && c !== null).map((c: any) => String(c).trim()).filter(Boolean).join(' ');
        const isSectionBanner = /^(personal protective equipment|school paraphernalia|services|maritime accessories|essentials|supplies|uniforms)/i.test(fullRowText) &&
          rawCost === 0 && rawSelling === 0 && rawCost2025 === 0 && rawSelling2025 === 0;

        if (isSectionBanner) {
          currentSection = fullRowText;
          lastKnownItem = ''; // Reset parent item context across major sections
          continue;
        }

        // Skip sub-headers inside sections (e.g., repeating row with "ITEM", "DESCRIPTION", "SIZE", "LOCATION")
        if (/^(item|description|size|cost|selling|total|location)$/i.test(rawItem) &&
            (/^(description|size|cost|selling|location)$/i.test(rawDesc) || rawDesc === '')) {
          continue;
        }

        // Handle merged cells where item name is blank for subsequent sizes/descriptions
        if (rawItem) {
          lastKnownItem = rawItem;
        } else if (lastKnownItem && (rawDesc || rawSize || rawCost > 0 || rawSelling > 0 || rawCost2025 > 0 || rawSelling2025 > 0)) {
          rawItem = lastKnownItem;
        }

        // If there's truly no data in this row, skip
        if (!rawItem && !rawDesc && !rawSize && rawCost === 0 && rawSelling === 0 && rawCost2025 === 0 && rawSelling2025 === 0) {
          continue;
        }

        const itemName = rawItem || 'General Store Merchandise';
        const isService = /services?/i.test(currentSection) ||
                          /photocopy|print|lamination|photo|notarial|fee|replacement|locker/i.test(itemName) ||
                          /photocopy|print|lamination|photo|notarial|fee|replacement|locker/i.test(rawDesc);

        let category = 'Uniform';
        const sectionLower = (currentSection || '').toLowerCase();
        if (sectionLower.includes('ppe') || sectionLower.includes('protective')) {
          category = 'Personal Protective Equipment (PPE)';
        } else if (sectionLower.includes('paraphernalia')) {
          category = 'School Paraphernalia';
        } else if (sectionLower.includes('service') || isService) {
          category = 'Services';
        } else if (sectionLower.includes('maritime') || sectionLower.includes('accessories')) {
          category = 'Maritime Accessories';
        } else if (sectionLower.includes('essential')) {
          category = 'Essentials';
        } else if (sectionLower.includes('uniform')) {
          category = 'Uniform';
        } else if (isService) {
          category = 'Services';
        }

        items.push({
          item_name: itemName,
          description: rawDesc,
          size: rawSize,
          cost_price: rawCost,
          selling_price: rawSelling,
          cost_price_2025: rawCost2025,
          selling_price_2025: rawSelling2025,
          category,
          effective_date: detectedDate
        });
      }

      if (items.length === 0) {
        setError('No valid merchandise or pricing rows were found. Please verify the spreadsheet format.');
        setIsProcessing(false);
        return;
      }

      setParsedItems(items);
    } catch (err: any) {
      console.error('Error parsing catalog spreadsheet:', err);
      setError(`Failed to read spreadsheet: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedItems.length === 0) return;
    setIsSaving(true);
    setError(null);

    try {
      await api.post('/collections/catalog/bulk-import', {
        items: parsedItems,
        mode: importMode,
        effective_date: effectiveDate
      });

      await onImportComplete();
      onClose();
    } catch (err: any) {
      console.error('Error importing merchandise catalog:', err);
      setError(err?.response?.data?.error?.message || 'Failed to save imported catalog items into database.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop">
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container-lowest dark:bg-neutral-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-secondary flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Import Sales Registry &amp; Price Catalog
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Excel (.xlsx / .csv)
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Upload your official merchandise cost &amp; selling price list to synchronize the sales catalog.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-outline-variant/80 hover:border-primary dark:hover:border-secondary rounded-2xl p-6 text-center cursor-pointer transition-all bg-neutral-50/50 dark:bg-neutral-800/30 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {file ? file.name : 'Click to select or drag & drop your Price List Excel file'}
            </p>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
              Supports standard "COST &amp; SELLING PRICE" sheets (Columns: Item, Description, Size, Cost, Selling Price)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Import Settings & Effective Date */}
          {parsedItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/60">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Catalog Effective Date / Version
                </label>
                <input
                  type="text"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white"
                  placeholder="e.g. As of October 15, 2026"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Import Action Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : 'border-outline-variant/60 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Replace All Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      importMode === 'append'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : 'border-outline-variant/60 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Append to Existing
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Items Summary & Table Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-xs">
                    Ready to Import: {parsedItems.length} items
                  </span>
                  <span className="text-neutral-400">•</span>
                  <span className="text-neutral-500">
                    {parsedItems.filter(i => i.category === 'Coop Services').length} services, {parsedItems.filter(i => i.category !== 'Coop Services').length} merchandise items
                  </span>
                </div>
              </div>

              <div className="border border-outline-variant/60 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="p-2 w-8 text-center border-r border-emerald-800">#</th>
                        <th className="p-2 min-w-[140px] border-r border-emerald-800">Item</th>
                        <th className="p-2 min-w-[120px] border-r border-emerald-800">Description</th>
                        <th className="p-2 w-20 text-center border-r border-emerald-800">Size</th>
                        <th className="p-2 w-24 text-right border-r border-emerald-800">2026 Cost</th>
                        <th className="p-2 w-24 text-right border-r border-emerald-800">2026 Selling</th>
                        <th className="p-2 w-24 text-right border-r border-emerald-800">2025 Cost</th>
                        <th className="p-2 w-24 text-right border-r border-emerald-800">2025 Selling</th>
                        <th className="p-2 w-24 text-center">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                      {parsedItems.slice(0, 100).map((it, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="p-2 text-center text-neutral-400 font-mono border-r border-neutral-200 dark:border-neutral-800">{idx + 1}</td>
                          <td className="p-2 font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">{it.item_name}</td>
                          <td className="p-2 text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">{it.description || '—'}</td>
                          <td className="p-2 text-center font-mono border-r border-neutral-200 dark:border-neutral-800">{it.size || '—'}</td>
                          <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                            ₱{it.cost_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-neutral-200 dark:border-neutral-800">
                            ₱{it.selling_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-mono text-neutral-500 border-r border-neutral-200 dark:border-neutral-800">
                            {it.cost_price_2025 ? `₱${it.cost_price_2025.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="p-2 text-right font-mono text-neutral-500 border-r border-neutral-200 dark:border-neutral-800">
                            {it.selling_price_2025 ? `₱${it.selling_price_2025.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                              it.category === 'Coop Services'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}>
                              {it.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedItems.length > 100 && (
                  <div className="p-2 text-center bg-neutral-50 dark:bg-neutral-800 text-neutral-500 text-[10px]">
                    Showing first 100 rows of {parsedItems.length} total items. All {parsedItems.length} items will be imported.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-outline-variant/60 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedItems.length === 0 || isSaving || isProcessing}
            onClick={handleExecuteImport}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Confirm &amp; Import Catalog ({parsedItems.length} items)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

