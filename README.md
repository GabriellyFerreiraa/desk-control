# Desk Control

Desk Control is an **operational management application for Service Desk teams** that streamlines **shift scheduling**, **absence requests** (with approval and cancellation flows), and **task assignments** for **Leads** and **Analysts**.  
Built with **React + TypeScript**, **Tailwind CSS + shadcn/ui**, **React Router**, **react-hook-form + zod**, and **Supabase** as the backend.

---

## 🚀 Features

- **Role-based dashboards** for **Lead** and **Analyst**.
- **Shift management** with workdays, start/end times, and office/home mode.
- **Absence request workflow**:
  - Request submission by Analysts.
  - Approval/Rejection by Leads.
  - Cancellation requests with approval flow.
- **Task assignment**:
  - Assigned by Leads to Analysts.
  - Self-assignment option for Analysts.
- **Responsive UI** using Tailwind and shadcn/ui.
- **Validation** with zod + react-hook-form.
- **Data persistence** with Supabase.

---

## 🛠️ Tech Stack

**Frontend:**
- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- lucide-react (icons)
- react-router-dom
- react-hook-form + zod

**Backend:**
- Supabase (PostgreSQL, API, Auth)

**Tooling & Config:**
- ESLint
- PostCSS
- Vite config
- TypeScript config

---

## 📂 Project Structure

```
src/
 ├─ components/
 │   ├─ dashboard/          # LeadDashboard, AnalystDashboard
 │   ├─ forms/              # Absence, Shift, Task forms
 │   ├─ modals/             # Approval and cancellation modals
 │   ├─ calendar/           # Team calendar view
 │   ├─ background/         # Visual effects
 │   └─ ui/                 # shadcn/ui component wrappers
 ├─ hooks/                  # useAuth, use-toast, use-mobile
 ├─ integrations/supabase/  # Supabase client & generated types
 ├─ pages/                  # Route-level pages (Auth, Dashboard, Settings...)
 ├─ lib/                    # Helpers
 ├─ App.tsx                 # Routes
 ├─ main.tsx                # App entry point
supabase/
 └─ migrations/             # Database schema & RLS policy history
```

---

## ⚙️ Installation

**1. Clone the repository**
```bash
git clone https://github.com/GabriellyFerreiraa/desk-control.git
cd desk-control
```

**2. Install dependencies**
```bash
npm install
```

**3. Start the development server**
```bash
npm run dev
```

---

## 📦 Scripts

- `npm run dev` — Start development server.
- `npm run build` — Build for production.
- `npm run preview` — Preview production build.

---


## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature-name`)
3. Commit changes (`git commit -m 'Add some feature'`)
4. Push to branch (`git push origin feature-name`)
5. Open a Pull Request

---

## 📄 License
This project is licensed under the MIT License.
