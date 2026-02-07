import { Link } from 'react-router-dom';

export default function AddressesPage() {
  // Mock addresses for now - will be replaced with API call
  const addresses: Array<{
    id: string;
    label: string;
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    isDefault: boolean;
  }> = [];

  return (
    <div className="addresses-page">
      <div className="container">
        <div className="page-header">
          <Link to="/account" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Account
          </Link>
          <h1>My Addresses</h1>
        </div>

        <div className="addresses-actions">
          <button className="btn btn-primary">
            <span className="material-icons">add</span>
            Add New Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">location_on</span>
            <h2>No addresses saved</h2>
            <p>Add a delivery address for faster checkout.</p>
          </div>
        ) : (
          <div className="addresses-grid">
            {addresses.map((address) => (
              <div key={address.id} className="address-card">
                {address.isDefault && (
                  <span className="default-badge">Default</span>
                )}
                <h3>{address.label || 'Address'}</h3>
                <p>
                  {address.firstName} {address.lastName}<br />
                  {address.street}<br />
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <div className="address-actions">
                  <button className="btn btn-text">Edit</button>
                  <button className="btn btn-text text-danger">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
