import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataGrid, SelectColumn, renderTextEditor, type Column, type RowsChangeData } from 'react-data-grid';
import Papa from 'papaparse';
import { useProductSave } from '../hooks/useProductSave';
import type { ProductRow, ProductStatus } from '../types/product-grid';
import styles from './ProductGrid.module.css';

type AnalyzeResponse = {
  name?: string;
  category?: string;
  unit?: string;
  confidence?: number;
};

type DraftPayload = {
  rows: ProductRow[];
};

const DRAFT_KEY = 'supplier_product_draft';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function createEmptyRow(patch: Partial<ProductRow> = {}): ProductRow {
  return {
    id: crypto.randomUUID(),
    imageUrl: '',
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

function statusLabel(status: ProductStatus): string {
  if (status === 'saved') return 'Хадгалсан';
  if (status === 'failed') return 'Алдаа';
  return 'Шинэ';
}

function statusClass(status: ProductStatus): string {
  if (status === 'saved') return `${styles.status} ${styles.statusSaved}`;
  if (status === 'failed') return `${styles.status} ${styles.statusFailed}`;
  return `${styles.status} ${styles.statusNew}`;
}

function normalizeCsvKey(key: string): string {
  return key.trim().toLowerCase();
}

function getCsvValue(row: Record<string, unknown>, names: string[]): string {
  for (const [key, value] of Object.entries(row)) {
    if (names.includes(normalizeCsvKey(key))) {
      return value == null ? '' : String(value);
    }
  }
  return '';
}

function isImageFile(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

async function uploadImage(file: File): Promise<string | undefined> {
  const operations = {
    query: `
      mutation CreateAssets($input: [CreateAssetInput!]!) {
        createAssets(input: $input) {
          ... on Asset {
            id
            preview
          }
        }
      }
    `,
    variables: { input: [{ file: null }] },
  };
  const formData = new FormData();
  formData.append('operations', JSON.stringify(operations));
  formData.append('map', JSON.stringify({ file: ['variables.input.0.file'] }));
  formData.append('file', file);

  try {
    const response = await fetch(import.meta.env.VITE_API_URL, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const json = await response.json() as {
      data?: { createAssets?: Array<{ id?: string }> };
    };
    return json.data?.createAssets?.[0]?.id;
  } catch (error) {
    console.error('[ProductGrid] Зураг upload хийхэд алдаа гарлаа', error);
    return undefined;
  }
}

async function analyzeImage(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const apiBase = String(import.meta.env.VITE_API_URL ?? '').replace(/\/(shop-api|admin-api)$/, '');
  const response = await fetch(`${apiBase}/analyze-product`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error(`AI шинжилгээний алдаа: ${response.status}`);
  return response.json() as Promise<AnalyzeResponse>;
}

export function ProductGrid() {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageRowId = useRef<string | null>(null);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState('');
  const [progress, setProgress] = useState('');
  const [draftRows, setDraftRows] = useState<ProductRow[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [contextRowId, setContextRowId] = useState<string | null>(null);

  const updateRow = useCallback((id: string, patch: Partial<ProductRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const { saveBulk } = useProductSave(updateRow, setProgress);

  const selectedCount = selectedRows.size;
  const selectedProductRows = useMemo(
    () => rows.filter((row) => selectedRows.has(row.id)),
    [rows, selectedRows],
  );

  const unsavedCount = useMemo(
    () => rows.filter((row) => row.status === 'new').length,
    [rows],
  );

  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (!draft) return;
      const parsed = JSON.parse(draft) as DraftPayload;
      if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
        setDraftRows(parsed.rows);
      }
    } catch {
      setDraftRows([]);
    }
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (unsavedCount === 0) return;
      const message = `Хадгалаагүй ${unsavedCount} бараа байна. Гарах уу?`;
      event.preventDefault();
      event.returnValue = message;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsavedCount]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const draft = rows.filter((row) => row.status === 'new');
      if (draft.length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ rows: draft } satisfies DraftPayload));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [rows]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleRowsChange = useCallback((nextRows: ProductRow[], data: RowsChangeData<ProductRow>) => {
    setRows(nextRows.map((row, index) => {
      if (index === data.indexes[0]) {
        return { ...row, status: row.status === 'saved' ? 'new' : row.status, invalidFields: [] };
      }
      return row;
    }));
  }, []);

  const addRow = useCallback((patch: Partial<ProductRow> = {}) => {
    setRows((current) => [...current, createEmptyRow(patch)]);
  }, []);

  const deleteRows = useCallback((ids: ReadonlySet<string>) => {
    setRows((current) => current.filter((row) => !ids.has(row.id)));
    setSelectedRows(new Set());
    setContextRowId(null);
  }, []);

  async function processImageForRow(rowId: string, file: File, runAi: boolean): Promise<void> {
    if (!isImageFile(file)) {
      setToast('Зөвхөн JPG эсвэл PNG зураг оруулна уу');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setToast('Зургийн хэмжээ 5MB-аас их байна');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    updateRow(rowId, { imageUrl, imageFile: file, status: 'new' });

    void uploadImage(file).then((uploadedAssetId) => {
      if (uploadedAssetId) updateRow(rowId, { uploadedAssetId });
    });

    if (runAi) {
      await runAnalyze(rowId, file);
    }
  }

  async function runAnalyze(rowId: string, file?: File): Promise<void> {
    const row = rows.find((item) => item.id === rowId);
    const imageFile = file ?? row?.imageFile;
    if (!imageFile) return;

    updateRow(rowId, { analyzing: true });
    try {
      const result = await analyzeImage(imageFile);
      updateRow(rowId, {
        name: result.name ?? '',
        category: result.category ?? '',
        unit: result.unit ?? '',
        confidence: result.confidence ?? 0,
        status: 'new',
        analyzing: false,
      });
    } catch (error) {
      console.error('[ProductGrid] AI шинжилгээ амжилтгүй', error);
      updateRow(rowId, { analyzing: false, status: 'failed' });
    }
  }

  function openImagePicker(rowId?: string): void {
    pendingImageRowId.current = rowId ?? null;
    imageInputRef.current?.click();
  }

  async function handleImageInput(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file) return;
    const rowId = pendingImageRowId.current ?? crypto.randomUUID();
    if (!pendingImageRowId.current) {
      setRows((current) => [...current, createEmptyRow({ id: rowId })]);
    }
    await processImageForRow(rowId, file, !pendingImageRowId.current);
    pendingImageRowId.current = null;
  }

  async function handleGridDrop(event: React.DragEvent<HTMLDivElement>): Promise<void> {
    event.preventDefault();
    setDropActive(false);
    const files = Array.from(event.dataTransfer.files).filter(isImageFile);
    const newRows = files.map((file) => createEmptyRow({
      imageFile: file,
      imageUrl: URL.createObjectURL(file),
      analyzing: true,
    }));
    setRows((current) => [...current, ...newRows]);

    await Promise.all(newRows.map(async (row) => {
      if (!row.imageFile) return;
      void uploadImage(row.imageFile).then((uploadedAssetId) => {
        if (uploadedAssetId) updateRow(row.id, { uploadedAssetId });
      });
      await runAnalyze(row.id, row.imageFile);
    }));
  }

  function handleCsv(file: File | undefined): void {
    if (!file) return;
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        let skipped = 0;
        const imported = result.data.flatMap((record) => {
          const name = getCsvValue(record, ['нэр', 'name']);
          if (!name.trim()) {
            skipped += 1;
            return [];
          }
          return [createEmptyRow({
            name,
            price: getCsvValue(record, ['үнэ', 'price']),
            quantity: getCsvValue(record, ['тоо', 'quantity']),
            category: getCsvValue(record, ['ангилал', 'category']),
            unit: getCsvValue(record, ['нэгж', 'unit']),
          })];
        });
        setRows((current) => [...current, ...imported]);
        setToast(`${imported.length} мөр импортлогдлоо, ${skipped} мөр алгассан`);
      },
    });
  }

  function downloadTemplate(): void {
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
    {
      key: 'rowNumber',
      name: '#',
      width: 54,
      renderCell: ({ rowIdx }) => rowIdx + 1,
    },
    {
      key: 'imageUrl',
      name: 'Зураг',
      width: 76,
      renderCell: ({ row }) => (
        <div
          className={styles.imageCell}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void processImageForRow(row.id, event.dataTransfer.files[0], false);
          }}
        >
          <button className={styles.thumbButton} type="button" onClick={() => openImagePicker(row.id)}>
            {row.imageUrl ? <img src={row.imageUrl} alt="Барааны зураг" /> : '＋'}
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
        row.confidence == null ? '' : row.confidence < 70 ? styles.confidenceLow : styles.confidenceHigh,
        row.invalidFields?.includes('name') ? styles.invalidCell : '',
      ].filter(Boolean).join(' '),
      renderCell: ({ row }) => {
        if (row.analyzing) return <span className={styles.spinner}>Шинжилж байна...</span>;
        if (row.imageUrl && !row.name) {
          return <button className={styles.aiButton} type="button" onClick={() => void runAnalyze(row.id)}>AI ✨</button>;
        }
        return row.name;
      },
    },
    {
      key: 'price',
      name: 'Үнэ ₮',
      width: 120,
      editable: true,
      renderEditCell: renderTextEditor,
      cellClass: (row) => row.invalidFields?.includes('price') ? styles.invalidCell : '',
    },
    {
      key: 'quantity',
      name: 'Тоо',
      width: 100,
      editable: true,
      renderEditCell: renderTextEditor,
      cellClass: (row) => row.invalidFields?.includes('quantity') ? styles.invalidCell : '',
    },
    {
      key: 'category',
      name: 'Ангилал',
      minWidth: 160,
      editable: true,
      renderEditCell: renderTextEditor,
    },
    {
      key: 'unit',
      name: 'Нэгж',
      width: 110,
      editable: true,
      renderEditCell: renderTextEditor,
    },
    {
      key: 'status',
      name: 'Статус',
      width: 120,
      editable: true,
      renderCell: ({ row }) => <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>,
    },
  ], [rows]);

  const draftBanner = draftRows.length > 0 ? (
    <div className={styles.draftBanner}>
      <strong>Хадгалаагүй {draftRows.length} бараа байна. Үргэлжлүүлэх үү?</strong>
      <div className={styles.toolbarGroup}>
        <button className={styles.button} type="button" onClick={() => { setRows(draftRows); setDraftRows([]); }}>
          Тийм
        </button>
        <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => { localStorage.removeItem(DRAFT_KEY); setDraftRows([]); }}>
          Устгах
        </button>
      </div>
    </div>
  ) : null;

  if (rows.length === 0) {
    return (
      <section className={styles.shell}>
        <input ref={imageInputRef} hidden type="file" accept="image/jpeg,image/png" onChange={(event) => void handleImageInput(event.currentTarget.files)} />
        <input ref={csvInputRef} hidden type="file" accept=".csv" onChange={(event) => handleCsv(event.currentTarget.files?.[0])} />
        {draftBanner}
        <div
          className={styles.emptyState}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void handleGridDrop(event)}
        >
          <div>
            <div className={styles.emptyIcon}>📦</div>
            <h1 className={styles.emptyTitle}>Бараа байхгүй байна</h1>
            <p className={styles.emptySub}>Зураг чирж оруулах эсвэл CSV импортлох</p>
            <div className={styles.toolbarGroup}>
              <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => openImagePicker()}>
                Зураг оруулах
              </button>
              <button className={styles.button} type="button" onClick={() => csvInputRef.current?.click()}>
                CSV оруулах
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.shell}>
      <input ref={imageInputRef} hidden type="file" accept="image/jpeg,image/png" onChange={(event) => void handleImageInput(event.currentTarget.files)} />
      <input ref={csvInputRef} hidden type="file" accept=".csv" onChange={(event) => handleCsv(event.currentTarget.files?.[0])} />

      {draftBanner}

      {toast && <div className={styles.toast}>{toast}</div>}
      {progress && <div className={styles.toast}>{progress}</div>}

      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button className={styles.button} type="button" onClick={() => csvInputRef.current?.click()}>
            CSV оруулах
          </button>
          <button className={styles.button} type="button" onClick={downloadTemplate}>
            Template татах
          </button>
        </div>
        {selectedCount > 0 && (
          <div className={styles.toolbarGroup}>
            <button className={`${styles.button} ${styles.primaryButton}`} type="button" onClick={() => void saveBulk(selectedProductRows)}>
              Хадгалах ({selectedCount})
            </button>
            <button className={`${styles.button} ${styles.dangerButton}`} type="button" onClick={() => deleteRows(selectedRows)}>
              Устгах ({selectedCount})
            </button>
            <button className={styles.button} type="button" onClick={() => setSelectedRows(new Set())}>
              Болих
            </button>
          </div>
        )}
      </div>

      <div
        className={`${styles.gridWrap} ${dropActive ? styles.dropActive : ''}`}
        onDragEnter={() => setDropActive(true)}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => void handleGridDrop(event)}
      >
        <DataGrid
          className={styles.grid}
          columns={columns}
          rows={rows}
          rowKeyGetter={(row) => row.id}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          onRowsChange={handleRowsChange}
          rowHeight={52}
          headerRowHeight={42}
          onCellContextMenu={({ row }, event) => {
            event.preventDefault();
            setContextRowId(row.id);
          }}
        />
        <button className={styles.footerAdd} type="button" onClick={() => addRow()}>
          +
        </button>
      </div>

      {contextRowId && (
        <div className={styles.contextMenu}>
          <button type="button" onClick={() => deleteRows(new Set([contextRowId]))}>
            Устгах
          </button>
        </div>
      )}
    </section>
  );
}
