// set-admin.js
const admin = require('firebase-admin');

// --- IMPORTANT ---
// 1. Put your service account key file in the same directory
const serviceAccount = require('./serviceAccountKey.json');

// 2. Get the UID of the user you want to make an admin
//    (This is the UID from your error message)
const uidToMakeAdmin = 'HUSnBwe0VvTxGvTIDWOZYOIkmrn2';
// -----------------

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim() {
  try {
    console.log(`Setting 'admin' role for user: ${uidToMakeAdmin}`);
    
    // Set the custom claim. This is the crucial step.
    await admin.auth().setCustomUserClaims(uidToMakeAdmin, { role: 'admin' });
    
    console.log('Custom claim set successfully!');

    // (Optional but recommended) Verify the claim was set
    const userRecord = await admin.auth().getUser(uidToMakeAdmin);
    console.log('Verification successful. User claims:', userRecord.customClaims);
    
  } catch (error) {
    console.error('Error setting custom claim:', error);
  }
}

setAdminClaim();