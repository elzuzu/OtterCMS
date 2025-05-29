import { lazy } from 'react';

// Lazy load des composants volumineux
export const Dashboard = lazy(() => import('./Dashboard'));
export const IndividusList = lazy(() => import('./IndividusList'));
export const ImportData = lazy(() => import('./ImportData'));
export const MassAttribution = lazy(() => import('./MassAttribution'));
export const AdminCategories = lazy(() => import('./AdminCategories'));
export const AdminUsersSection = lazy(() => import('./AdminUsersSection'));
export const AdminTemplate = lazy(() => import('./AdminTemplate'));
export const UserSettings = lazy(() => import('./UserSettings'));
export const IndividuFiche = lazy(() => import('./IndividuFiche'));
export const NouvelIndividu = lazy(() => import('./NouvelIndividu'));
