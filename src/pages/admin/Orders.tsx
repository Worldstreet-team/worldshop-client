export default function AdminOrders() {
  return (
    <div className="admin-orders">
      <div className="page-header">
        <h1>Orders</h1>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input 
          type="search" 
          placeholder="Search by order number..." 
          className="search-input"
        />
        <select className="filter-select">
          <option value="">All Status</option>
          <option value="created">Created</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <input type="date" className="date-input" placeholder="From" />
        <input type="date" className="date-input" placeholder="To" />
      </div>

      {/* Orders Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="empty-row">
                <p>No orders found.</p>
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
