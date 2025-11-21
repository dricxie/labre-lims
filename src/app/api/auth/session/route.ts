import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin';

// This is the endpoint that the login page calls to create a session cookie.
export async function POST(request: Request) {
  try {
    // 1. Initialize Firebase Admin
    initializeAdminApp();

    // 2. Get the ID token from the client's request body
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    // 3. Set the session cookie's expiration time (e.g., 5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds

    // 4. Verify the ID token and create the session cookie
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });

    // 5. Set the cookie on the response
    const response = NextResponse.json({ success: true });
    response.cookies.set('__session', sessionCookie, {
      httpOnly: true, // Makes the cookie inaccessible to client-side JavaScript
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: expiresIn / 1000, // maxAge is in seconds
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Session Login Error:', error);
    return NextResponse.json({ error: 'Failed to create session.', details: error.message }, { status: 401 });
  }
}