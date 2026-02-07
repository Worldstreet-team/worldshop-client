export default function AdminInventory() {
  return (
    <div className="admin-inventory">
      <div className="page-header">
        <h1>Inventory</h1>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input 
          type="search" 
          placeholder="Search products..." 
          className="search-input"
        />
        <select className="filter-select">
          <option value="">All Stock Levels</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Low Stock Threshold</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="empty-row">
                <p>No inventory data found.</p>
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
