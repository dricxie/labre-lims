import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';

import { initializeAdminApp } from '@/firebase/admin';
import { ALL_ROLES, UserRole } from '@/lib/rbac';

const adminAuth = getAuth(initializeAdminApp());

type RouteParams = { uid: string }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1] ?? '';
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { role } = (await request.json()) as { role?: UserRole };
    if (!role || !ALL_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 });
    }

    const { uid: targetUid } = await params;
    if (!targetUid) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const userRecord = await adminAuth.getUser(targetUid);
    const currentClaims = userRecord.customClaims || {};

    await adminAuth.setCustomUserClaims(targetUid, {
      ...currentClaims,
      role,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update user role claims', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
