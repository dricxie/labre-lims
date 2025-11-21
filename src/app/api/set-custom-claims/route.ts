import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const adminAuth = getAuth(initializeAdminApp());

    // ------------------- TEMPORARY BOOTSTRAP CODE -------------------
    // 1. PASTE YOUR USER ID HERE
    const myAdminUid = "qFY0EWUbWGYj6mXEg8AsC9ZXnBh2"; 

    // 2. Set the 'admin' role on your account
    await adminAuth.setCustomUserClaims(myAdminUid, { role: 'admin' });
    console.log(`SUCCESS: Admin role has been set for user ${myAdminUid}`);
    // ----------------------------------------------------------------

    // For this one-time use, we can just return success.
    return NextResponse.json({ success: true, message: 'Bootstrap successful.' });

  } catch (error: any) {
    console.error('Error setting custom claims:', error);
    return NextResponse.json(
      { error: 'Failed to set custom claims', details: error.message },
      { status: 500 }
    );
  }
}