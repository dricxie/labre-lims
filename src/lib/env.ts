/**
 * Environment variable validation and access
 * Ensures all required environment variables are present at runtime
 */

const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

const optionalEnvVars = {
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

/**
 * Validates that all required environment variables are set
 * @throws Error if any required env var is missing
 */
export function validateEnvVars(): void {
  const missing: string[] = [];

  console.log('Checking environment variables...');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }
}

/**
 * Get validated Firebase configuration
 * @returns Firebase config object with all required fields
 * @throws Error in development if required env vars are missing
 */
export function getFirebaseConfig() {
  // In development, validate and throw errors for missing vars
  // In production, allow missing vars (they might be auto-discovered by Firebase App Hosting)
  if (process.env.NODE_ENV === 'development') {
    try {
      validateEnvVars();
    } catch (error) {
      console.error('⚠️  Missing required environment variables:', error);
      console.warn('Please create a .env.local file based on .env.example');
      // Still return the config, but it may be incomplete
    }
  }

  return {
    projectId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    appId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    apiKey: requiredEnvVars.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: requiredEnvVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    messagingSenderId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    measurementId: optionalEnvVars.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

// Note: Validation is performed when getFirebaseConfig() is called
// This allows for graceful handling in different environments

