import { useState, useEffect } from 'react';
import Modal from '@/components/common/Modal';
import { NIGERIAN_STATES, getStateDisplayName } from '@/utils/nigerianStates';
import type { Address, CreateAddressRequest } from '@/types/user.types';

interface AddressFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateAddressRequest) => Promise<void>;
    address?: Address | null; // null = create, Address = edit
    isLoading?: boolean;
}

const initialForm: CreateAddressRequest = {
    label: '',
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    country: 'Nigeria',
    postalCode: '',
    isDefault: false,
};

export default function AddressFormModal({
    isOpen,
    onClose,
    onSubmit,
    address,
    isLoading = false,
}: AddressFormModalProps) {
    const [form, setForm] = useState<CreateAddressRequest>(initialForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditing = !!address;

    // Populate form when editing
    useEffect(() => {
        if (address) {
            setForm({
                label: address.label || '',
                firstName: address.firstName,
                lastName: address.lastName,
                phone: address.phone,
                street: address.street,
                apartment: address.apartment || '',
                city: address.city,
                state: address.state,
                country: address.country,
                postalCode: address.postalCode || '',
                isDefault: address.isDefault,
            });
        } else {
            setForm(initialForm);
        }
        setErrors({});
    }, [address, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        // Clear field error on change
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!form.street.trim()) newErrors.street = 'Street address is required';
        if (!form.city.trim()) newErrors.city = 'City is required';
        if (!form.state) newErrors.state = 'Please select a state';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        await onSubmit(form);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Edit Address' : 'Add New Address'}
            size="lg"
        >
            <form className="address-form" onSubmit={handleSubmit}>
                {/* Label */}
                <div className="form-group">
                    <label htmlFor="addr-label">Label (optional)</label>
                    <input
                        type="text"
                        id="addr-label"
                        name="label"
                        value={form.label || ''}
                        onChange={handleChange}
                        placeholder='e.g. "Home", "Office"'
                        maxLength={30}
                    />
                </div>

                {/* Name row */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="addr-firstName">First Name *</label>
                        <input
                            type="text"
                            id="addr-firstName"
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            placeholder="John"
                            className={errors.firstName ? 'input-error' : ''}
                        />
                        {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addr-lastName">Last Name *</label>
                        <input
                            type="text"
                            id="addr-lastName"
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            placeholder="Doe"
                            className={errors.lastName ? 'input-error' : ''}
                        />
                        {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                    </div>
                </div>

                {/* Phone */}
                <div className="form-group">
                    <label htmlFor="addr-phone">Phone Number *</label>
                    <input
                        type="tel"
                        id="addr-phone"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="08012345678"
                        className={errors.phone ? 'input-error' : ''}
                    />
                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                </div>

                {/* Street */}
                <div className="form-group">
                    <label htmlFor="addr-street">Street Address *</label>
                    <input
                        type="text"
                        id="addr-street"
                        name="street"
                        value={form.street}
                        onChange={handleChange}
                        placeholder="123 Main Street"
                        className={errors.street ? 'input-error' : ''}
                    />
                    {errors.street && <span className="field-error">{errors.street}</span>}
                </div>

                {/* Apartment */}
                <div className="form-group">
                    <label htmlFor="addr-apartment">Apartment, suite, etc. (optional)</label>
                    <input
                        type="text"
                        id="addr-apartment"
                        name="apartment"
                        value={form.apartment || ''}
                        onChange={handleChange}
                        placeholder="Apt 4B"
                    />
                </div>

                {/* City / State / Postal */}
                <div className="form-row form-row-3">
                    <div className="form-group">
                        <label htmlFor="addr-city">City *</label>
                        <input
                            type="text"
                            id="addr-city"
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            placeholder="Lagos"
                            className={errors.city ? 'input-error' : ''}
                        />
                        {errors.city && <span className="field-error">{errors.city}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addr-state">State *</label>
                        <select
                            id="addr-state"
                            name="state"
                            value={form.state}
                            onChange={handleChange}
                            className={errors.state ? 'input-error' : ''}
                        >
                            <option value="">Select State</option>
                            {NIGERIAN_STATES.map(s => (
                                <option key={s} value={s}>{getStateDisplayName(s)}</option>
                            ))}
                        </select>
                        {errors.state && <span className="field-error">{errors.state}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addr-postalCode">Postal Code</label>
                        <input
                            type="text"
                            id="addr-postalCode"
                            name="postalCode"
                            value={form.postalCode || ''}
                            onChange={handleChange}
                            placeholder="100001"
                        />
                    </div>
                </div>

                {/* Country (read-only) */}
                <div className="form-group">
                    <label htmlFor="addr-country">Country</label>
                    <input
                        type="text"
                        id="addr-country"
                        name="country"
                        value="Nigeria"
                        readOnly
                        disabled
                    />
                </div>

                {/* Default checkbox */}
                <div className="form-group form-group-checkbox">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            name="isDefault"
                            checked={form.isDefault || false}
                            onChange={handleChange}
                        />
                        <span>Set as default address</span>
                    </label>
                </div>

                {/* Actions */}
                <div className="address-form-actions">
                    <button type="button" className="btn btn-outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <span className="spinner" />
                                {isEditing ? 'Saving...' : 'Adding...'}
                            </>
                        ) : (
                            isEditing ? 'Save Changes' : 'Add Address'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
