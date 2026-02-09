import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { addressService } from '@/services/addressService';
import { useUIStore } from '@/store/uiStore';
import AddressFormModal from '@/components/common/AddressFormModal';
import type { Address, CreateAddressRequest } from '@/types/user.types';

const MAX_ADDRESSES = 5;

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { addToast } = useUIStore();

  const fetchAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await addressService.getAddresses();
      setAddresses(response.data);
    } catch {
      addToast({ message: 'Failed to load addresses', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Open modal for creating
  const handleAdd = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  // Create or update address
  const handleSubmit = async (data: CreateAddressRequest) => {
    try {
      setIsSaving(true);
      if (editingAddress) {
        await addressService.updateAddress(editingAddress.id, data);
        addToast({ message: 'Address updated', type: 'success' });
      } else {
        await addressService.createAddress(data);
        addToast({ message: 'Address added', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingAddress(null);
      await fetchAddresses();
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Failed to save address';
      addToast({ message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete address
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      setDeletingId(id);
      await addressService.deleteAddress(id);
      addToast({ message: 'Address deleted', type: 'success' });
      await fetchAddresses();
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Failed to delete address';
      addToast({ message, type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  // Set default
  const handleSetDefault = async (id: string) => {
    try {
      await addressService.setDefault(id);
      addToast({ message: 'Default address updated', type: 'success' });
      await fetchAddresses();
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Failed to set default';
      addToast({ message, type: 'error' });
    }
  };

  return (
    <div className="addresses-page">
      <div className="container">
        <div className="page-header">
          <Link to="/account" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Account
          </Link>
          <h1>My Addresses</h1>
        </div>

        <div className="addresses-actions">
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={addresses.length >= MAX_ADDRESSES}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Address
          </button>
          {addresses.length >= MAX_ADDRESSES && (
            <p className="addresses-limit-notice">
              You've reached the maximum of {MAX_ADDRESSES} addresses. Delete one to add a new one.
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="addresses-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="address-card address-card--skeleton">
                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton skeleton-text" style={{ width: '80%' }} />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <h2>No addresses saved</h2>
            <p>Add a delivery address for faster checkout.</p>
            <button className="btn btn-primary" onClick={handleAdd}>
              Add Your First Address
            </button>
          </div>
        ) : (
          <div className="addresses-grid">
            {addresses.map((address) => (
              <div key={address.id} className={`address-card${address.isDefault ? ' address-card--default' : ''}`}>
                <div className="address-card-header">
                  <h3>{address.label || 'Address'}</h3>
                  {address.isDefault && (
                    <span className="default-badge">Default</span>
                  )}
                </div>
                <div className="address-card-body">
                  <p className="address-name">
                    {address.firstName} {address.lastName}
                  </p>
                  <p>{address.street}{address.apartment && `, ${address.apartment}`}</p>
                  <p>{address.city}, {address.state}{address.postalCode && ` ${address.postalCode}`}</p>
                  <p>{address.country}</p>
                  <p className="address-phone">{address.phone}</p>
                </div>
                <div className="address-card-actions">
                  <button className="btn btn-text" onClick={() => handleEdit(address)}>
                    Edit
                  </button>
                  {!address.isDefault && (
                    <>
                      <button className="btn btn-text" onClick={() => handleSetDefault(address.id)}>
                        Set as Default
                      </button>
                      <button
                        className="btn btn-text text-danger"
                        onClick={() => handleDelete(address.id)}
                        disabled={deletingId === address.id}
                      >
                        {deletingId === address.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <AddressFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAddress(null);
          }}
          onSubmit={handleSubmit}
          address={editingAddress}
          isLoading={isSaving}
        />
      </div>
    </div>
  );
}
