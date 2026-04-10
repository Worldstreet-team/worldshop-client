import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { vendorService, type VendorCreateProductData } from '@/services/vendorService';
import { categoryService } from '@/services/productService';
import type { Product, Category, ProductImage } from '@/types/product.types';
import { useUIStore } from '@/store/uiStore';

export default function VendorProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const addToast = useUIStore((s) => s.addToast);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<ProductImage[]>([]);

  // Image URL input
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Variants
  const [variants, setVariants] = useState<{
    name: string;
    attributes: Record<string, string>;
    price?: number;
    compareAtPrice?: number;
    stock?: number;
    isActive: boolean;
  }[]>([]);

  // Approval status (read-only, for display)
  const [approvalStatus, setApprovalStatus] = useState('');

  // Load categories
  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  // Load product data for editing
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    vendorService.getProduct(id)
      .then((res) => {
        const product: Product = res.data.data;
        setName(product.name);
        setDescription(product.description);
        setShortDesc(product.shortDesc || '');
        setCategoryId(product.categoryId || '');
        setBasePrice(String(product.basePrice));
        setSalePrice(product.salePrice ? String(product.salePrice) : '');
        setTags(product.tags?.join(', ') || '');
        setImages(Array.isArray(product.images) ? product.images : []);
        setApprovalStatus(product.approvalStatus || '');
        if (product.variants?.length) {
          setVariants(product.variants.map((v) => ({
            name: v.name,
            attributes: v.attributes || {},
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: v.stock,
            isActive: true,
          })));
        }
      })
      .catch((err: any) => {
        addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load product' });
        navigate('/vendor/products');
      })
      .finally(() => setLoading(false));
  }, [id, addToast, navigate]);

  const addImage = () => {
    if (!imageUrl.trim()) return;
    const newImage: ProductImage = {
      id: `temp-${Date.now()}`,
      url: imageUrl.trim(),
      alt: imageAlt.trim() || name,
      isPrimary: images.length === 0,
      sortOrder: images.length,
    };
    setImages((prev) => [...prev, newImage]);
    setImageUrl('');
    setImageAlt('');
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // If we removed the primary, make first one primary
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0] = { ...updated[0], isPrimary: true };
      }
      return updated;
    });
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index }))
    );
  };

  // Variant helpers
  const addVariant = () => {
    setVariants((prev) => [...prev, {
      name: '',
      attributes: {},
      price: undefined,
      compareAtPrice: undefined,
      stock: 0,
      isActive: true,
    }]);
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setVariants((prev) => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !basePrice) {
      addToast({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    setSaving(true);
    const data: VendorCreateProductData = {
      name: name.trim(),
      description: description.trim(),
      shortDesc: shortDesc.trim() || undefined,
      categoryId: categoryId || null,
      basePrice: parseFloat(basePrice),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      images: images.map(({ url, alt, isPrimary }, i) => ({
        url, alt, isPrimary, sortOrder: i, cloudflareId: undefined,
      })),
      variants: variants.length > 0 ? variants.map((v) => ({
        name: v.name,
        attributes: v.attributes,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        stock: v.stock,
        isActive: v.isActive,
      })) : undefined,
    };

    try {
      if (isEditing && id) {
        await vendorService.updateProduct(id, data);
        addToast({ type: 'success', message: 'Product updated successfully.' });
      } else {
        await vendorService.createProduct(data);
        addToast({ type: 'success', message: 'Product created! It will be reviewed before appearing in the store.' });
      }
      navigate('/vendor/products');
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to save product' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="vendor-product-edit">
        <div className="page-header"><h1>Loading...</h1></div>
      </div>
    );
  }

  return (
    <div className="vendor-product-edit">
      <div className="page-header">
        <Link to="/vendor/products" className="back-link">
          <span className="material-icons">arrow_back</span>
          Back to Products
        </Link>
        <h1>{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
      </div>

      {/* Approval status banner */}
      {isEditing && approvalStatus && approvalStatus !== 'APPROVED' && (
        <div className={`approval-banner approval-${approvalStatus.toLowerCase()}`}>
          <span className="material-icons">
            {approvalStatus === 'PENDING' ? 'hourglass_empty' : 'block'}
          </span>
          <span>
            {approvalStatus === 'PENDING'
              ? 'This product is pending admin approval.'
              : `This product has been ${approvalStatus.toLowerCase()} by an admin.`}
          </span>
        </div>
      )}

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
                <textarea id="description" rows={5} placeholder="Describe your product"
                  value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>

              <div className="form-group">
                <label htmlFor="shortDesc">Short Description</label>
                <input id="shortDesc" type="text" placeholder="Brief summary for listings"
                  value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
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
                  <label htmlFor="salePrice">Sale Price (₦)</label>
                  <input id="salePrice" type="number" step="0.01" min="0" placeholder="0.00"
                    value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Images */}
            <section className="form-section">
              <h2>Images</h2>

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

              <div className="image-url-input">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label htmlFor="imageUrl">Image URL</label>
                    <input id="imageUrl" type="url" placeholder="https://example.com/image.jpg"
                      value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="imageAlt">Alt Text</label>
                    <input id="imageAlt" type="text" placeholder="Image description"
                      value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
                  </div>
                </div>
                <button type="button" className="btn btn-secondary" onClick={addImage}
                  disabled={!imageUrl.trim()}>
                  <span className="material-icons">add_photo_alternate</span>
                  Add Image
                </button>
              </div>
            </section>

            {/* Variants */}
            <section className="form-section">
              <div className="section-header">
                <h2>Variants</h2>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addVariant}>
                  <span className="material-icons">add</span>
                  Add Variant
                </button>
              </div>

              {variants.length === 0 ? (
                <p className="text-muted">No variants. Add variants if your product comes in different sizes, colors, etc.</p>
              ) : (
                <div className="variants-list">
                  {variants.map((variant, i) => (
                    <div key={i} className="variant-card">
                      <div className="variant-header">
                        <strong>Variant {i + 1}</strong>
                        <button type="button" className="btn-icon-sm btn-icon-danger"
                          onClick={() => removeVariant(i)} title="Remove variant">
                          <span className="material-icons">close</span>
                        </button>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Name *</label>
                          <input type="text" placeholder="e.g. Large / Red"
                            value={variant.name}
                            onChange={(e) => updateVariant(i, 'name', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Price (₦)</label>
                          <input type="number" step="0.01" min="0" placeholder="Override price"
                            value={variant.price ?? ''}
                            onChange={(e) => updateVariant(i, 'price', e.target.value ? parseFloat(e.target.value) : undefined)} />
                        </div>
                        <div className="form-group">
                          <label>Stock</label>
                          <input type="number" min="0" placeholder="0"
                            value={variant.stock ?? 0}
                            onChange={(e) => updateVariant(i, 'stock', parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="form-sidebar">
            {/* Status info */}
            {isEditing && approvalStatus && (
              <section className="form-section">
                <h2>Status</h2>
                <div className={`status-badge status-${approvalStatus.toLowerCase()}`}>
                  {approvalStatus}
                </div>
              </section>
            )}

            {/* Actions */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
              </button>
              <Link to="/vendor/products" className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
