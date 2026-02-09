import { api } from './api';
import type { Address, CreateAddressRequest, UpdateAddressRequest } from '@/types/user.types';
import type { ApiResponse } from '@/types/common.types';

export const addressService = {
    /** GET /addresses — list all user addresses */
    getAddresses: () =>
        api.get<ApiResponse<Address[]>>('/addresses'),

    /** GET /addresses/:id — get single address */
    getAddress: (id: string) =>
        api.get<ApiResponse<Address>>(`/addresses/${id}`),

    /** POST /addresses — create new address */
    createAddress: (data: CreateAddressRequest) =>
        api.post<ApiResponse<Address>>('/addresses', data),

    /** PUT /addresses/:id — update address */
    updateAddress: (id: string, data: UpdateAddressRequest) =>
        api.put<ApiResponse<Address>>(`/addresses/${id}`, data),

    /** DELETE /addresses/:id — delete address */
    deleteAddress: (id: string) =>
        api.delete<ApiResponse<{ message: string }>>(`/addresses/${id}`),

    /** PATCH /addresses/:id/default — set as default */
    setDefault: (id: string) =>
        api.patch<ApiResponse<Address>>(`/addresses/${id}/default`),
};
