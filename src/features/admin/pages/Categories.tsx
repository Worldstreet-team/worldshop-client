import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, FolderTree, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { adminService, type AdminCategory, type CreateCategoryData, type UpdateCategoryData } from '@/features/admin/api';
import { useUIStore } from '@/shared/store/uiStore';
import { toApiError } from '@/shared/lib/api';

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};


export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);
  // Categories whose subcategories are showing.
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /**
   * The taxonomy is two levels: categories, and the subcategories listings are
   * filed under. A subcategory whose parent is missing from the list is shown
   * at the top level rather than dropped, so it can still be found and fixed.
   */
  const groups = useMemo(() => {
    const ids = new Set(categories.map((c) => c.id));
    const byOrder = (a: AdminCategory, b: AdminCategory) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
    const tops = categories.filter((c) => !c.parentId || !ids.has(c.parentId)).sort(byOrder);
    return tops.map((top) => ({
      top,
      subs: categories.filter((c) => c.parentId === top.id).sort(byOrder),
    }));
  }, [categories]);
  const subCount = categories.length - groups.length;
  const topOptions = groups.map((g) => g.top);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getCategories(true);
      setCategories(data);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to load categories') });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormImage('');
    setFormIcon('');
    setFormParentId('');
    setFormSortOrder('0');
    setFormIsActive(true);
  };

  const handleSelectCategory = (cat: AdminCategory) => {
    setSelectedCategory(cat);
    setIsCreating(false);
    if (cat.parentId) setOpen((prev) => new Set(prev).add(cat.parentId!));
    setFormName(cat.name);
    setFormDesc(cat.description || '');
    setFormImage(cat.image || '');
    setFormIcon(cat.icon || '');
    setFormParentId(cat.parentId || '');
    setFormSortOrder(String(cat.sortOrder));
    setFormIsActive(cat.isActive);
  };

  /** With a parent: a new subcategory under it. Without: a new top-level category. */
  const handleCreate = (parentId?: string) => {
    setSelectedCategory(null);
    setIsCreating(true);
    resetForm();
    if (parentId) {
      setFormParentId(parentId);
      setOpen((prev) => new Set(prev).add(parentId));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const results = await adminService.uploadImages(Array.from(files), 'categories');
      if (results.length > 0) {
        setFormImage(results[0].signedUrl);
        addToast({ type: 'success', message: 'Category image uploaded.' });
      }
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Image upload failed') });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast({ type: 'error', message: 'Category name is required.' });
      return;
    }

    setSaving(true);
    const data: CreateCategoryData = {
      name: formName.trim(),
      description: formDesc.trim() || null,
      image: formImage.trim() || null,
      icon: formIcon.trim() || null,
      parentId: formParentId || null,
      sortOrder: parseInt(formSortOrder) || 0,
      isActive: formIsActive,
    };

    try {
      if (isCreating) {
        await adminService.createCategory(data);
        addToast({ type: 'success', message: 'Category created.' });
      } else if (selectedCategory) {
        await adminService.updateCategory(selectedCategory.id, data as UpdateCategoryData);
        addToast({ type: 'success', message: 'Category updated.' });
      }
      fetchCategories();
      setSelectedCategory(null);
      setIsCreating(false);
      resetForm();
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to save category') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? Products in this category will remain but the category will be hidden.`)) return;
    try {
      await adminService.deleteCategory(id);
      addToast({ type: 'success', message: `"${name}" deactivated.` });
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
        resetForm();
      }
      fetchCategories();
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to delete category') });
    }
  };

  const showForm = isCreating || selectedCategory;
  // What the form is about, in the admin's words: a category or a subcategory.
  const formParentName = topOptions.find((c) => c.id === formParentId)?.name;
  const kind = formParentId ? 'subcategory' : 'category';
  const formTitle = isCreating
    ? formParentName ? `New subcategory in ${formParentName}` : 'New category'
    : `Edit ${kind}: ${selectedCategory?.name}`;
  // A category with subcategories cannot move under another; the server
  // refuses it, so the field is locked rather than offered.
  const hasChildren = !!selectedCategory && categories.some((c) => c.parentId === selectedCategory.id);

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <h1 className="ws-page__title">
          Categories{' '}
          <span className="ws-muted ws-num" style={{ fontWeight: 400, fontSize: '0.6em' }}>
            {groups.length} categories · {subCount} subcategories
          </span>
        </h1>
        <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={() => handleCreate()}>
          <Plus size={14} aria-hidden />
          Add category
        </button>
      </div>

      {/* List beside the editor — the same split the detail pages use. */}
      <div className="ws-detail" style={{ paddingBlock: 0 }}>
        <div className="ws-card ws-card--flush">
          {loading ? (
            <div className="ws-stack" style={{ padding: 'var(--ws-space-4)' }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="ws-skeleton" style={{ height: 44 }} />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="ws-empty" style={{ border: 0 }}>
              <div className="ws-empty__icon">
                <FolderTree size={26} aria-hidden />
              </div>
              <h2 className="ws-title">No categories yet</h2>
              <p className="ws-caption ws-muted">Create your first category to organize listings.</p>
            </div>
          ) : (
            <div>
              {groups.map(({ top, subs }) => {
                const isOpen = open.has(top.id);
                const listings = subs.reduce((n, s) => n + (s.productCount ?? 0), top.productCount ?? 0);
                return (
                  <div key={top.id}>
                    <div
                      className="ws-listrow ws-listrow--link"
                      onClick={() => handleSelectCategory(top)}
                      style={{
                        cursor: 'pointer',
                        background: selectedCategory?.id === top.id ? 'var(--ws-bg-raised)' : undefined,
                        opacity: top.isActive ? 1 : 0.55,
                      }}
                    >
                      <button
                        type="button"
                        className="ws-iconbtn"
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${top.name}`}
                        onClick={(e) => { e.stopPropagation(); toggle(top.id); }}
                        disabled={subs.length === 0}
                        style={{ visibility: subs.length === 0 ? 'hidden' : undefined }}
                      >
                        {isOpen ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                      </button>
                      {top.image && (
                        <img
                          src={top.image}
                          alt=""
                          style={{
                            width: 32, height: 32, objectFit: 'cover', flex: 'none',
                            borderRadius: 'var(--ws-radius-md)',
                            border: '1px solid var(--ws-border-hairline)',
                          }}
                        />
                      )}
                      <div className="ws-listrow__body">
                        <span className="ws-listrow__title">{top.name}</span>
                        <span className="ws-listrow__sub">
                          {subs.length} {subs.length === 1 ? 'subcategory' : 'subcategories'} · {listings} {listings === 1 ? 'listing' : 'listings'}
                        </span>
                      </div>
                      {!top.isActive && <span className="ws-badge ws-badge--neutral">Inactive</span>}
                      <button
                        className="ws-iconbtn"
                        title={`Add a subcategory to ${top.name}`}
                        aria-label={`Add a subcategory to ${top.name}`}
                        onClick={(e) => { e.stopPropagation(); handleCreate(top.id); }}
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        className="ws-iconbtn"
                        title="Deactivate"
                        aria-label={`Deactivate ${top.name}`}
                        onClick={(e) => { e.stopPropagation(); handleDelete(top.id, top.name); }}
                        style={{ color: 'var(--ws-status-danger)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {isOpen && subs.map((sub) => (
                      <div
                        key={sub.id}
                        className="ws-listrow ws-listrow--link"
                        onClick={() => handleSelectCategory(sub)}
                        style={{
                          cursor: 'pointer',
                          // Indented past the parent's chevron, so the two
                          // levels read as a tree rather than one list.
                          paddingLeft: 'calc(var(--ws-space-8) * 2 + var(--ws-space-1))',
                          background: selectedCategory?.id === sub.id ? 'var(--ws-bg-raised)' : undefined,
                          opacity: sub.isActive ? 1 : 0.55,
                        }}
                      >
                        <div className="ws-listrow__body">
                          <span className="ws-listrow__title" style={{ fontWeight: 500 }}>{sub.name}</span>
                          <span className="ws-listrow__sub">{sub.productCount ?? 0} {sub.productCount === 1 ? 'listing' : 'listings'}</span>
                        </div>
                        {!sub.isActive && <span className="ws-badge ws-badge--neutral">Inactive</span>}
                        <button
                          className="ws-iconbtn"
                          title="Deactivate"
                          aria-label={`Deactivate ${sub.name}`}
                          onClick={(e) => { e.stopPropagation(); handleDelete(sub.id, sub.name); }}
                          style={{ color: 'var(--ws-status-danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Edit Panel */}
        <aside className="ws-aside">
          <div className="ws-card">
            {showForm ? (
              <form onSubmit={handleSubmit} className="ws-stack--lg">
                <h2 className="ws-h2">{formTitle}</h2>

                <div className="ws-formfield">
                  <label htmlFor="catName" className="ws-formfield__label">Name *</label>
                  <input
                    id="catName"
                    type="text"
                    className="ws-field"
                    placeholder="Category name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="ws-formfield">
                  <label htmlFor="catDesc" className="ws-formfield__label">Description</label>
                  <textarea
                    id="catDesc"
                    className="ws-textarea"
                    rows={3}
                    placeholder="Category description"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </div>

                <div className="ws-formfield">
                  <span className="ws-formfield__label">Image</span>
                  {formImage && (
                    <div style={{ position: 'relative', width: 'fit-content' }}>
                      <img
                        src={formImage}
                        alt=""
                        style={{
                          width: 96, height: 96, objectFit: 'cover', display: 'block',
                          borderRadius: 'var(--ws-radius-lg)',
                          border: '1px solid var(--ws-border-hairline)',
                        }}
                      />
                      <button
                        type="button"
                        className="ws-thumbremove"
                        onClick={() => setFormImage('')}
                        aria-label="Remove image"
                      >
                        <X size={13} aria-hidden />
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="ws-file"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && <p className="ws-caption ws-muted">Uploading…</p>}
                </div>

                <div className="ws-formfield">
                  <label htmlFor="catIcon" className="ws-formfield__label">Icon Name</label>
                  <input
                    id="catIcon"
                    type="text"
                    className="ws-field"
                    placeholder="e.g. smartphone"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                  />
                </div>

                <div className="ws-formfield">
                  <label htmlFor="catParent" className="ws-formfield__label">Belongs to</label>
                  <select
                    id="catParent"
                    className="ws-select"
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    disabled={hasChildren}
                  >
                    <option value="">Nothing: this is a top-level category</option>
                    {/* Only categories can hold subcategories: two levels, no more. */}
                    {topOptions
                      .filter((c) => c.id !== selectedCategory?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>Subcategory of {c.name}</option>
                      ))}
                  </select>
                  <p className="ws-caption ws-muted">
                    {hasChildren
                      ? 'This category has subcategories, so it stays top-level.'
                      : 'Listings are filed under subcategories, and filters are set per subcategory.'}
                  </p>
                </div>

                <div className="ws-formfield">
                  <label htmlFor="catOrder" className="ws-formfield__label">Sort Order</label>
                  <input
                    id="catOrder"
                    type="number"
                    min="0"
                    className="ws-field ws-num"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                  />
                </div>

                <label className="ws-check">
                  <input
                    type="checkbox"
                    className="ws-check__input"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span className="ws-check__label">Active</span>
                </label>

                <div className="ws-stack">
                  <button type="submit" className="ws-btn ws-btn--primary ws-btn--block" disabled={saving}>
                    {saving ? 'Saving…' : `${isCreating ? 'Create' : 'Save'} ${kind}`}
                  </button>
                  <button
                    type="button"
                    className="ws-btn ws-btn--ghost ws-btn--block"
                    onClick={() => { setSelectedCategory(null); setIsCreating(false); resetForm(); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="ws-h2">Category details</h2>
                <p className="ws-body ws-muted">
                  Select a category or subcategory to edit. Use + on a category to add a subcategory to it.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
