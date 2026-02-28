# EasySabil Web App

EasySabil is a comprehensive web application for managing community data, census information, order tracking, and attendance logs. 

Built with React, TypeScript, Vite, TailwindCSS, and powered by Firebase Firestore as its backend database.

## Features
- **Sensus Management**: Track and manage families (`families`) and individual members (`sensus`). Supports Bulk Import via Excel with a convenient Rollback feature.
- **Role-Based Access Control**: Access levels and data filtering based on user roles (Admin, Coordinator, Member, etc.) managed via the `users` collection.
- **Orders & Finances**: Handle purchase orders (`orders`) and perform full CRUD operations on available order categories (`category_orders`).
- **Attendance Logging**: Log interactive daily or monthly attendance for members (`attendance_logs`).
- **Real-Time Analytics**: View aggregated census data directly from Firebase, providing accurate totals and group metrics (replacing external dependencies like SheetDB).
- **Premium UI & Theme**: A uniform, clean blue-themed UI with a modern split-layout design for authentication and improved user flow.

## Tech Stack
- Frontend: React 18, Vite, TypeScript
- Styling: TailwindCSS
- Icons: Lucide React
- Backend & Database: Firebase (Authentication, Firestore)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node JS and NPM (or Yarn/PNPM) installed on your machine.
- Node v18+ Recommended

### 1. Installation

Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Environmental Variables (Firebase Setup)

Because this project relies on Firebase, you must create an environment file to hold your public configuration keys.

1. Create a `.env` file in the root directory.
2. Add your Firebase config variables (you can get these from your Firebase Console under Project Settings -> General -> Your apps -> SDK setup and configuration):

```env
VITE_FIREBASE_API_KEY="your_api_key_here"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
```
*(Note: These keys are safe to expose to the frontend, but do not commit the `.env` file to Github).*

### 3. Running Locally

Start the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production

To create an optimized production build:
```bash
npm run build
```
The output will be generated in the `/dist` directory.

---

## 📦 Database Structure (Firestore)

The application expects the following collections in your Firebase Firestore:
1. `families`: Stores family heads and units.
2. `sensus`: Stores individual member details, linked to a family via `family_id`.
3. `users`: Stores application users, their roles (e.g., admin), and access permissions.
4. `category_orders`: List of available categories/products for ordering.
5. `orders`: Individual order transactions, containing payment statuses and buyer info.
6. `attendance_logs`: Daily attendance records keyed by unique dates.

> **Security Note**: Remember to configure your Firestore rules in production so that unauthorized users cannot arbitrarily delete or modify records.
