export default function AdminCategories() {
  return (
    <div className="admin-categories">
      <div className="page-header">
        <h1>Categories</h1>
        <button className="btn btn-primary">
          <span className="material-icons">add</span>
          Add Category
        </button>
      </div>

      {/* Categories Tree */}
      <div className="categories-container">
        <div className="categories-tree">
          <div className="empty-state">
            <span className="material-icons">category</span>
            <h2>No categories yet</h2>
            <p>Create your first category to organize products.</p>
          </div>
        </div>

        {/* Category Edit Panel */}
        <div className="category-edit-panel">
          <h2>Category Details</h2>
          <p>Select a category to edit or create a new one.</p>
        </div>
      </div>
    </div>
  );
}
