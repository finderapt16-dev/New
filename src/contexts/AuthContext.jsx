import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { supabase } from '../services/supabaseClient';
import { clearLegacyApplicationStorage } from '../utils/legacyStorageCleanup';
import { deleteUser as deleteUserRecord, fetchAppUsers, getCurrentAuthenticatedUser, getPendingLandlordCount, loginUser, logoutUser, onAuthStateChange, persistCurrentUser, signupUser, updateUser as updateUserRecord, verifyLandlord as verifyLandlordRecord } from '../services/authService';
function getErrorMessage(error, fallback) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return fallback;
}
export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [pendingLandlordCount, setPendingLandlordCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const authRequestIdRef = useRef(0);
    const refreshUsers = useCallback(async () => {
        const [allUsers, pendingCount] = await Promise.all([fetchAppUsers(), getPendingLandlordCount()]);
        setUsers(allUsers);
        setPendingLandlordCount(pendingCount);
        setCurrentUser((previousUser) => {
            if (previousUser === null) {
                return null;
            }
            const refreshedCurrentUser = allUsers.find((user) => user.id === previousUser.id);
            if (refreshedCurrentUser) {
                persistCurrentUser(refreshedCurrentUser);
                return refreshedCurrentUser;
            }
            else {
                persistCurrentUser(null);
                return null;
            }
        });
    }, []);
    useEffect(() => {
        let isActive = true;
        const initializeAuth = async () => {
            const requestId = ++authRequestIdRef.current;
            try {
                clearLegacyApplicationStorage();
                const [allUsers, pendingCount] = await Promise.all([fetchAppUsers(), getPendingLandlordCount()]);
                if (!isActive || requestId !== authRequestIdRef.current) {
                    return;
                }
                setUsers(allUsers);
                setPendingLandlordCount(pendingCount);
                const authenticatedUser = await getCurrentAuthenticatedUser();
                if (!isActive || requestId !== authRequestIdRef.current)
                    return;
                setCurrentUser(authenticatedUser);
            }
            catch (error) {
                if (!isActive || requestId !== authRequestIdRef.current) {
                    return;
                }
                console.error('Failed to initialize auth state:', error);
                setUsers([]);
                setPendingLandlordCount(0);
                setCurrentUser(null);
                persistCurrentUser(null);
            }
            finally {
                if (isActive && requestId === authRequestIdRef.current) {
                    setIsLoading(false);
                }
            }
        };
        void initializeAuth();
        return () => {
            isActive = false;
        };
    }, []);
    useEffect(() => {
        return onAuthStateChange((authUser) => {
            setCurrentUser(authUser);
        });
    }, []);
    useEffect(() => {
        const refreshOnFocus = () => void refreshUsers().catch(() => undefined);
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible')
                refreshOnFocus();
        };
        window.addEventListener('focus', refreshOnFocus);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            window.removeEventListener('focus', refreshOnFocus);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [refreshUsers]);
    useEffect(() => {
        let refreshTimer = null;
        const scheduleRefresh = () => {
            if (refreshTimer)
                clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => void refreshUsers().catch(() => undefined), 100);
        };
        const channel = supabase
            .channel('auth-verification-sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_users' }, scheduleRefresh)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'apartments' }, scheduleRefresh)
            .subscribe();
        return () => {
            if (refreshTimer)
                clearTimeout(refreshTimer);
            void supabase.removeChannel(channel);
        };
    }, [refreshUsers]);
    const login = useCallback(async (credentials) => {
        const requestId = ++authRequestIdRef.current;
        setIsLoading(true);
        setCurrentUser(null);
        persistCurrentUser(null);
        try {
            const user = await loginUser(credentials);
            if (requestId !== authRequestIdRef.current) {
                return { success: false, error: 'A newer sign-in request is already in progress.' };
            }
            setCurrentUser(user);
            persistCurrentUser(user);
            void refreshUsers().catch((refreshError) => {
                console.warn('Failed to refresh users after login:', refreshError);
            });
            return { success: true, user };
        }
        catch (error) {
            return { success: false, error: getErrorMessage(error, 'Invalid username or password.') };
        }
        finally {
            if (requestId === authRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [refreshUsers]);
    const signup = useCallback(async (input) => {
        try {
            const signupResult = await signupUser(input);
            if (signupResult.accountCreated && signupResult.profileCreated)
                void refreshUsers().catch((refreshError) => {
                    console.warn('Failed to refresh users after signup:', refreshError);
                });
            return { success: true, user: signupResult.user, signup: signupResult };
        }
        catch (error) {
            return { success: false, error: getErrorMessage(error, 'Unable to create account.') };
        }
    }, [refreshUsers]);
    const updateUser = useCallback(async (userId, updates) => {
        const updatedUser = await updateUserRecord(userId, updates);
        setUsers((previousUsers) => previousUsers.map((user) => (user.id === userId ? updatedUser : user)));
        if (currentUser?.id === userId) {
            setCurrentUser(updatedUser);
            persistCurrentUser(updatedUser);
        }
        const pendingCount = await getPendingLandlordCount();
        setPendingLandlordCount(pendingCount);
        return updatedUser;
    }, [currentUser?.id]);
    const deleteUser = useCallback(async (userId) => {
        await deleteUserRecord(userId);
        setUsers((previousUsers) => previousUsers.filter((user) => user.id !== userId));
        if (currentUser?.id === userId) {
            setCurrentUser(null);
            persistCurrentUser(null);
        }
        const pendingCount = await getPendingLandlordCount();
        setPendingLandlordCount(pendingCount);
    }, [currentUser?.id]);
    const verifyLandlord = useCallback(async (userId, verified = true) => {
        const updatedUser = await verifyLandlordRecord(userId, verified);
        setUsers((previousUsers) => previousUsers.map((user) => (user.id === userId ? updatedUser : user)));
        if (currentUser?.id === userId) {
            setCurrentUser(updatedUser);
            persistCurrentUser(updatedUser);
        }
        const pendingCount = await getPendingLandlordCount();
        setPendingLandlordCount(pendingCount);
        return updatedUser;
    }, [currentUser?.id]);
    const logout = useCallback(() => {
        authRequestIdRef.current += 1;
        setIsLoading(true);
        setCurrentUser(null);
        void logoutUser().catch((logoutError) => {
            console.warn('Failed to sign out from Supabase Auth:', logoutError);
        }).finally(() => {
            persistCurrentUser(null);
            setIsLoading(false);
        });
    }, []);
    const canEditApartment = useCallback((_apartmentId, landlordId) => {
        if (!currentUser || currentUser.role !== 'landlord' || !currentUser.isVerified) {
            return false;
        }
        if (landlordId) {
            return landlordId === currentUser.id;
        }
        // Ownership must be explicit. RLS remains the final enforcement layer, but
        // the client must never expose editing controls when owner data is absent.
        return false;
    }, [currentUser]);
    const contextValue = useMemo(() => ({
        currentUser,
        user: currentUser,
        users,
        pendingLandlordCount,
        isLoading,
        isAuthenticated: currentUser !== null,
        refreshUsers,
        login,
        signup,
        updateUser,
        deleteUser,
        verifyLandlord,
        canEditApartment,
        logout,
    }), [
        currentUser,
        users,
        pendingLandlordCount,
        isLoading,
        refreshUsers,
        login,
        signup,
        updateUser,
        deleteUser,
        verifyLandlord,
        canEditApartment,
        logout,
    ]);
    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
