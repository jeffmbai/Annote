# Annote - Notes Application

A modern React Native notes application with Supabase authentication, offline support using SQLite, and Zustand for state management. Built with TypeScript for type safety and a clean, user-friendly interface.

## Features

- ** Authentication**: Secure sign up, login, and logout with Supabase
- ** Session Persistence**: Users stay logged in after app restart
- ** Offline Support**: Full offline functionality using SQLite
- ** Auto Sync**: Automatic synchronization when connection is restored
- ** State Management**: Zustand for clean and efficient state management
- ** Network Awareness**: Visual indicators when device is offline
- ** Modern UI**: Clean, intuitive interface with custom modals
- ** Rich Note Management**: Create, edit, delete, and organize notes
- ** Toast Notifications**: User-friendly feedback for actions and network changes

## Tech Stack

- **React Native** 0.83.1 - Mobile framework
- **TypeScript** - Type safety
- **Supabase** - Backend and authentication
- **Zustand** - State management
- **SQLite** (react-native-quick-sqlite) - Local database
- **React Navigation** - Navigation
- **AsyncStorage** - Persistent storage
- **NetInfo** - Network status detection
- **React Native Toast Message** - Toast notifications

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20
- **npm** or **yarn**
- **React Native development environment** set up
  - For Android: Android Studio, JDK, Android SDK
  - For iOS: Xcode, CocoaPods (macOS only)
- **A Supabase account** (free tier works)

## Getting Started

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/jeffmbai/Annote.git
cd Annote

# Install dependencies
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Set Up Supabase

#### 3.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Create new project
4. Get Project Url and Anon public key
5. Add these to your `.env` file:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

#### 3.3 Create the Notes Table

1. Execute SQL

```sql
-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted);

-- Enable Row Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own notes
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own notes
CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own notes
CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 3.4 Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Ensure **Email** provider is enabled (should be enabled by default)

### Step 4: Install Native Dependencies

#### iOS (macOS only)

```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

#### Android

Android dependencies are automatically linked. If you encounter issues, you may need to:

```bash
cd android
./gradlew clean
cd ..
```

### Step 5: Start Metro Bundler

```bash
npm start
```

Or with cache reset:

```bash
npm start -- --reset-cache
```

### Step 6: Run the App

#### Android

```bash
npm run android
```

#### iOS

```bash
npm run ios
```

## Project Structure

```
Annote/
├── android/                 # Android native code
├── ios/                     # iOS native code
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── DeleteNoteModal.tsx    # Modal for delete confirmation
│   │   ├── NotesHeader.tsx        # Header component with user info
│   │   └── SignOutModal.tsx       # Modal for sign out confirmation
│   ├── config/              # Configuration files
│   │   └── supabase.ts      # Supabase client setup
│   ├── db/                  # Database related files
│   │   └── database.ts      # SQLite database initialization
│   ├── navigation/          # Navigation setup
│   │   └── AppNavigator.tsx # Main navigation configuration
│   ├── screens/             # Screen components
│   │   ├── LoginScreen.tsx       # User login screen
│   │   ├── SignUpScreen.tsx      # User registration screen
│   │   ├── NotesListScreen.tsx   # List of all notes
│   │   └── NoteDetailScreen.tsx  # Note detail/edit screen
│   ├── store/               # Zustand state stores
│   │   ├── authStore.ts     # Authentication state management
│   │   └── notesStore.ts    # Notes state management
│   ├── types/               # TypeScript type definitions
│   │   └── env.d.ts         # Environment variables types
│   └── utils/               # Utility functions
│       └── userUtils.ts     # User-related utility functions
├── .env                     # Environment variables (not in git)
├── .gitignore               # Git ignore rules
├── App.tsx                  # Root component
├── babel.config.js          # Babel configuration
├── index.js                 # Entry point
├── metro.config.js          # Metro bundler configuration
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## Architecture

### Authentication Flow

1. User signs up or logs in through Supabase
2. Session is stored in AsyncStorage (handled by Supabase client)
3. On app restart, the session is automatically restored
4. User stays logged in until they explicitly log out
5. On logout, user-specific notes are cleared from local storage

### Offline Handling

1. **Local-First Approach**: All notes are stored locally in SQLite
2. **Online Sync**: When online, changes sync with Supabase
3. **Offline Mode**:
   - Users can create, edit, and delete notes
   - Changes are marked as unsynced
   - Visual indicators show offline status
4. **Auto Sync**: When connection is restored:
   - Toast notification appears
   - All unsynced changes are automatically synced
   - Local database is updated with server data

### State Management

The app uses **Zustand** for state management with two main stores:

- **`authStore`**: Manages authentication state

  - User session
  - Sign up, sign in, sign out methods
  - Session initialization

- **`notesStore`**: Manages notes state
  - Notes list
  - CRUD operations (Create, Read, Update, Delete)
  - Sync logic
  - Network status
  - Offline/online handling

### Data Flow

```
User Action → Zustand Store → Local SQLite DB → Supabase (if online)
                                      ↓
                              Update Store State
                                      ↓
                              UI Re-renders
```
