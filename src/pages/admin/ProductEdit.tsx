import { Link, useParams } from 'react-router-dom';

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  return (
    <div className="admin-product-edit">
      <div className="page-header">
        <Link to="/admin/products" className="back-link">
          <span className="material-icons">arrow_back</span>
          Back to Products
        </Link>
        <h1>{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
      </div>

      <form className="product-form">
        <div className="form-layout">
          <div className="form-main">
            {/* Basic Info */}
            <section className="form-section">
              <h2>Basic Information</h2>
              
              <div className="form-group">
                <label htmlFor="name">Product Name</label>
                <input id="name" type="text" placeholder="Enter product name" />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea 
                  id="description" 
                  rows={5} 
                  placeholder="Enter product description"
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sku">SKU</label>
                  <input id="sku" type="text" placeholder="SKU-001" />
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select id="category">
                    <option value="">Select category</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="form-section">
              <h2>Pricing</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Price</label>
                  <input id="price" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label htmlFor="compareAtPrice">Compare at Price</label>
                  <input id="compareAtPrice" type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </section>

            {/* Inventory */}
            <section className="form-section">
              <h2>Inventory</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="stock">Stock Quantity</label>
                  <input id="stock" type="number" placeholder="0" />
                </div>
                <div className="form-group">
                  <label htmlFor="lowStockThreshold">Low Stock Threshold</label>
                  <input id="lowStockThreshold" type="number" placeholder="5" />
                </div>
              </div>
            </section>

            {/* Images */}
            <section className="form-section">
              <h2>Images</h2>
              <div className="image-upload-zone">
                <span className="material-icons">cloud_upload</span>
                <p>Drag and drop images here, or click to browse</p>
                <input type="file" accept="image/*" multiple hidden />
              </div>
            </section>
          </div>

          <div className="form-sidebar">
            {/* Status */}
            <section className="form-section">
              <h2>Status</h2>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Active (visible in store)</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Featured product</span>
              </label>
            </section>

            {/* Actions */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-block">
                {isEditing ? 'Update Product' : 'Create Product'}
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
