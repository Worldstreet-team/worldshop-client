import { useState, useEffect, useRef } from 'react';
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
  const [productType, setProductType] = useState<'PHYSICAL' | 'DIGITAL'>('DIGITAL');
  const [stock, setStock] = useState('0');
  const [images, setImages] = useState<ProductImage[]>([]);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Digital file state
  const digitalFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const [digitalAssets, setDigitalAssets] = useState<{ id: string; fileName: string; mimeType: string; fileSize: number }[]>([]);

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
        const product: Product = res.data;
        setName(product.name);
        setDescription(product.description);
        setShortDesc(product.shortDesc || '');
        setCategoryId(product.categoryId || '');
        setBasePrice(String(product.basePrice));
        setSalePrice(product.salePrice ? String(product.salePrice) : '');
        setTags(product.tags?.join(', ') || '');
        setProductType(product.type === 'PHYSICAL' ? 'PHYSICAL' : 'DIGITAL');
        setStock(product.type === 'PHYSICAL' ? String(product.stock ?? 0) : '0');
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
        // Load digital assets for digital products
        if (product.type === 'DIGITAL') {
          loadDigitalAssets(id);
        }
      })
      .catch((err: any) => {
        addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load product' });
        navigate('/vendor/products');
      })
      .finally(() => setLoading(false));
  }, [id, addToast, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const results = await vendorService.uploadImages(Array.from(files));
      const newImages: ProductImage[] = results.map((r, i) => ({
        id: `upload-${Date.now()}-${i}`,
        url: r.signedUrl,
        alt: r.originalName,
        isPrimary: images.length === 0 && i === 0,
        sortOrder: images.length + i,
        cloudflareId: r.key,
      }));
      setImages((prev) => [...prev, ...newImages]);
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to upload images' });
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const removed = images[index];
    // Clean up from R2 if it was uploaded
    if (removed?.cloudflareId) {
      vendorService.deleteImages([removed.cloudflareId]).catch(() => {});
    }
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

  // Digital file helpers
  const loadDigitalAssets = async (productId: string) => {
    try {
      const res = await vendorService.getDigitalAssets(productId);
      setDigitalAssets(res.data || []);
    } catch { /* ignore */ }
  };

  const handleDigitalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    setUploadingDigital(true);
    try {
      const uploaded = await vendorService.uploadDigitalFiles(Array.from(files));
      const attachData = uploaded.map((u) => ({
        key: u.key,
        fileName: u.originalName,
        mimeType: u.mimeType,
        fileSize: u.size,
      }));
      await vendorService.attachDigitalAssets(id, attachData);
      await loadDigitalAssets(id);
      addToast({ type: 'success', message: `${uploaded.length} digital file(s) attached.` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to upload digital files' });
    } finally {
      setUploadingDigital(false);
      if (digitalFileInputRef.current) digitalFileInputRef.current.value = '';
    }
  };

  const removeDigitalAsset = async (assetId: string) => {
    try {
      await vendorService.deleteDigitalAsset(assetId);
      setDigitalAssets((prev) => prev.filter((a) => a.id !== assetId));
      addToast({ type: 'success', message: 'Digital file removed.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to delete digital file' });
    }
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
      type: productType,
      stock: productType === 'PHYSICAL' ? parseInt(stock) || 0 : undefined,
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
        addToast({ type: 'success', message: 'Product created successfully!' });
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

            {/* Product Type */}
            <section className="form-section">
              <h2>Product Type</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="productType">Type *</label>
                  <select id="productType" value={productType} onChange={(e) => setProductType(e.target.value as 'PHYSICAL' | 'DIGITAL')}>
                    <option value="DIGITAL">Digital Product</option>
                    <option value="PHYSICAL">Physical Product</option>
                  </select>
                </div>
                {productType === 'PHYSICAL' && (
                  <div className="form-group">
                    <label htmlFor="stock">Stock Quantity *</label>
                    <input id="stock" type="number" min="0" step="1" placeholder="0"
                      value={stock} onChange={(e) => setStock(e.target.value)} required />
                  </div>
                )}
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

              <div className="image-upload-input">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                  id="imageFileInput"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <span className="material-icons">
                    {uploading ? 'hourglass_empty' : 'cloud_upload'}
                  </span>
                  {uploading ? 'Uploading...' : 'Upload Images'}
                </button>
                <span className="upload-hint">JPEG, PNG, WebP or GIF — max 5 MB each, up to 10 files</span>
              </div>
            </section>

            {/* Digital Files (only for DIGITAL products, only when editing) */}
            {productType === 'DIGITAL' && isEditing && id && (
              <section className="form-section">
                <h2>Digital Files</h2>
                <p className="text-muted">Upload the downloadable files customers will receive after purchase.</p>

                {digitalAssets.length > 0 && (
                  <div className="digital-assets-list">
                    {digitalAssets.map((asset) => (
                      <div key={asset.id} className="digital-asset-item">
                        <div className="digital-asset-info">
                          <span className="material-icons">description</span>
                          <span className="file-name">{asset.fileName}</span>
                          <span className="file-size">({(asset.fileSize / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button type="button" className="btn-icon-sm btn-icon-danger"
                          onClick={() => removeDigitalAsset(asset.id)} title="Remove file">
                          <span className="material-icons">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="image-upload-input">
                  <input
                    ref={digitalFileInputRef}
                    type="file"
                    multiple
                    onChange={handleDigitalFileUpload}
                    disabled={uploadingDigital}
                    style={{ display: 'none' }}
                    id="digitalFileInput"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => digitalFileInputRef.current?.click()}
                    disabled={uploadingDigital}
                  >
                    <span className="material-icons">
                      {uploadingDigital ? 'hourglass_empty' : 'attach_file'}
                    </span>
                    {uploadingDigital ? 'Uploading...' : 'Upload Digital Files'}
                  </button>
                  <span className="upload-hint">PDF, ZIP, or any downloadable file — max 50 MB each</span>
                </div>
              </section>
            )}

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
