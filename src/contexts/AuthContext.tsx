import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, sendPasswordResetEmail, type User } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/client";

export interface UserProfile {
    uid: string;
    email: string;
    status: number; // 0=Super Admin, 1=Admin, 2=4S Desa, 3=4S Kelompok, 4=PM Desa, 5=PM Kelompok
    kelompok: string;
    isActive: boolean;
    createdAt?: any;
}
export const STATUS_LABELS: Record<number, string> = {
    0: 'Super Admin',
    1: 'Admin',
    2: 'Pengurus Desa',
    3: 'Pengurus Kelompok',
    4: 'Pengurus Muda/i Desa',
    5: 'Pengurus Muda/i Kelompok'
};

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    resetPassword: async () => { },
});

export const useAuth = () => useContext(AuthContext);

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
                            setProfile(docSnap.data() as UserProfile);
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

    const signOut = async () => {
        // ✅ Cancel snapshot immediately so no stale updates fire after logout
        if (snapshotUnsubRef.current) {
            snapshotUnsubRef.current();
            snapshotUnsubRef.current = null;
        }
        setUser(null);
        setProfile(null);
        await firebaseSignOut(auth);
    };

    const resetPassword = async (email: string) => {
        // Check if email exists in Firestore users collection first
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            const err: any = new Error('Email tidak terdaftar.');
            err.code = 'auth/user-not-found';
            throw err;
        }
        await sendPasswordResetEmail(auth, email);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
};
