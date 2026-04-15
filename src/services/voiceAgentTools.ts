import type { VoiceToolDefinition, VoiceToolHandler } from './voiceAgent';

// ── Navigation Map ──────────────────────────────────────────────

const NAVIGATION_MAP: Record<string, string> = {
  home: '/',
  'main page': '/',
  products: '/products',
  shop: '/products',
  browse: '/products',
  categories: '/categories',
  cart: '/cart',
  'my cart': '/cart',
  'shopping cart': '/cart',
  checkout: '/checkout',
  'my orders': '/account/orders',
  'order history': '/account/orders',
  orders: '/account/orders',
  'my account': '/account/profile',
  account: '/account/profile',
  profile: '/account/profile',
  wishlist: '/account/wishlist',
  'saved items': '/account/wishlist',
  addresses: '/account/addresses',
  'my addresses': '/account/addresses',
  downloads: '/account/downloads',
};

// ── Tool Definitions (OpenAI function schemas) ──────────────────

export const voiceToolDefinitions: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'navigate_to',
    description:
      'Navigate the user to a specific page on the website. Use this when the user asks to go to a page like "go to my cart", "take me home", "show me categories", etc.',
    parameters: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          description:
            'The page to navigate to. Examples: "home", "products", "categories", "cart", "checkout", "orders", "profile", "wishlist", "addresses", "downloads".',
        },
      },
      required: ['page'],
    },
  },
];

// ── Tool Handlers ───────────────────────────────────────────────

type NavigateFn = (path: string) => void;

/**
 * Creates tool handler functions bound to the current router navigate function.
 * This factory is called from the useVoiceAgent hook which has access to useNavigate().
 */
export function createVoiceToolHandlers(navigate: NavigateFn): Record<string, VoiceToolHandler> {
  return {
    navigate_to: async (args) => {
      const page = (args.page as string)?.toLowerCase().trim();
      const route = NAVIGATION_MAP[page];

      if (route) {
        navigate(route);
        return `Navigated to ${page}.`;
      }

      // Try partial matching
      const match = Object.entries(NAVIGATION_MAP).find(([key]) => key.includes(page) || page.includes(key));
      if (match) {
        navigate(match[1]);
        return `Navigated to ${match[0]}.`;
      }

      return `I don't know how to get to "${page}". You can ask me to go to: home, products, categories, cart, checkout, orders, profile, wishlist, or addresses.`;
    },
  };
}
