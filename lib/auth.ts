import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth } from '@/lib/firebase';
import { usersCollection } from '@/lib/firestore';
import type { User } from '@/types/models';

function getFriendlyAuthErrorMessage(error: unknown): string {
  const code = (error as Partial<AuthError>)?.code;

  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export async function signUp(name: string, email: string, password: string) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    await setDoc(doc(usersCollection, uid), {
      uid,
      name,
      email,
      role: 'citizen',
      createdAt: serverTimestamp(),
    });

    return credential.user;
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function signIn(email: string, password: string) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function fetchUserProfile(uid: string): Promise<User | null> {
  const snapshot = await getDoc(doc(usersCollection, uid));
  return snapshot.exists() ? snapshot.data() : null;
}
