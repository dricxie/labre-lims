# LabRe LIMS

A modern Laboratory Information Management System (LIMS) built with Next.js, Firebase, and TypeScript. LabRe provides comprehensive management for biomolecular laboratories, including sample tracking, experiment management, inventory control, and more.

## Features

- **Sample Management**: Track samples from collection to disposal with full audit trails
- **DNA Extraction Tracking**: Monitor DNA extracts with quality metrics (A260/A280, yield)
- **Experiment Management**: Plan, execute, and track experiments with protocol integration
- **Inventory Management**: Track reagents and consumables with expiry alerts and low-stock warnings
- **Equipment Management**: Log equipment usage and track calibration schedules
- **Project Organization**: Organize work by projects with supervisor oversight
- **Task Management**: Assign and track laboratory tasks
- **Storage Management**: Hierarchical storage unit management (freezers, racks, boxes)
- **Audit Logging**: Comprehensive activity logging for compliance
- **SOP Enforcement**: AI-powered Standard Operating Procedure compliance checking
- **User Roles**: Role-based access control (student, assistant, technician, supervisor, admin)
- **Multi-tenant Support**: Lab-based data isolation

## Tech Stack

- **Framework**: Next.js 15.3.3 (App Router)
- **Language**: TypeScript 5
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **AI Integration**: Google Genkit for SOP enforcement

## Prerequisites

- Node.js 18+ and npm/yarn
- Firebase project with Firestore and Authentication enabled
- Firebase Admin SDK credentials (for server actions)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd labre-lims
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and fill in your Firebase credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Firebase project values. You can find these in your [Firebase Console](https://console.firebase.google.com/) under Project Settings → General → Your apps.

**For Local Development (Server Actions):**

You'll also need a Firebase Admin SDK service account key:

1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Project Settings → Service Accounts
2. Click "Generate new private key" and download the JSON file
3. Save it in the project root (it will have a name like `*-firebase-adminsdk-*.json`)
4. Update `.env.local` to point to it:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./labre-lims-bb270-firebase-adminsdk-fbsvc-0d7653c406.json
   ```

**⚠️ Security Warning**: Never commit Firebase Admin SDK key files (`*-firebase-adminsdk-*.json` or `serviceAccountKey.json`) to version control. They're already in `.gitignore`. Use `serviceAccountKey.json.example` as a reference for the file structure.

### 4. Set Up Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Deploy Firestore security rules from `firestore.rules`
5. Set up custom claims for user roles (requires Cloud Functions or Admin SDK)

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:9002`

### 6. Run AI Genkit Server (Optional)

For SOP enforcement features:

```bash
npm run genkit:dev
```

## Project Structure

```
labre-lims/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Main application pages
│   │   │   ├── samples/        # Sample management
│   │   │   ├── experiments/    # Experiment tracking
│   │   │   ├── inventory/      # Reagents & consumables
│   │   │   ├── equipment/      # Equipment management
│   │   │   ├── projects/       # Project organization
│   │   │   ├── tasks/          # Task management
│   │   │   └── ...
│   │   ├── login/              # Authentication
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Reusable UI components
│   │   └── ui/                 # shadcn/ui components
│   ├── firebase/               # Firebase configuration & hooks
│   ├── lib/                    # Utilities & types
│   └── ai/                     # Genkit AI flows
├── firestore.rules             # Firestore security rules
├── next.config.ts              # Next.js configuration
└── package.json
```

## Security Model

The application uses an ownership-based security model:

- **Ownership**: Users own the data they create (`createdById` field)
- **Role-Based Access**: Supervisors and admins can override ownership
- **Read Access**: All authenticated users can read all data (transparency)
- **Write Access**: Only owners, supervisors, or admins can modify data
- **Delete Access**: Only supervisors and admins can delete data

See `firestore.rules` for detailed security rules.

## User Roles

- **Student**: Basic access, can create and manage own data
- **Assistant**: Enhanced permissions for lab operations
- **Technician**: Full operational access
- **Supervisor**: Can modify any data, manage users
- **Admin**: Full system access

## Development

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment

### Firebase App Hosting (Recommended)

1. Connect your repository to Firebase
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
3. Deploy Firestore rules: `firebase deploy --only firestore:rules`

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Vercel
- Netlify
- AWS Amplify
- Self-hosted (Node.js server)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase analytics measurement ID | No |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON (local dev) | No* |

*Required for server actions in local development. Auto-discovered in Firebase App Hosting.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.

---

**Note**: This is a production LIMS system. Ensure proper security measures are in place before deploying to production.
