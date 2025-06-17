import * as admin from 'firebase-admin';
// Either import your JSON credentials if tsconfig allows, or require():
import serviceAccount from '../firebase-admin.json'; // adjust path so at runtime it resolves correctly

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

// Simple check: list initialized apps or log something
console.log('Firebase Admin initialized, apps:', admin.apps.length);

export { admin };
