import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

const raw = process.env.FIREBASE_CREDENTIALS_JSON;

if (!raw) throw new Error('Missing FIREBASE_CREDENTIALS_JSON');

const parsed = JSON.parse(raw);

// Replace escaped newlines
parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(parsed as admin.ServiceAccount),
});

console.log('Firebase Admin initialized');
export { admin };
