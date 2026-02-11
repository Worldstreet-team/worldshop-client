import { useState, useEffect, useCallback } from 'react';
import { adminService, type AdminCategory, type CreateCategoryData, type UpdateCategoryData } from '@/services/adminService';
import { useUIStore } from '@/store/uiStore';

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
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load categories' });
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
        setFormImage(results[0].url);
        addToast({ type: 'success', message: 'Category image uploaded.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Image upload failed' });
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
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to save category' });
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
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete category' });
    }
  };

  const showForm = isCreating || selectedCategory;

  return (
    <div className="admin-categories">
      <div className="page-header">
        <h1>Categories ({categories.length})</h1>
        <button className="btn btn-primary" onClick={handleCreate}>
          <span className="material-icons">add</span>
          Add Category
        </button>
      </div>

      <div className="categories-container">
        {/* Categories List */}
        <div className="categories-tree">
          {loading ? (
            <div className="empty-state">
              <p>Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">category</span>
              <h2>No categories yet</h2>
              <p>Create your first category to organize products.</p>
            </div>
          ) : (
            <div className="category-list">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`category-item ${selectedCategory?.id === cat.id ? 'selected' : ''} ${!cat.isActive ? 'inactive' : ''}`}
                  onClick={() => handleSelectCategory(cat)}
                >
                  <div className="category-item-info">
                    {cat.image && <img src={cat.image} alt={cat.name} className="category-thumb" />}
                    <div>
                      <strong>{cat.name}</strong>
                      <small>{cat.productCount ?? 0} products</small>
                      {cat.parent && <small className="text-muted"> · in {cat.parent.name}</small>}
                    </div>
                  </div>
                  <div className="category-item-actions">
                    {!cat.isActive && <span className="badge badge-secondary">Inactive</span>}
                    <button
                      className="btn-icon btn-icon-danger"
                      title="Deactivate"
                      onClick={(e) => { e.stopPropagation(); handleDelete(cat.id, cat.name); }}
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Edit Panel */}
        <div className="category-edit-panel">
          {showForm ? (
            <form onSubmit={handleSubmit}>
              <h2>{isCreating ? 'New Category' : `Edit: ${selectedCategory?.name}`}</h2>

              <div className="form-group">
                <label htmlFor="catName">Name *</label>
                <input id="catName" type="text" placeholder="Category name"
                  value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label htmlFor="catDesc">Description</label>
                <textarea id="catDesc" rows={3} placeholder="Category description"
                  value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Image</label>
                {formImage && (
                  <div className="category-image-preview">
                    <img src={formImage} alt="Category" />
                    <button type="button" className="btn-icon-sm btn-icon-danger"
                      onClick={() => setFormImage('')}>
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                )}
                <label className="image-upload-zone small">
                  <span className="material-icons">{uploadingImage ? 'hourglass_empty' : 'cloud_upload'}</span>
                  <p>{uploadingImage ? 'Uploading...' : 'Upload image'}</p>
                  <input type="file" accept="image/*" hidden
                    onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="catIcon">Icon Name</label>
                <input id="catIcon" type="text" placeholder="e.g. smartphone"
                  value={formIcon} onChange={(e) => setFormIcon(e.target.value)} />
              </div>

              <div className="form-group">
                <label htmlFor="catParent">Parent Category</label>
                <select id="catParent" value={formParentId} onChange={(e) => setFormParentId(e.target.value)}>
                  <option value="">None (top-level)</option>
                  {categories
                    .filter((c) => c.id !== selectedCategory?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="catOrder">Sort Order</label>
                  <input id="catOrder" type="number" min="0"
                    value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} />
                </div>
              </div>

              <label className="checkbox-label">
                <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
                <span>Active</span>
              </label>

              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                  {saving ? 'Saving...' : isCreating ? 'Create Category' : 'Update Category'}
                </button>
                <button type="button" className="btn btn-secondary btn-block"
                  onClick={() => { setSelectedCategory(null); setIsCreating(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2>Category Details</h2>
              <p>Select a category to edit or create a new one.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
