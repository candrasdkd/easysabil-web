import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, sendPasswordResetEmail, type User } from 'firebase/auth';
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/client";
import { AuthContext } from './auth';
import type { UserProfile } from '../types/auth';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    // Track the active Firestore snapshot listener so we can cancel it properly
    const snapshotUnsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            // ✅ Always cancel the previous snapshot listener before setting up a new one
            if (snapshotUnsubRef.current) {
                snapshotUnsubRef.current();
                snapshotUnsubRef.current = null;
            }

            if (currentUser) {
                // Reset to clean state before loading new profile
                setProfile(null);
                setLoading(true);
                setUser(currentUser);

                const docRef = doc(db, "users", currentUser.uid);
                const unsubscribeSnapshot = onSnapshot(
                    docRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setProfile({
                                uid: currentUser.uid,
                                email: typeof data.email === 'string'
                                    ? data.email
                                    : currentUser.email ?? '',
                                status: Number(data.status),
                                kelompok: typeof data.kelompok === 'string' ? data.kelompok : '',
                                isActive: data.isActive === true,
                                createdAt: data.createdAt,
                            });
                        } else {
                            setProfile(null);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Error fetching profile:", error);
                        setProfile(null);
                        setLoading(false);
                    }
                );

                // ✅ Store the unsubscriber in the ref — this is the key fix!
                snapshotUnsubRef.current = unsubscribeSnapshot;
            } else {
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            // ✅ Also clean up snapshot on unmount
            if (snapshotUnsubRef.current) {
                snapshotUnsubRef.current();
                snapshotUnsubRef.current = null;
            }
        };
    }, []);

    const signOut = useCallback(async () => {
        // ✅ Cancel snapshot immediately so no stale updates fire after logout
        if (snapshotUnsubRef.current) {
            snapshotUnsubRef.current();
            snapshotUnsubRef.current = null;
        }
        setUser(null);
        setProfile(null);
        await firebaseSignOut(auth);
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    }, []);

    const contextValue = useMemo(
        () => ({ user, profile, loading, signOut, resetPassword }),
        [user, profile, loading, signOut, resetPassword],
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
