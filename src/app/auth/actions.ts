'use server';

import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';

// Define the state shape that will be returned by the action
export type SignUpState = {
  message: string | null;
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    _form?: string[]; // For general, non-field-specific errors
  } | null;
  success: boolean;
  credentials?: {
    email: string;
    password: string;
  } | null;
};

// Define the schema for validating the form data
const SignUpSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export async function createUser(prevState: SignUpState, formData: FormData): Promise<SignUpState> {
  // 1. Validate the form fields
  const validatedFields = SignUpSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check your input.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { name, email, password } = validatedFields.data;

  try {
    // 2. Initialize Firebase Admin SDK
    const adminApp = initializeAdminApp();
    const adminAuth = getAuth(adminApp);
    const adminFirestore = getFirestore(adminApp);

    // 3. Create the user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: false, // Users must verify their email
    });

    // 4. Create the corresponding user profile in Firestore
    const userProfile = {
      email: userRecord.email,
      name: userRecord.displayName,
      role: 'student', // Assign a default role
      active: true,
    };
    await adminFirestore.collection('user_profiles').doc(userRecord.uid).set(userProfile);

    // 4a. Set the custom claim on the Authentication user.
    // This adds the 'role' to the user's ID token.
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'student' });

    // 5. Return a success state with credentials
    // These credentials are passed back to the client to trigger the verification email flow
    return {
      message: `Account for ${email} created successfully.`,
      success: true,
      credentials: { email, password },
    };

  } catch (error: any) {
    // Handle specific, common errors like a duplicate email
    if (error.code === 'auth/email-already-exists') {
      return {
        message: 'Sign-up failed.',
        errors: { email: ['This email address is already in use.'] },
        success: false,
      };
    }
    
    // Handle any other unexpected errors
    console.error('Error creating user:', error);
    return {
      message: 'An unexpected error occurred on the server.',
      errors: { _form: ['An unexpected error occurred. Please try again.'] },
      success: false,
    };
  }
}