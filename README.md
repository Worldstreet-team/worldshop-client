# WorldStreet eCommerce - Frontend

A modern, responsive eCommerce platform built with **React 18+**, **TypeScript**, and **Vite**. This is the customer-facing and admin interface for the WorldStreet eCommerce ecosystem.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project
cd worldshop-client

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Tech Stack

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite (with HMR)
- **Routing:** React Router v6
- **State Management:** Zustand + React Query
- **Forms:** React Hook Form + Zod
- **Styling:** SCSS Modules (from Electro template)
- **HTTP Client:** Axios
- **Icons:** Font Awesome + React Icons

## 📖 Documentation

- **[Project Plan](../docs/plan.md)** - Overall timeline and phases (6-7 weeks)
- **[Frontend Plan](../docs/frontend-plan.md)** - Detailed frontend architecture and components
- **[Backend Plan](../docs/backend-plan.md)** - API specifications and backend implementation
- **[Product Requirements](../worldstreet-gold-ecommerce.md)** - Complete PRD

## 📁 Project Structure

```
src/
├──🔧 ESLint & Code Quality

For production applications, we enable type-aware lint rules:

```js
// eslint.config.js
import tseslint from 'typescript-eslint'
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

## 📦 Dependencies

Key packages:
- `react-router-dom` - Client-side routing
- `zustand` - State management
- `react-query` - Server state management
- `react-hook-form` - Form handling
- `zod` - Schema validation
- `axios` - HTTP client
- `react-icons` - Icon library

See `package.json` for complete list.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/description`
2. Commit changes: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/description`
4. Open a Pull Request

## 📝 Commit Convention

Follow Conventional Commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Dependencies, etc.

Example: `git commit -m "feat: add product filter component"`

## 🐛 Known Issues & Limitations

- See [Issues](../../issues) for current known issues
- Payment integration pending backend completion
- Advanced analytics dashboard deferred

## 📞 Support & Contact

For questions or issues:
1. Check the [Project Plan](../docs/plan.md)
2. Review the [Frontend Plan](../docs/frontend-plan.md)
3. Create an issue with detailed context

## 📄 License

This project is part of the WorldStreet ecosystem. All rights reserved.E_APP_NAME=WorldStreet eCommerce
```

## 🏃 Development Phases

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Week 1 | Project Setup & Core Infrastructure |
| Phase 2 | Week 2 | Core Components & Layout |
| Phase 3 | Week 3-4 | Customer-Facing Pages (Home, Listing, Product, Category, Search) |
| Phase 4 | Week 5 | Cart, Checkout & Orders |
| Phase 5 | Week 6 | Admin Panel |
| Phase 6 | Week 7 | Integration, Testing & Polish |

**Expected Pages:** 10-13 pages with dynamic data

See [Project Plan](../docs/plan.md) for detailed breakdown.

## 🔌 API Integration

This frontend communicates with the WorldStreet eCommerce backend API. Key endpoints:

- `GET /api/products` - List products
- `GET /api/products/:slug` - Product details
- `GET /api/categories` - Categories
- `POST /api/cart/items` - Add to cart
- `POST /api/orders` - Create order
- `GET /api/orders` - User orders

See [Backend Plan](../docs/backend-plan.md) for complete API documentation.

## 🔐 Authentication

- Integrated with WorldStreet Identity Service
- JWT-based authentication
- Guest cart support with merge on login

## 🚀 Performance

- Lazy loading pages and components
- Image optimization with CDN
- Code splitting by route
- Skeleton loaders for async content
- Caching with React Query

## ♿ Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus management in modals
- WCAG 2.1 Level AA compliance goal

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
