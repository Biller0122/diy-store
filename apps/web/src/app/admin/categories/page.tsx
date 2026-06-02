'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit3, FolderTree, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { vendureAdminFetch, type VendureCollection } from '@/lib/vendure';

type Category = Omit<VendureCollection, 'children'> & {
  productVariants?: { totalItems: number };
  children?: Category[];
};

type FlatCategory = Omit<Category, 'children'> & { depth: number; children?: Category[] };

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string;
};

const EMPTY_FORM: CategoryForm = {
  name: '',
  slug: '',
  icon: '📦',
  parentId: '',
};

const COLLECTIONS_QUERY = `
  query AdminCollections {
    collections(options: { take: 100, topLevelOnly: true, sort: { position: ASC } }) {
      items {
        id
        name
        slug
        parentId
        customFields { icon }
        productVariants(options: { take: 1 }) { totalItems }
        children {
          id
          name
          slug
          parentId
          customFields { icon }
          productVariants(options: { take: 1 }) { totalItems }
        }
      }
    }
  }
`;

const CREATE_COLLECTION = `
  mutation CreateCollection($input: CreateCollectionInput!) {
    createCollection(input: $input) {
      id
      name
      slug
      parentId
      customFields { icon }
    }
  }
`;

const UPDATE_COLLECTION = `
  mutation UpdateCollection($input: UpdateCollectionInput!) {
    updateCollection(input: $input) {
      id
      name
      slug
      parentId
      customFields { icon }
    }
  }
`;

const DELETE_COLLECTION = `
  mutation DeleteCollection($id: ID!) {
    deleteCollection(id: $id) {
      result
      message
    }
  }
`;

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', ө: 'u', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'ii', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function flattenCategories(categories: Category[]): FlatCategory[] {
  return categories.flatMap((category) => [
    { ...category, depth: 0 },
    ...(category.children ?? []).map((child) => ({ ...child, depth: 1 })),
  ]);
}

function collectionInput(form: CategoryForm) {
  const slug = form.slug.trim();
  const name = form.name.trim();
  const icon = form.icon.trim() || '📦';

  return {
    isPrivate: false,
    ...(form.parentId ? { parentId: form.parentId } : {}),
    inheritFilters: false,
    filters: [],
    customFields: { icon },
    translations: [
      { languageCode: 'mn', name, slug, description: '', customFields: { icon } },
      { languageCode: 'en', name, slug, description: '', customFields: { icon } },
    ],
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const editing = Boolean(form.id);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const data = await vendureAdminFetch<{ collections: { items: Category[] } }>(COLLECTIONS_QUERY);
      setCategories((data.collections.items ?? []).filter((item) => item.slug !== '__root_collection__'));
    } catch (err: any) {
      setError(err.message || 'Ангилал уншихад алдаа гарлаа. Admin-аар дахин нэвтрээд үзнэ үү.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  function setName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: current.id ? current.slug : slugify(name),
    }));
  }

  function editCategory(category: Category) {
    setMessage(null);
    setError(null);
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.customFields?.icon ?? '📦',
      parentId: category.parentId ?? '',
    });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
    setMessage(null);
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.name.trim()) {
      setError('Ангиллын нэр оруулна уу.');
      return;
    }
    if (!form.slug.trim()) {
      setError('Slug оруулна уу.');
      return;
    }
    if (form.id && form.id === form.parentId) {
      setError('Ангилал өөрөө өөрийн parent байж болохгүй.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await vendureAdminFetch(UPDATE_COLLECTION, {
          input: {
            id: form.id,
            ...collectionInput(form),
          },
        });
        setMessage('Ангилал шинэчлэгдлээ.');
      } else {
        await vendureAdminFetch(CREATE_COLLECTION, {
          input: collectionInput(form),
        });
        setMessage('Шинэ ангилал нэмэгдлээ.');
      }
      setForm(EMPTY_FORM);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Хадгалах үед алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    const childCount = category.children?.length ?? 0;
    const confirmed = window.confirm(
      childCount > 0
        ? `"${category.name}" ангилал ${childCount} дэд ангилалтай байна. Устгах уу?`
        : `"${category.name}" ангиллыг устгах уу?`,
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    try {
      const data = await vendureAdminFetch<{ deleteCollection: { result: string; message?: string | null } }>(
        DELETE_COLLECTION,
        { id: category.id },
      );
      if (data.deleteCollection.result !== 'DELETED') {
        throw new Error(data.deleteCollection.message || 'Устгаж чадсангүй.');
      }
      setMessage('Ангилал устгагдлаа.');
      if (form.id === category.id) setForm(EMPTY_FORM);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Устгах үед алдаа гарлаа.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <FolderTree size={20} className="text-brand" />
            Ангиллын удирдлага
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Vendure collection API-тай шууд холбогдож нэмэх, засах, устгах үйлдэл хийнэ.
          </p>
        </div>
        <button
          onClick={loadCategories}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] px-4 py-2 text-sm font-semibold text-foreground-muted hover:bg-white/5 hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Дахин унших
        </button>
      </div>

      {(error || message) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          error
            ? 'border-error/30 bg-error/10 text-error'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        }`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <form onSubmit={saveCategory} className="rounded-2xl border border-[var(--glass-border)] bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{editing ? 'Ангилал засах' : 'Шинэ ангилал'}</h3>
            {editing && (
              <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-foreground-muted hover:bg-white/5 hover:text-foreground">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Нэр</span>
              <input
                value={form.name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Жишээ: Сантехник"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Slug</span>
              <input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                placeholder="santekhnik"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-brand/60"
              />
            </label>

            <div className="grid grid-cols-[76px_1fr] gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Icon</span>
                <input
                  value={form.icon}
                  onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2.5 text-center text-sm text-foreground outline-none focus:border-brand/60"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Parent ангилал</span>
                <select
                  value={form.parentId}
                  onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand/60"
                >
                  <option value="">Үндсэн ангилал</option>
                  {flatCategories
                    .filter((category) => category.id !== form.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.depth > 0 ? '— ' : ''}{category.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : editing ? <Save size={16} /> : <Plus size={16} />}
              {editing ? 'Шинэчлэх' : 'Нэмэх'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-[var(--glass-border)] bg-card">
          <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Backend ангиллууд</h3>
              <p className="text-xs text-foreground-muted">{flatCategories.length} collection</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={22} className="animate-spin text-brand" />
            </div>
          ) : flatCategories.length === 0 ? (
            <div className="py-20 text-center text-sm text-foreground-muted">Ангилал бүртгэгдээгүй байна.</div>
          ) : (
            <div className="divide-y divide-[var(--glass-border)]">
              {flatCategories.map((category) => (
                <div key={category.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-lg">
                    {category.customFields?.icon ?? '📦'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`truncate text-sm font-semibold text-foreground ${category.depth > 0 ? 'pl-4' : ''}`}>
                        {category.depth > 0 ? '↳ ' : ''}{category.name}
                      </p>
                      {category.depth === 0 && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                          Үндсэн
                        </span>
                      )}
                    </div>
                    <p className="truncate font-mono text-xs text-foreground-muted">
                      /category/{category.slug} · {category.productVariants?.totalItems ?? 0} бараа
                    </p>
                  </div>
                  <button
                    onClick={() => editCategory(category)}
                    className="rounded-lg p-2 text-foreground-muted hover:bg-white/5 hover:text-foreground"
                    aria-label="Засах"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteCategory(category)}
                    className="rounded-lg p-2 text-foreground-muted hover:bg-error/10 hover:text-error"
                    aria-label="Устгах"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
