import { useState, useEffect, useCallback } from 'react';
import { Plus, FolderTree, Trash2, X } from 'lucide-react';
import { adminService, type AdminCategory, type CreateCategoryData, type UpdateCategoryData } from '@/services/adminService';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

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
    setFormName(cat.name);
    setFormDesc(cat.description || '');
    setFormImage(cat.image || '');
    setFormIcon(cat.icon || '');
    setFormParentId(cat.parentId || '');
    setFormSortOrder(String(cat.sortOrder));
    setFormIsActive(cat.isActive);
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setIsCreating(true);
    resetForm();
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

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <h1 className="ws-page__title">
          Categories <span className="ws-muted ws-num" style={{ fontWeight: 400 }}>({categories.length})</span>
        </h1>
        <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={handleCreate}>
          <Plus size={14} aria-hidden />
          Add Category
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
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="ws-listrow ws-listrow--link"
                  onClick={() => handleSelectCategory(cat)}
                  style={{
                    cursor: 'pointer',
                    background: selectedCategory?.id === cat.id ? 'var(--ws-bg-raised)' : undefined,
                    opacity: cat.isActive ? 1 : 0.55,
                  }}
                >
                  {cat.image && (
                    <img
                      src={cat.image}
                      alt=""
                      style={{
                        width: 32, height: 32, objectFit: 'cover', flex: 'none',
                        borderRadius: 'var(--ws-radius-md)',
                        border: '1px solid var(--ws-border-hairline)',
                      }}
                    />
                  )}
                  <div className="ws-listrow__body">
                    <span className="ws-listrow__title">{cat.name}</span>
                    <span className="ws-listrow__sub">
                      {cat.productCount ?? 0} listings
                      {cat.parent && ` · in ${cat.parent.name}`}
                    </span>
                  </div>
                  {!cat.isActive && <span className="ws-badge ws-badge--neutral">Inactive</span>}
                  <button
                    className="ws-iconbtn"
                    title="Deactivate"
                    aria-label={`Deactivate ${cat.name}`}
                    onClick={(e) => { e.stopPropagation(); handleDelete(cat.id, cat.name); }}
                    style={{ color: 'var(--ws-status-danger)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Edit Panel */}
        <aside className="ws-aside">
          <div className="ws-card">
            {showForm ? (
              <form onSubmit={handleSubmit} className="ws-stack--lg">
                <h2 className="ws-h2">
                  {isCreating ? 'New Category' : `Edit: ${selectedCategory?.name}`}
                </h2>

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
                        onClick={() => setFormImage('')}
                        aria-label="Remove image"
                        style={{
                          position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                          borderRadius: 'var(--ws-radius-pill)', border: 'none',
                          background: 'var(--ws-status-danger)', color: '#fff', cursor: 'pointer',
                          display: 'grid', placeItems: 'center',
                        }}
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
                  <label htmlFor="catParent" className="ws-formfield__label">Parent Category</label>
                  <select
                    id="catParent"
                    className="ws-select"
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                  >
                    <option value="">None (top-level)</option>
                    {categories
                      .filter((c) => c.id !== selectedCategory?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
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
                    {saving ? 'Saving…' : isCreating ? 'Create Category' : 'Update Category'}
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
                <h2 className="ws-h2">Category Details</h2>
                <p className="ws-body ws-muted">Select a category to edit, or create a new one.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
