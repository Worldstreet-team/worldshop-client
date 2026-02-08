import { api } from './api';
import type { UserProfile, UpdateProfileRequest } from '@/types/user.types';
import type { ApiResponse } from '@/types/common.types';

export const profileService = {
    /** GET /profile — fetch current user's profile */
    getProfile: () =>
        api.get<ApiResponse<UserProfile>>('/profile'),

    /** PATCH /profile — update profile fields */
    updateProfile: (data: UpdateProfileRequest) =>
        api.patch<ApiResponse<UserProfile>>('/profile', data),
};
