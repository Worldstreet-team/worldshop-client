import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { adminService, type CreateProductData, type ProductImageData } from '@/services/adminService';
import { categoryService } from '@/services/productService';
import type { Product, Category } from '@/types/product.types';
import { useUIStore } from '@/store/uiStore';

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const addToast = useUIStore((s) => s.addToast);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [tags, setTags] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<ProductImageData[]>([]);

  // Load categories
  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => { });
  }, []);

  // Load product data for editing
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminService.getProduct(id)
      .then((product: Product) => {
        setName(product.name);
        setDescription(product.description);
        setShortDesc(product.shortDesc || '');
        setSku(product.stockKeepingUnit || '');
        setCategoryId(product.categoryId || '');
        setBrand(product.brand || '');
        setBasePrice(String(product.basePrice));
        setSalePrice(product.salePrice ? String(product.salePrice) : '');
        setStock(String(product.stock));
        setLowStockThreshold(String(product.lowStockThreshold));
        setTags(product.tags?.join(', ') || '');
        setIsActive(product.isActive);
        setIsFeatured(product.isFeatured);
        setImages(Array.isArray(product.images) ? product.images as unknown as ProductImageData[] : []);
      })
      .catch((err: any) => {
        addToast({ type: 'error', message: err.message || 'Failed to load product' });
        navigate('/admin/products');
      })
      .finally(() => setLoading(false));
  }, [id, addToast, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const results = await adminService.uploadImages(Array.from(files), 'products');
      const newImages: ProductImageData[] = results.map((r, i) => ({
        url: r.url,
        alt: r.originalName.replace(/\.[^.]+$/, ''),
        isPrimary: images.length === 0 && i === 0,
        sortOrder: images.length + i,
        cloudflareId: r.key,
      }));
      setImages((prev) => [...prev, ...newImages]);
      addToast({ type: 'success', message: `${results.length} image(s) uploaded.` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Image upload failed' });
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const removeImage = async (index: number) => {
    const img = images[index];
    if (img.cloudflareId) {
      try {
        await adminService.deleteUploadedImages([img.cloudflareId]);
      } catch {
        // Silently continue — image may already be deleted
      }
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !basePrice) {
      addToast({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    setSaving(true);
    const data: CreateProductData = {
      name: name.trim(),
      description: description.trim(),
      shortDesc: shortDesc.trim() || undefined,
      stockKeepingUnit: sku.trim() || undefined,
      categoryId: categoryId || null,
      brand: brand.trim() || null,
      basePrice: parseFloat(basePrice),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      stock: parseInt(stock) || 0,
      lowStockThreshold: parseInt(lowStockThreshold) || 10,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      images,
      isActive,
      isFeatured,
    };

    try {
      if (isEditing && id) {
        await adminService.updateProduct(id, data);
        addToast({ type: 'success', message: 'Product updated successfully.' });
      } else {
        await adminService.createProduct(data);
        addToast({ type: 'success', message: 'Product created successfully.' });
      }
      navigate('/admin/products');
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to save product' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-product-edit">
        <div className="page-header"><h1>Loading...</h1></div>
      </div>
    );
  }

  return (
    <div className="admin-product-edit">
      <div className="page-header">
        <Link to="/admin/products" className="back-link">
          <span className="material-icons">arrow_back</span>
          Back to Products
        </Link>
        <h1>{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-layout">
          <div className="form-main">
            {/* Basic Info */}
            <section className="form-section">
              <h2>Basic Information</h2>

              <div className="form-group">
                <label htmlFor="name">Product Name *</label>
                <input id="name" type="text" placeholder="Enter product name"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea id="description" rows={5} placeholder="Enter product description"
                  value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>

              <div className="form-group">
                <label htmlFor="shortDesc">Short Description</label>
                <input id="shortDesc" type="text" placeholder="Brief summary"
                  value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sku">SKU</label>
                  <input id="sku" type="text" placeholder="SKU-001"
                    value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="brand">Brand</label>
                  <input id="brand" type="text" placeholder="Brand name"
                    value={brand} onChange={(e) => setBrand(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="tags">Tags (comma-separated)</label>
                  <input id="tags" type="text" placeholder="electronics, gadgets"
                    value={tags} onChange={(e) => setTags(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="form-section">
              <h2>Pricing</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Price (₦) *</label>
                  <input id="price" type="number" step="0.01" min="0" placeholder="0.00"
                    value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="compareAtPrice">Sale Price (₦)</label>
                  <input id="compareAtPrice" type="number" step="0.01" min="0" placeholder="0.00"
                    value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Inventory */}
            <section className="form-section">
              <h2>Inventory</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="stock">Stock Quantity</label>
                  <input id="stock" type="number" min="0" placeholder="0"
                    value={stock} onChange={(e) => setStock(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="lowStockThreshold">Low Stock Threshold</label>
                  <input id="lowStockThreshold" type="number" min="0" placeholder="10"
                    value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Images */}
            <section className="form-section">
              <h2>Images</h2>

              {/* Uploaded images grid */}
              {images.length > 0 && (
                <div className="uploaded-images-grid">
                  {images.map((img, i) => (
                    <div key={i} className={`uploaded-image ${img.isPrimary ? 'is-primary' : ''}`}>
                      <img src={img.url} alt={img.alt} />
                      <div className="image-actions">
                        <button type="button" onClick={() => setPrimaryImage(i)}
                          className={`btn-icon-sm ${img.isPrimary ? 'active' : ''}`} title="Set as primary">
                          <span className="material-icons">star</span>
                        </button>
                        <button type="button" onClick={() => removeImage(i)}
                          className="btn-icon-sm btn-icon-danger" title="Remove">
                          <span className="material-icons">close</span>
                        </button>
                      </div>
                      {img.isPrimary && <span className="primary-badge">Primary</span>}
                    </div>
                  ))}
                </div>
              )}

              <label className="image-upload-zone">
                <span className="material-icons">{uploadingImages ? 'hourglass_empty' : 'cloud_upload'}</span>
                <p>{uploadingImages ? 'Uploading...' : 'Click to upload images (max 5MB each)'}</p>
                <input type="file" accept="image/*" multiple hidden
                  onChange={handleImageUpload} disabled={uploadingImages} />
              </label>
            </section>
          </div>

          <div className="form-sidebar">
            {/* Status */}
            <section className="form-section">
              <h2>Status</h2>
              <label className="checkbox-label">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <span>Active (visible in store)</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                <span>Featured product</span>
              </label>
            </section>

            {/* Actions */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
              </button>
              <Link to="/admin/products" className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
