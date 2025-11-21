import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin';

export async function verifyAuth() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
        throw new Error('Unauthenticated: No session cookie found');
    }

    try {
        initializeAdminApp();
        const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);

        if (!decodedToken.email) {
            throw new Error('Invalid token: Email is missing');
        }

        return {
            userId: decodedToken.uid,
            userEmail: decodedToken.email
        };
    } catch (error) {
        console.error('Auth verification failed:', error);
        throw new Error('Unauthenticated: Invalid session');
    }
}
