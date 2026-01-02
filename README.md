# Money App 💰

A modern, mobile-first personal finance tracker built for checking net worth and tracking expenses in multiple currencies.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)

## ✨ Features

- **Multi-Currency Support** - Track finances in CZK, USD, and EUR with automatic conversion
- **Live Exchange Rates** - Real-time currency conversion via Frankfurter API
- **Dark Mode** - Beautiful dark theme with system preference detection
- **Mobile-First Design** - Responsive UI optimized for all screen sizes
- **Net Worth Tracking** - See your total wealth across all accounts at a glance
- **Monthly Goals** - Set and track spending/saving goals
- **Transaction Management** - Quick-add modal for expenses, income, transfers, and adjustments
- **Multiple Accounts** - Support for bank accounts, cash, investments, and more

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** (Custom Design System) |
| Backend & Auth | **Supabase** |
| Icons | **Lucide React** |
| State Management | React Context API |
| Internationalization | Custom i18n (EN/CS) |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/money-app.git
   cd money-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**

   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── accounts/          # Accounts management
│   ├── settings/          # User settings
│   ├── transactions/      # Transaction history
│   └── page.tsx           # Dashboard (home)
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Navigation, sidebar, header
│   ├── dashboard/         # Dashboard-specific components
│   ├── accounts/          # Account cards and dialogs
│   └── transactions/      # Transaction items and modal
├── contexts/              # React Context providers
├── lib/
│   ├── actions/           # Server actions
│   ├── i18n/              # Internationalization
│   └── supabase/          # Supabase client setup
└── types/                 # TypeScript type definitions
```

## 🎨 Design System

The app uses a custom design system built on Tailwind CSS:

- **Colors**: Slate-based neutral palette with Emerald accents
- **Border Radius**: `rounded-xl` to `rounded-3xl` for modern feel
- **Shadows**: Layered shadows for depth (`shadow-lg`, `shadow-2xl`)
- **Dark Mode**: Full dark mode support with `dark:` variants

## 📝 License

This project is licensed under the MIT License.

---

Built with ❤️ using Next.js and Supabase
