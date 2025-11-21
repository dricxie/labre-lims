'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { initializeAdminApp } from '@/firebase/admin';

// -------- Base State --------
export type State = {
  errors?: Record<string, string[]> | null;
  message?: string | null;
};

// -------- Update Name Action --------
const UpdateNameSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long.' }),
});

export async function updateName(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = UpdateNameSchema.safeParse({
    name: formData.get('name'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation failed. Please check your input.',
    };
  }
  
  const { name } = validatedFields.data;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value || '';
    const adminAuth = getAuth(initializeAdminApp());
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    const adminFirestore = getFirestore(initializeAdminApp());
    const userProfileRef = adminFirestore.collection('user_profiles').doc(decodedToken.uid);
    
    // Update both Firebase Auth displayName and Firestore profile
    await Promise.all([
      adminAuth.updateUser(decodedToken.uid, { displayName: name }),
      userProfileRef.update({ name }),
    ]);

    revalidatePath('/dashboard/profile');
    return { message: 'Your name has been updated successfully.' };

  } catch (error: any) {
    console.error('Error updating name:', error);
    return { message: 'An unexpected error occurred. Please try again.' };
  }
}


// -------- Change Password Action --------
const ChangePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});


export async function changePassword(prevState: State, formData: FormData): Promise<State> {
   const validatedFields = ChangePasswordSchema.safeParse({
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation failed. Please check your input.',
    };
  }

  const { newPassword } = validatedFields.data;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value || '';
    const adminAuth = getAuth(initializeAdminApp());
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    await adminAuth.updateUser(decodedToken.uid, { password: newPassword });

    return { message: 'Your password has been changed successfully.' };

  } catch (error: any) {
    console.error('Error changing password:', error);
    if (error.code === 'auth/requires-recent-login') {
      return { message: 'This action requires you to have logged in recently. Please sign out and sign back in to change your password.' };
    }
    return { message: 'An unexpected error occurred while changing your password.' };
  }
}