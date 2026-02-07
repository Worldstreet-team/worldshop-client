import { Link } from 'react-router-dom';

export default function AdminProducts() {
  return (
    <div className="admin-products">
      <div className="page-header">
        <h1>Products</h1>
        <Link to="/admin/products/new" className="btn btn-primary">
          <span className="material-icons">add</span>
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input 
          type="search" 
          placeholder="Search products..." 
          className="search-input"
        />
        <select className="filter-select">
          <option value="">All Categories</option>
        </select>
        <select className="filter-select">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="empty-row">
                <p>No products found. Add your first product!</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button disabled>Previous</button>
        <span>Page 1 of 1</span>
        <button disabled>Next</button>
      </div>
    </div>
  );
}
