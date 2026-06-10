'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataGrid, SelectColumn, renderTextEditor, type Column, type RowsChangeData } from 'react-data-grid';
import Papa from 'papaparse';
import { useSupplierStore } from '@/lib/supplier-store';
import { useProductSave } from './useProductSave';
import type { ProductRow, ProductStatus } from './types';
import styles from './BulkProductGrid.module.css';

type AnalyzeResponse = { name?: string; category?: string; unit?: string; confidence?: number };

const DRAFT_KEY = 'supplier_product_draft';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function makeRow(patch: Partial<ProductRow> = {}): ProductRow {
  return {
    id: crypto.randomUUID(),
    image: '',
    name: '',
    price: '',
    quantity: '',
    category: '',
    unit: '',
    status: 'new',
    analyzing: false,
    invalidFields: [],
    ...patch,
  };
}

function statusLabel(status: ProductStatus) {
  if (status === 'saved') return 'Хадгалсан';
  if (status === 'failed') return 'Алдаа';
  return 'Шинэ';
}

function statusClass(status: ProductStatus) {
  if (status === 'saved') return `${styles.status} ${styles.saved}`;
  if (status === 'failed') return `${styles.status} ${styles.failed}`;
  return `${styles.status} ${styles.new}`;
}

function isImage(file: File) {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

function csvValue(record: Record<string, unknown>, keys: string[]) {
  for (const [key, value] of Object.entries(record)) {
    if (keys.includes(key.trim().toLowerCase())) return value == null ? '' : String(value);
  }
  return '';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Зураг уншихад алдаа гарлаа'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

async function analyzeImage(file: File, category?: string): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append('image', file);
  if (category) formData.append('category', category);
  const response = await fetch('/analyze-product', { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`AI шинжилгээний алдаа: ${response.status}`);
  return response.json() as Promise<AnalyzeResponse>;
}

export function BulkProductGrid({ onSaved }: { onSaved?: () => void }) {
  const { supplier } = useSupplierStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageRow = useRef<string | null>(null);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState('');
  const [progress, setProgress] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [draft, setDraft] = useState<ProductRow[]>([]);

  const updateRow = useCallback((id: string, patch: Partial<ProductRow>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }, []);
  const { saveBulk } = useProductSave(supplier?.id, updateRow, setProgress);

  const selectedProductRows = useMemo(() => rows.filter((row) => selectedRows.has(row.id)), [rows, selectedRows]);
  const unsavedCount = useMemo(() => rows.filter((row) => row.status === 'new').length, [rows]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDraft((JSON.parse(saved) as { rows: ProductRow[] }).rows ?? []);
    } catch {
      setDraft([]);
    }
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (unsavedCount === 0) return;
      event.preventDefault();
      event.returnValue = `Хадгалаагүй ${unsavedCount} бараа байна. Гарах уу?`;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsavedCount]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const newRows = rows.filter((row) => row.status === 'new');
      if (newRows.length > 0) localStorage.setItem(DRAFT_KEY, JSON.stringify({ rows: newRows }));
      else localStorage.removeItem(DRAFT_KEY);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [rows]);

  async function runAnalyze(rowId: string, file?: File) {
    const row = rows.find((item) => item.id === rowId);
    const imageFile = file ?? row?.imageFile;
    if (!imageFile) return;
    updateRow(rowId, { analyzing: true });
    try {
      const result = await analyzeImage(imageFile, row?.category || undefined);
      updateRow(rowId, {
        name: result.name ?? '',
        category: result.category ?? '',
        unit: result.unit ?? '',
        confidence: result.confidence ?? 0,
        analyzing: false,
        status: 'new',
      });
    } catch (error) {
      console.error('[BulkProductGrid] AI шинжилгээ амжилтгүй', error);
      updateRow(rowId, { analyzing: false, status: 'failed' });
    }
  }

  async function setImage(rowId: string, file: File, autoAnalyze: boolean) {
    if (!isImage(file)) {
      setToast('Зөвхөн JPG эсвэл PNG зураг оруулна уу');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setToast('Зургийн хэмжээ 5MB-аас их байна');
      return;
    }
    const image = await fileToDataUrl(file);
    updateRow(rowId, { image, imageFile: file, status: 'new' });
    if (autoAnalyze) await runAnalyze(rowId, file);
  }

  function openImagePicker(rowId?: string) {
    pendingImageRow.current = rowId ?? null;
    fileInputRef.current?.click();
  }

  async function onImageInput(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const id = pendingImageRow.current ?? crypto.randomUUID();
    if (!pendingImageRow.current) setRows((current) => [...current, makeRow({ id })]);
    await setImage(id, file, !pendingImageRow.current);
    pendingImageRow.current = null;
  }

  async function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropActive(false);
    const files = Array.from(event.dataTransfer.files).filter(isImage);
    const created = await Promise.all(files.map(async (file) => makeRow({
      image: await fileToDataUrl(file),
      imageFile: file,
      analyzing: true,
    })));
    setRows((current) => [...current, ...created]);
    await Promise.all(created.map((row) => row.imageFile ? runAnalyze(row.id, row.imageFile) : undefined));
  }

  function importCsv(file?: File) {
    if (!file) return;
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        let skipped = 0;
        const imported = result.data.flatMap((record) => {
          const name = csvValue(record, ['нэр', 'name']);
          if (!name.trim()) {
            skipped += 1;
            return [];
          }
          return [makeRow({
            name,
            price: csvValue(record, ['үнэ', 'price']),
            quantity: csvValue(record, ['тоо', 'quantity']),
            category: csvValue(record, ['ангилал', 'category']),
            unit: csvValue(record, ['нэгж', 'unit']),
          })];
        });
        setRows((current) => [...current, ...imported]);
        setToast(`${imported.length} мөр импортлогдлоо, ${skipped} мөр алгассан`);
      },
    });
  }

  function downloadTemplate() {
    const blob = new Blob(['нэр,үнэ,тоо,ангилал,нэгж\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'supplier-products-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<Column<ProductRow>[]>(() => [
    SelectColumn,
    { key: 'rowNumber', name: '#', width: 52, renderCell: ({ rowIdx }) => rowIdx + 1 },
    {
      key: 'image',
      name: 'Зураг',
      width: 76,
      renderCell: ({ row }) => (
        <div className={styles.imageCell} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void setImage(row.id, event.dataTransfer.files[0], false); }}>
          <button className={styles.thumb} type="button" onClick={() => openImagePicker(row.id)}>
            {row.image ? <img src={row.image} alt="Барааны зураг" /> : '＋'}
          </button>
        </div>
      ),
    },
    {
      key: 'name',
      name: 'Нэр',
      minWidth: 220,
      editable: true,
      renderEditCell: renderTextEditor,
      cellClass: (row) => [
        row.confidence == null ? '' : row.confidence < 70 ? styles.low : styles.high,
        row.invalidFields?.includes('name') ? styles.invalid : '',
      ].filter(Boolean).join(' '),
      renderCell: ({ row }) => row.analyzing
        ? 'Шинжилж байна...'
        : row.image && !row.name
        ? <button className={styles.ai} type="button" onClick={() => void runAnalyze(row.id)}>AI ✨</button>
        : row.name,
    },
    { key: 'price', name: 'Үнэ ₮', width: 120, editable: true, renderEditCell: renderTextEditor, cellClass: (row) => row.invalidFields?.includes('price') ? styles.invalid : '' },
    { key: 'quantity', name: 'Тоо', width: 100, editable: true, renderEditCell: renderTextEditor, cellClass: (row) => row.invalidFields?.includes('quantity') ? styles.invalid : '' },
    { key: 'category', name: 'Ангилал', minWidth: 160, editable: true, renderEditCell: renderTextEditor },
    { key: 'unit', name: 'Нэгж', width: 110, editable: true, renderEditCell: renderTextEditor },
    { key: 'status', name: 'Статус', width: 120, renderCell: ({ row }) => <span className={statusClass(row.status)}>{statusLabel(row.status)}</span> },
  ], [rows]);

  const draftBanner = draft.length > 0 ? (
    <div className={styles.draft}>
      <strong>Хадгалаагүй {draft.length} бараа байна. Үргэлжлүүлэх үү?</strong>
      <div className={styles.group}>
        <button className={styles.button} type="button" onClick={() => { setRows(draft); setDraft([]); }}>Тийм</button>
        <button className={`${styles.button} ${styles.danger}`} type="button" onClick={() => { localStorage.removeItem(DRAFT_KEY); setDraft([]); }}>Устгах</button>
      </div>
    </div>
  ) : null;

  return (
    <div className={styles.wrap} onDragEnter={() => setDropActive(true)} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDropActive(false)} onDrop={(event) => void onDrop(event)}>
      <input ref={fileInputRef} hidden type="file" accept="image/jpeg,image/png" onChange={(event) => void onImageInput(event.currentTarget.files)} />
      <input ref={csvInputRef} hidden type="file" accept=".csv" onChange={(event) => importCsv(event.currentTarget.files?.[0])} />
      {draftBanner}
      {toast && <div className={styles.toast}>{toast}</div>}
      {progress && <div className={styles.toast}>{progress}</div>}
      <div className={styles.toolbar}>
        <div>
          <h3 className="text-sm font-bold text-foreground">Бөөнөөр бараа нэмэх</h3>
          <p className="text-xs text-foreground-muted">Хадгалсан бараа website-ийн хайлтад шууд орно</p>
        </div>
        <div className={styles.group}>
          <button className={styles.button} type="button" onClick={() => csvInputRef.current?.click()}>CSV оруулах</button>
          <button className={styles.button} type="button" onClick={downloadTemplate}>Template татах</button>
          {selectedRows.size > 0 && (
            <>
              <button className={`${styles.button} ${styles.primary}`} type="button" onClick={async () => { await saveBulk(selectedProductRows); onSaved?.(); }}>Хадгалах ({selectedRows.size})</button>
              <button className={`${styles.button} ${styles.danger}`} type="button" onClick={() => { setRows((current) => current.filter((row) => !selectedRows.has(row.id))); setSelectedRows(new Set()); }}>Устгах ({selectedRows.size})</button>
              <button className={styles.button} type="button" onClick={() => setSelectedRows(new Set())}>Болих</button>
            </>
          )}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className={styles.empty}>
          <div>
            <div className={styles.emptyIcon}>📦</div>
            <h3 className="mt-2 text-lg font-black text-foreground">Бараа байхгүй байна</h3>
            <p className="mt-1 text-sm text-foreground-muted">Зураг чирж оруулах эсвэл CSV импортлох</p>
            <div className={`${styles.group} mt-4 justify-center`}>
              <button className={`${styles.button} ${styles.primary}`} type="button" onClick={() => openImagePicker()}>Зураг оруулах</button>
              <button className={styles.button} type="button" onClick={() => csvInputRef.current?.click()}>CSV оруулах</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <DataGrid
            className={`${styles.grid} ${dropActive ? styles.dropActive : ''}`}
            columns={columns}
            rows={rows}
            rowKeyGetter={(row) => row.id}
            selectedRows={selectedRows}
            onSelectedRowsChange={setSelectedRows}
            onRowsChange={(nextRows: ProductRow[], data: RowsChangeData<ProductRow>) => {
              setRows(nextRows.map((row, index) => data.indexes.includes(index) ? { ...row, status: row.status === 'saved' ? 'new' : row.status, invalidFields: [] } : row));
            }}
            rowHeight={52}
            headerRowHeight={42}
          />
          <button className={styles.add} type="button" onClick={() => setRows((current) => [...current, makeRow()])}>+</button>
        </>
      )}
    </div>
  );
}
