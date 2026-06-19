"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, Upload, FileDown, FileUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { downloadCSV, downloadJSON, parseCSV, readFileAsText } from "@/lib/csvUtils";

interface ImportExportProps {
  /** Label shown on buttons (e.g. "Customers") */
  label: string;
  /** Data rows to export */
  rows: Record<string, unknown>[];
  /** Called with parsed CSV rows so parent can POST to API */
  onImport: (rows: Record<string, string>[]) => Promise<{ imported: number; errors: string[] }>;
  /** Optional: restrict exported columns */
  exportColumns?: string[];
  /** Optional: exclude sensitive fields from export (e.g. "password") */
  excludeColumns?: string[];
}

export default function ImportExport({ label, rows, onImport, exportColumns, excludeColumns = [] }: ImportExportProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fileRef          = useRef<HTMLInputElement>(null);
  const [showImport, setShowImport]   = useState(false);
  const [preview, setPreview]         = useState<Record<string, string>[]>([]);
  const [fileName, setFileName]       = useState("");
  const [importing, setImporting]     = useState(false);
  const [result, setResult]           = useState<{ imported: number; errors: string[] } | null>(null);
  const [pickErr, setPickErr]         = useState("");

  if (!mounted) return null;

  const safeRows = rows.map(r => {
    const copy = { ...r };
    excludeColumns.forEach(k => delete copy[k]);
    return copy;
  }) as Record<string, unknown>[];

  const handleExportCSV = () => downloadCSV(`${label.replace(/\s+/g, "_")}_export_${new Date().toISOString().slice(0,10)}.csv`, safeRows, exportColumns);
  const handleExportJSON = () => downloadJSON(`${label.replace(/\s+/g, "_")}_export_${new Date().toISOString().slice(0,10)}.json`, safeRows);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickErr("");
    setPreview([]);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      let parsed: Record<string, string>[] = [];
      if (file.name.endsWith(".json")) {
        const text = await readFileAsText(file);
        const arr  = JSON.parse(text);
        if (!Array.isArray(arr)) { setPickErr("JSON must be an array of objects."); return; }
        parsed = arr.map(r => {
          const obj: Record<string, string> = {};
          Object.entries(r).forEach(([k, v]) => { obj[k] = v == null ? "" : String(v); });
          return obj;
        });
      } else {
        const text = await readFileAsText(file);
        parsed = parseCSV(text);
      }
      if (!parsed.length) { setPickErr("File is empty or could not be parsed."); return; }
      setPreview(parsed);
    } catch (err) {
      setPickErr(`Failed to read file: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setImporting(true);
    try {
      const res = await onImport(preview);
      setResult(res);
      setPreview([]);
      setFileName("");
    } catch (err) {
      setPickErr(`Import failed: ${err instanceof Error ? err.message : "Server error. Please try again."}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      {/* Export buttons */}
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" onClick={handleExportCSV} title={`Export ${label} as CSV`}>
          <FileDown className="w-4 h-4 mr-1.5" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportJSON} title={`Export ${label} as JSON`}>
          <Download className="w-4 h-4 mr-1.5" /> JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setShowImport(true); setResult(null); setPreview([]); setFileName(""); setPickErr(""); }} title={`Import ${label}`}>
          <Upload className="w-4 h-4 mr-1.5" /> Import
        </Button>
      </div>

      {/* Import dialog */}
      <Dialog open={showImport} onOpenChange={v => { if (!v) setShowImport(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" /> Import {label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload a <strong>CSV</strong> or <strong>JSON</strong> file. The first row of CSV must be column headers.
              Existing records won&apos;t be duplicated if they have the same ID.
            </p>

            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">{fileName || "Click to choose file"}</p>
              <p className="text-xs text-gray-400 mt-1">Accepts .csv or .json</p>
              <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFilePick} />
            </div>

            {pickErr && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" /> {pickErr}
              </div>
            )}

            {preview.length > 0 && !result && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Preview — <span className="text-blue-600">{preview.length} records</span> ready to import
                </p>
                <div className="overflow-auto max-h-48 border border-gray-100 rounded-lg">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(preview[0]).slice(0, 6).map(k => (
                          <th key={k} className="px-2 py-1.5 text-left font-semibold text-gray-600 border-b">{k}</th>
                        ))}
                        {Object.keys(preview[0]).length > 6 && <th className="px-2 py-1.5 text-gray-400">…</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          {Object.values(row).slice(0, 6).map((v, j) => (
                            <td key={j} className="px-2 py-1 text-gray-700 max-w-24 truncate">{v}</td>
                          ))}
                          {Object.keys(row).length > 6 && <td className="px-2 py-1 text-gray-400">…</td>}
                        </tr>
                      ))}
                      {preview.length > 5 && (
                        <tr><td colSpan={7} className="px-2 py-1.5 text-gray-400 text-center">… and {preview.length - 5} more rows</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result && (
              <div className={`p-3 rounded-lg text-sm space-y-1 ${result.errors.length ? "bg-amber-50" : "bg-green-50"}`}>
                <p className="flex items-center gap-2 font-semibold text-green-700">
                  <CheckCircle2 className="w-4 h-4" /> {result.imported} records imported successfully
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-700 flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> {e}</p>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>
              {result ? "Close" : "Cancel"}
            </Button>
            {preview.length > 0 && !result && (
              <Button className="bg-blue-600 hover:bg-blue-700" disabled={importing} onClick={handleImport}>
                {importing ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Importing…</> : <><FileUp className="w-4 h-4 mr-1.5" /> Import {preview.length} Records</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
