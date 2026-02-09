/**
 * Nigerian states for address forms.
 * 36 states + FCT Abuja.
 */
export const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
    'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
    'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
    'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
    'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const;

/**
 * Display name for FCT.
 */
export const STATE_DISPLAY_NAMES: Record<string, string> = {
    FCT: 'FCT - Abuja',
};

/**
 * Get display name for a state (handles FCT → FCT - Abuja).
 */
export function getStateDisplayName(state: string): string {
    return STATE_DISPLAY_NAMES[state] || state;
}
