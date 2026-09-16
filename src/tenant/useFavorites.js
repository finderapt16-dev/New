import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { isTenantRole } from '../services/authService';
import { getFavoriteApartmentIds, isApartmentFavorite, toggleFavorite as toggleFavoriteInDb, } from '../data/apartments';
export function useFavorites() {
    const { user, isAuthenticated } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [updatingFavoriteIds, setUpdatingFavoriteIds] = useState([]);
    const favoritesRef = useRef([]);
    useEffect(() => {
        favoritesRef.current = favorites;
    }, [favorites]);
    const loadFavorites = useCallback(async () => {
        if (!user?.id) {
            setFavorites([]);
            setError(null);
            return;
        }
        const hasExistingFavorites = favoritesRef.current.length > 0;
        if (hasExistingFavorites) {
            setIsRefreshing(true);
        }
        else {
            setIsLoading(true);
        }
        try {
            const ids = await getFavoriteApartmentIds(user.id);
            setFavorites(ids);
            setError(null);
        }
        catch (error) {
            console.error('Failed to load favorites:', error);
            setError('Unable to load favorites. Please try again.');
            if (!hasExistingFavorites) {
                setFavorites([]);
            }
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user?.id]);
    useEffect(() => {
        void loadFavorites();
    }, [loadFavorites]);
    const toggleFavorite = useCallback(async (apartmentId) => {
        if (!isAuthenticated || !user?.id) {
            toast.error('Please sign in to save favorites.');
            return;
        }
        if (!isTenantRole(user.role)) {
            toast.error('Favorites are only available for tenant accounts.');
            return;
        }
        if (updatingFavoriteIds.includes(apartmentId)) {
            return;
        }
        const wasFavorite = favorites.includes(apartmentId);
        setUpdatingFavoriteIds((previous) => [...previous, apartmentId]);
        try {
            const isNowFavorite = await toggleFavoriteInDb(apartmentId, user.id);
            setFavorites((previous) => {
                if (isNowFavorite) {
                    return previous.includes(apartmentId) ? previous : [...previous, apartmentId];
                }
                return previous.filter((id) => id !== apartmentId);
            });
            if (isNowFavorite) {
                toast.success('Added to favorites');
            }
            else {
                toast.info('Removed from favorites');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to update favorites.';
            toast.error(message);
            const stillFavorite = await isApartmentFavorite(user.id, apartmentId).catch(() => wasFavorite);
            setFavorites((previous) => {
                if (stillFavorite) {
                    return previous.includes(apartmentId) ? previous : [...previous, apartmentId];
                }
                return previous.filter((id) => id !== apartmentId);
            });
        }
        finally {
            setUpdatingFavoriteIds((previous) => previous.filter((id) => id !== apartmentId));
        }
    }, [favorites, isAuthenticated, updatingFavoriteIds, user?.id, user?.role]);
    const isFavorite = useCallback((apartmentId) => favorites.includes(apartmentId), [favorites]);
    return {
        favorites,
        isLoading,
        isRefreshing,
        error,
        updatingFavoriteIds,
        toggleFavorite,
        isFavorite,
        refreshFavorites: loadFavorites,
    };
}
