import { api } from '@/shared/lib/api';
import type { UserProfile, UpdateProfileRequest } from '@/features/auth/types';
import type { ApiResponse } from '@/shared/types/common.types';

export const profileService = {
    /** GET /profile — fetch current user's profile */
    getProfile: () =>
        api.get<ApiResponse<UserProfile>>('/profile'),

    /** PATCH /profile — update profile fields */
    updateProfile: (data: UpdateProfileRequest) =>
        api.patch<ApiResponse<UserProfile>>('/profile', data),
};
