Voici la documentation nettoyée, formatée et complète au format Markdown pour "Datta Able - React".

---

# Documentation Datta Able - React + Vite Admin Template

Cette documentation fournit un guide complet pour utiliser et configurer le template d'administration Datta Able basé sur React et Vite.

---

## Table des Matières

1.  [Aperçu et Technologies](#1-aperçu-et-technologies)
2.  [Pré-requis](#2-pré-requis)
3.  [Démarrage Rapide](#3-démarrage-rapide)
    *   [Installation](#installation)
    *   [Démarrer le projet](#démarrer-le-projet)
    *   [Construire et Déployer](#construire-et-déployer)
4.  [Structure des Dossiers](#4-structure-des-dossiers)
5.  [Gestion d'État](#5-gestion-détat)
    *   [Context API](#context-api)
    *   [État de l'Application](#état-de-lapplication)
6.  [Authentification](#6-authentification)
    *   [Fonctionnement](#fonctionnement)
    *   [Configuration de l'Authentification](#configuration-de-lauthentification)
    *   [Changer de Méthode d'Authentification](#changer-de-méthode-dauthentification)
    *   [Passer de JWT à Auth0](#passer-de-jwt-à-auth0)
    *   [Passer de JWT à Firebase](#passer-de-jwt-à-firebase)
7.  [Appels API Axios](#7-appels-api-axios)
    *   [Définir l'URL de Base Axios](#définir-lurl-de-base-axios)
    *   [Exemple 1 : Avec `baseURL`](#exemple-1-avec-baseurl)
    *   [Exemple 2 : Sans `baseURL`](#exemple-2-sans-baseurl)
8.  [Routage](#8-routage)
    *   [Ajouter une nouvelle page avec un élément de menu](#ajouter-une-nouvelle-page-avec-un-élément-de-menu)
    *   [Configurer la route](#configurer-la-route)
9.  [Configuration du Projet](#9-configuration-du-projet)
10. [Thème et Mises en Page](#10-thème-et-mises-en-page)
    *   [Comment changer les préréglages de mise en page disponibles](#comment-changer-les-préréglages-de-mise-en-page-disponibles)
11. [Configuration du Thème/Style](#11-configuration-du-thèmestyle)
    *   [Arrière-plan de l'en-tête (Header Background)](#arrière-plan-de-len-tête-header-background)
    *   [Arrière-plan du menu (Menu Background)](#arrière-plan-du-menu-menu-background)
    *   [Image d'arrière-plan du menu (Menu Background Image)](#image-darrière-plan-du-menu-menu-background-image)
    *   [Arrière-plan de l'élément de menu actif (Menu Active Item Background)](#arrière-plan-de-lélément-de-menu-actif-menu-active-item-background)
    *   [Couleur du titre du menu (Menu Caption/Title Color)](#couleur-du-titre-du-menu-menu-captiontitle-color)
12. [Intégration](#12-intégration)
13. [Version "Seed"](#13-version-seed)
    *   [Démarrer avec la version Seed](#démarrer-avec-la-version-seed)
    *   [Ajouter des composants au projet "skeleton" ou un nouveau projet](#ajouter-des-composants-au-projet-skeleton-ou-un-nouveau-projet)
14. [Comparaison](#14-comparaison)
15. [Dépendances](#15-dépendances)
    *   [Dépendances NPM](#dépendances-npm)
    *   [Dépendances de Développement](#dépendances-de-développement)
16. [Support](#16-support)
    *   [Avant de soumettre un ticket](#avant-de-soumettre-un-ticket)
    *   [Lors de la soumission du ticket](#lors-de-la-soumission-du-ticket)
    *   [Après la soumission du ticket](#après-la-soumission-du-ticket)
17. [Journal des Modifications (Changelog)](#17-journal-des-modifications-changelog)

---

## 1. Aperçu et Technologies

Datta Able - React est un template d'administration basé sur React et Vite, offrant une variété de fonctionnalités et une structure intuitive.

**Pile Technologique :**

*   Bootstrap 5 (v5.3.3)
*   Méthodes d'authentification : Auth0, Firebase, JWT
*   API React Hooks (v18.2.0)
*   React Router
*   Axios
*   Vite
*   Code Splitting
*   CSS-in-JS
*   Google Fonts

**Crédits :** (Aucune information détaillée fournie dans le texte source au-delà de la section "Crédits" elle-même.)

**Suggestions ou Commentaires :**
Les commentaires de notre communauté sont toujours les bienvenus. N'hésitez pas à nous contacter à tout moment via notre [Panneau de Support](https://codedthemes.support-hub.io/tickets). Nous serions ravis de vous entendre à tout moment.

## 2. Pré-requis

Datta Able est basé sur Node et Vite. Assurez-vous d'avoir les pré-requis suivants avant de commencer :

*   **Node.js :** Version 20.x.x ou ultérieure.
    ```bash
    c:\> node -v
    v20.0.0
    ```
*   **Gestionnaire de paquets :** npm ou yarn.
    ```bash
    c:\> npm -v
    8.19.2
    ```
    Il est recommandé d'utiliser `yarn` plutôt que `npm` (voir [cet article](https://www.whitesourcesoftware.com/free-developer-tools/blog/npm-vs-yarn-which-should-you-choose/)).

Vous n'avez pas besoin d'installer ou de configurer des outils comme Webpack ou Babel ; ils sont déjà configurés et masqués pour que vous puissiez vous concentrer sur le code.

### Dépannage

Si vous rencontrez l'erreur `'npm' is not recognized as an internal or external command, operable program or batch file.`, cela signifie que `npm` n'est pas installé sur votre système. Veuillez l'installer en suivant [ce lien](https://www.npmjs.com/get-npm).

## 3. Démarrage Rapide

Démarrez rapidement votre projet avec Datta Able.

### Installation

1.  Naviguez vers votre dossier racine (par exemple, `datta-able-react-hook-reactstrap-js/full-version`).
    ```bash
    c:\>cd datta-able-react-hook-reactstrap-js/full-version
    ```
2.  Installez les paquets en utilisant `npm` ou `yarn` selon vos préférences.
    ```bash
    c:\datta-able-react-hook-reactstrap-js> npm i
    ```
    Ou si vous utilisez `yarn`:
    ```bash
    c:\datta-able-react-hook-reactstrap-js> yarn
    ```

### Démarrer le projet

Après l'installation des paquets, vous pouvez démarrer votre application en utilisant la commande `npm start` :
```bash
c:\datta-able-react-hook-reactstrap-js> npm start
```
Cela démarrera votre serveur local à l'adresse `http://localhost:3000`. Votre terminal affichera également :
```
Compiled successfully!

You can now view datta-able-react-hook-reactstrap-js in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.29.77:3000

Note that the development build is not optimized.
To create a production build, use npm run build.
```

### Construire et Déployer

Pour construire votre application en production, utilisez la commande `npm run build` :
```bash
c:\datta-able-react-hook-reactstrap-js> yarn build
```
ou
```bash
c:\datta-able-react-hook-reactstrap-js> npm run build
```
Vous devrez avoir Node v20.x.x ou une version ultérieure sur votre machine de développement locale (mais ce n'est pas requis sur le serveur). Vous pouvez utiliser [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) ou [nvm-windows](https://github.com/coreybutler/nvm-windows) pour basculer facilement entre les versions de Node entre différents projets.

## 4. Structure des Dossiers

La structure de dossiers simple et intuitive vous aide à naviguer facilement sans tracas.

Sous le répertoire `datta-able-react-hook-reactstrap-js/full-version`, vous trouverez la structure suivante :

```
datta-able-react-hook-reactstrap-js/full-version
..
├── public
├── src
│   ├── assets
│   │   ├── images
│   │   ├── scss
│   ├── components              -> Composants communs utilisés à travers le thème
│   ├── config
│   |   ├── constant.js         -> Différentes configurations du thème
│   ├── contexts                -> Contexte d'état pour la gestion des connexions et la configuration
│   ├── data                    -> Données statiques
│   ├── hooks                   -> Hooks personnalisés
│   ├── layout
│   │   ├── AdminLayout         -> Mise en page du tableau de bord
│   │   │    ├── Configuration  -> Personnalisation en direct
│   │   │    ├── ...
│   ├── services                -> APIs mockées
│   ├── store
│   │   ├── accountReducers.js
│   ├── utils                   -> Utilitaires Axios et services mockés
│   ├── views                   -> Fichiers de vue pour toutes les pages
│   ├── App.jsx
│   ├── index.jsx
│   ├── index.scss
│   ├── menu-items.jsx          -> Éléments de menu
│   ├── routes.jsx              -> Différentes routes basées sur les mises en page
│   ├── reportWebVitals.jsx
├── .env
├── .env.development
├── .env.qa
├── .eslintrc
├── .prettierrc
├── favicon.ico
├── index.html
├── jsconfig.json
├── package-lock.json           -> Fichier de verrouillage des paquets
├── package.json                -> Fichier package.json
├── README.md
├── vite.config.mjs
├── yarn.lock                   -> Fichier yarn.lock
```

## 5. Gestion d'État

La gestion du contexte, de l'état et des hooks.

### Context API

Context offre un moyen de passer des données à travers l'arbre des composants sans avoir à passer manuellement les props à chaque niveau.
Datta Able utilise Context pour les méthodes de connexion : Auth0, JWT et Firebase.

### État de l'Application

L'état de l'application est toujours conservé dans des objets et des tableaux JavaScript simples, ce qui signifie que vous ne pouvez pas y mettre d'autres types (instances de classe, types JS natifs comme Map/Set/Promise/Date, fonctions, ou tout ce qui n'est pas une donnée JS simple).

Sur la base de cette information, l'état initial ressemble à ceci :

```javascript
import { CONFIG } from '../config/constant';

const initialState = {
    ...CONFIG,
    isOpen: [], // pour le menu actif par défaut
    isTrigger: [] // pour le menu actif par défaut, laisser vide pour l'horizontal
};
```

## 6. Authentification

Configuration de JWT, Firebase et Auth0.

Datta Able inclut quatre méthodes d'authentification : JSON Web Token (JWT), Firebase et Auth0 pour ses utilisateurs. Les utilisateurs peuvent les changer selon leurs besoins.
**L'authentification JWT est définie par défaut.**

### Fonctionnement

Seuls les utilisateurs authentifiés peuvent accéder aux pages du tableau de bord. Si un utilisateur n'est pas authentifié, il est redirigé vers la page de connexion.
Deux "guards" sont utilisés : `GuestGuard` et `AuthGuard`. Ces guards sont configurés dans le dossier `\components\Auth\`.

Dans `src/layout/App.js`, le fournisseur d'authentification est spécifié, par exemple :

```javascript
// App.js
import { JWTProvider as AuthProvider } from 'contexts/JWTContext';
```

Le composant `App` est enveloppé avec `<JWTProvider>` :

```javascript
<ThemeCustomization>
    ...
    <AuthProvider>
        <Routes />
        <Snackbar />
    </AuthProvider>
    ...
</ThemeCustomization>
```
En utilisant `<JWTProvider>`, vous pouvez utiliser le contexte directement en important `useContext` de React et en spécifiant le contexte `JWTContext`, ou utiliser le hook personnalisé `useAuth` de `src/hooks/useAuth.js`.

### Configuration de l'Authentification

Toutes les configurations liées à l'authentification sont stockées dans `config.js`. Ces configurations incluent la clé API pour se connecter au serveur d'authentification, l'ID du projet, etc.

Datta Able fournit une configuration de test/factice pour que l'authentification fonctionne. Les utilisateurs doivent modifier l'API et le secret selon les besoins de leur projet et **ne doivent pas utiliser les clés fournies dans leur environnement de production.**

Exemple de variables d'environnement (`.env`) pour Firebase et Auth0 :

```dotenv
## Firebase - Google Auth
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=

## Auth0
REACT_APP_AUTH0_CLIENT_ID=
REACT_APP_AUTH0_DOMAIN=
```
Le thème fournit un exemple fonctionnel uniquement pour la connexion et l'enregistrement. D'autres flux comme la réinitialisation du mot de passe ou la vérification doivent être implémentés par l'utilisateur.

### Changer de Méthode d'Authentification

Vous pouvez basculer entre les méthodes d'authentification en modifiant quelques fichiers.

### Passer de JWT à Auth0

1.  **Définir la configuration Auth0 :**
    Actuellement, Auth0 utilise un ID client et un domaine factices. En production, vous devrez définir votre `client id` et `domain` dans le fichier `.env`. Pour plus de détails, consultez la documentation Auth0 [ici](https://auth0.com/docs/get-started/auth0-overview).
    ```dotenv
    # .env
    ...
    VITE_APP_AUTH0_CLIENT_ID=
    VITE_APP_AUTH0_DOMAIN=
    ...
    ```
2.  **Changer le `AuthProvider` :**
    Dans `..\src\App.jsx`, changez l'importation du fournisseur d'authentification.
    ```javascript
    // ..\src\App.jsx
    import { Auth0Provider as AuthProvider } from './contexts/Auth0Context';
    ```
3.  **Changer les hooks d'authentification :**
    Dans `..\src\hooks\useAuth.jsx`, commentez les autres contextes et décommentez celui d'Auth0.
    ```javascript
    // ..\src\hooks\useAuth.jsx
    import AuthContext from '../contexts/Auth0Context';
    ```
4.  **Changer la vue de la page de connexion :**
    Dans `..\src\views\auth\signin\SignIn1.jsx`, commentez les autres pages de connexion et décommentez celle d'Auth0.
    ```javascript
    // ..\src\views\auht\signin\SignIn1.jsx
    import AuthLogin from './Auth0Login'
    ```

### Passer de JWT à Firebase

1.  **Définir la configuration Firebase :**
    Vous devez définir les secrets dans le fichier `.env`. Pour plus de détails, consultez la documentation Firebase [ici](https://firebase.google.com/docs/reference/rest/auth).
    ```dotenv
    # .env
    ...
    ###
    ## Firebase - Google Auth
    VITE_APP_FIREBASE_API_KEY=
    VITE_APP_FIREBASE_AUTH_DOMAIN=
    VITE_APP_FIREBASE_PROJECT_ID=
    VITE_APP_FIREBASE_STORAGE_BUCKET=
    VITE_APP_FIREBASE_MESSAGING_SENDER_ID=
    VITE_APP_FIREBASE_APP_ID=
    VITE_APP_FIREBASE_MEASUREMENT_ID=
    ###
    ...
    ```
2.  **Changer le `AuthProvider` :**
    Dans `..\src\App.jsx`, changez l'importation du fournisseur d'authentification.
    ```javascript
    // ..\src\App.jsx
    import { FirebaseProvider as AuthProvider } from './contexts/FirebaseContext';
    ```
3.  **Changer les hooks d'authentification :**
    Dans `..\src\hooks\useAuth.jsx`, commentez les autres contextes et décommentez celui de Firebase.
    ```javascript
    // ..\src\hooks\useAuth.jsx
    import AuthContext from '../contexts/FirebaseContext';
    ```
4.  **Changer la vue de la page de connexion :**
    Dans `..\src\views\auth\signin\SignIn1.jsx`, commentez les autres pages de connexion et décommentez celle de Firebase.
    ```javascript
    // ..\src\views\auht\signin\SignIn1.jsx
    import AuthLogin from './FirebaseLogin'
    ```

## 7. Appels API Axios

Appels API mockés.

### Définir l'URL de Base Axios

Ouvrez le fichier `.env` et éditez `VITE_APP_API_URL`.

```dotenv
## Backend API URL
VITE_APP_API_URL=
```
Axios a été configuré dans le dossier `src\utils\authAxios.js`.

### Exemple 1 : Avec `baseURL`

```javascript
// src\utils\authAxios.js
import axios from 'axios';

const axiosServices = axios.create({ baseURL: import.meta.env.VITE_APP_API_URL || 'http://localhost:3010/' });

// ==============================|| AXIOS SERVICES ||============================== //

axiosServices.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response.status === 401 && !window.location.href.includes('/login')) {
            window.location.pathname = '/login';
        }
        return Promise.reject((error.response && error.response.data) || 'Wrong Services');
    }
);

export default axiosServices;
```

### Exemple 2 : Sans `baseURL`

Vous pouvez définir l'URL entière dans la requête Axios. N'utilisez pas les instances Axios communes de `src\utils\axios.js`, mais utilisez directement la bibliothèque Axios.

```javascript
// src\utils\axios.js
import axios from 'axios';

const axiosServices = axios.create();

// ==============================|| AXIOS SERVICES ||============================== //

axiosServices.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject((error.response && error.response.data) || 'Wrong Services')
);

export default axiosServices;
```

## 8. Routage

Le système de routage de Datta Able est basé sur `react-router` et son paquet `react-router-dom`. Il utilise également le code splitting pour une meilleure performance.

### Ajouter une nouvelle page avec un élément de menu

Vous pouvez utiliser l'explication ci-dessous pour ajouter/supprimer des routes de menu et leurs éléments de menu.

### Configurer la route

Ouvrez `src\routes.js`. Vous y trouverez l'exemple de code ci-dessous.
`AdminLayout` est le routage de la mise en page principale que vous voyez après la connexion. Toute route ajoutée dans `AdminLayout` passera automatiquement par `<AuthGuard>`.

```javascript
// routes.js
import React, { Suspense, Fragment, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loader from './components/Loader/Loader';
import AdminLayout from './layouts/AdminLayout';
import GuestGuard from './components/Auth/GuestGuard';
import AuthGuard from './components/Auth/AuthGuard';
import { BASE_URL } from './config/constant';

export const renderRoutes = (routes = []) => (
    <Suspense fallback={<Loader />}>
        <Routes>
            {routes.map((route, i) => {
                const Guard = route.guard || Fragment;
                const Layout = route.layout || Fragment;
                const Element = route.element;
                return (
                    <Route
                        key={i}
                        path={route.path}
                        element={
                            <Guard>
                                <Layout>{route.routes ? renderRoutes(route.routes) : <Element props={true} />}</Layout>
                            </Guard>
                        }
                    />
                );
            })}
        </Routes>
    </Suspense>
);

const routes = [
    {
        exact: 'true',
        guard: GuestGuard,
        path: '/login',
        element: lazy(() => import('./views/auth/signin/SignIn1'))
    },
    // ... autres routes publiques
    {
        exact: 'true',
        path: '/404',
        element: lazy(() => import('./views/errors/NotFound404'))
    },
    {
        path: '*',
        layout: AdminLayout,
        guard: AuthGuard,
        routes: [
            {
                exact: 'true',
                path: '/app/dashboard/default',
                element: lazy(() => import('./views/dashboard/DashDefault'))
            },
            // ... autres routes protégées
            {
                path: '*',
                exact: 'true',
                element: () => <Navigate to={BASE_URL} />
            }
        ]
    }
];

export default routes;
```

## 9. Configuration du Projet

Datta Able dispose d'une source unique de vérité pour la configuration par défaut, ce qui permet aux utilisateurs de la gérer efficacement. Cela la rend également évolutive pour de nouvelles configurations. Vous pouvez définir des configurations comme la police, la bordure, la mise en page du thème, etc. Toutes ces configurations peuvent être définies dans `src/config/constant.js`.

| Option             | Défaut            | Type      | Description                                                                                                                                                                                                            |
| :----------------- | :---------------- | :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`           | `vertical`        | `string`  | `vertical`, `horizontal`                                                                                                                                                                                               |
| `subLayout`        | `null`            | `string`  | `null`, `layout-2`, `layout-2-2`, `layout-3`, `layout-4`, `layout-4-2`, `layout-6`, `layout-8`                                                                                                                            |
| `collapseMenu`     | `false`           | `boolean` | `false`, `true` (mini-menu)                                                                                                                                                                                            |
| `layoutType`       | `menu-dark`       | `string`  | `menu-dark`, `menu-light`, `dark`                                                                                                                                                                                      |
| `navIconColor`     | `false`           | `boolean` | `true`, `false`                                                                                                                                                                                                        |
| `headerBackColor`  | `header-default`  | `string`  | `header-default`, `header-blue`, `header-red`, `header-purple`, `header-lightblue`, `header-dark`                                                                                                                      |
| `navBackColor`     | `navbar-default`  | `string`  | `navbar-default`, `navbar-blue`, `navbar-red`, `navbar-purple`, `navbar-lightblue`, `navbar-dark`                                                                                                                      |
| `navBrandColor`    | `brand-default`   | `string`  | `brand-default`, `brand-blue`, `brand-red`, `brand-purple`, `brand-lightblue`, `brand-dark`                                                                                                                            |
| `navBackImage`     | `false`           | `string`  | `false`, `navbar-image-1`, `navbar-image-2`, `navbar-image-3`, `navbar-image-4`, `navbar-image-5`                                                                                                                      |
| `rtlLayout`        | `false`           | `boolean` | `false`, `true`                                                                                                                                                                                                        |
| `navFixedLayout`   | `true`            | `boolean` | `false`, `true` (uniquement pour les mises en page verticales)                                                                                                                                                         |
| `headerFixedLayout`| `false`           | `boolean` | `false`, `true` (uniquement pour les mises en page verticales)                                                                                                                                                         |
| `boxLayout`        | `false`           | `boolean` | `false`, `true`                                                                                                                                                                                                        |
| `navDropdownIcon`  | `style1`          | `string`  | `style1`, `style2`, `style3`                                                                                                                                                                                           |
| `navListIcon`      | `style1`          | `string`  | `style1`, `style2`, `style3`, `style4`, `style5`, `style6`                                                                                                                                                             |
| `navActiveListColor`| `active-default`  | `string`  | `active-default`, `active-blue`, `active-red`, `active-purple`, `active-lightblue`, `active-dark`                                                                                                                      |
| `navListTitleColor`| `title-default`   | `string`  | `title-default`, `title-blue`, `title-red`, `title-purple`, `title-lightblue`, `title-dark`                                                                                                                            |
| `navListTitleHide` | `false`           | `boolean` | `false`, `true`                                                                                                                                                                                                        |
| `configBlock`      | `true`            | `boolean` | `false`, `true` (utilisé uniquement pour `preLayout`)                                                                                                                                                                  |
| `layout6Background`| `#23b7e5`         | `string`  | Couleur de fond pour `preLayout: layout-6`. <br> **Exemples de couleurs :** `#04a9f5`, `#ff5252`, `#9575CD`, `#23b7e5`, `#424448`, `linear-gradient(...)`                                                                |
| `layout6BackSize`  | `''`              | `string`  | `auto` (pour les motifs d'arrière-plan), `cover` (pour les images d'arrière-plan), utilisé uniquement pour `preLayout: layout-6`.                                                                                        |
| `i18n`             | `'en'`            | `string`  | `'en'`, `'fr'`, `'ro'`, `'zh'`                                                                                                                                                                                         |

Contenu du fichier `src\config\constant.js` :

```javascript
// ..\src\config\constant.js
export const BASENAME = ''; // ne pas ajouter '/' à la fin de BASENAME
export const BASE_URL = '/app/dashboard/default';
export const BASE_TITLE = ' | Datta Able Premium React Hooks + Redux Admin Template';

export const CONFIG = {
    layout: 'vertical', // vertical, horizontal
    subLayout: '', // null, layout-2, layout-2-2, layout-3, layout-4, layout-4-2, layout-6, layout-8
    collapseMenu: false, // mini-menu
    layoutType: 'menu-dark', // menu-dark, menu-light, dark
    navIconColor: false,
    headerBackColor: 'header-default', // header-default, header-blue, header-red, header-purple, header-lightblue, header-dark
    navBackColor: 'navbar-default', // navbar-default, navbar-blue, navbar-red, navbar-purple, navbar-lightblue, navbar-dark
    navBrandColor: 'brand-default', // brand-default, brand-blue, brand-red, brand-purple, brand-lightblue, brand-dark
    navBackImage: false, // false, navbar-image-1, navbar-image-2, navbar-image-3, navbar-image-4, navbar-image-5
    rtlLayout: false,
    navFixedLayout: true, // uniquement pour les mises en page verticales
    headerFixedLayout: false, // uniquement pour les mises en page verticales
    boxLayout: false,
    navDropdownIcon: 'style1', // style1, style2, style3
    navListIcon: 'style1', // style1, style2, style3, style4, style5, style6
    navActiveListColor: 'active-default', // active-default, active-blue, active-red, active-purple, active-lightblue, active-dark
    navListTitleColor: 'title-default', // title-default, title-blue, title-red, title-purple, title-lightblue, title-dark
    navListTitleHide: false,
    configBlock: true,
    layout6Background: 'linear-gradient(to right, #A445B2 0%, #D41872 52%, #FF0066 100%)', // utilisé uniquement pour pre-layout = layout-6
    layout6BackSize: '' // 'auto' - pour le motif d'arrière-plan, 'cover' - pour les images d'arrière-plan & utilisé uniquement pour pre-layout = layout-6
    i18n: 'en' // 'en', 'fr', 'ro', 'zh'
};
```

## 10. Thème et Mises en Page

Datta Able est livré avec plus de 20 préréglages de mise en page.

### Comment changer les préréglages de mise en page disponibles

Vous pouvez modifier les préréglages de mise en page disponibles en suivant les étapes suivantes :
Ouvrez le fichier `constant.js` depuis le répertoire `src\config\`.

| Mise en Page (Layout)      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vertical**               | Configuration par défaut :<br> `basename`: définir le chemin du `BrowserRouter`, comme `/datta-able-react`<br> `layout: vertical`<br> `preLayout: null`<br> `collapseMenu: false`<br> `layoutType: menu-dark`<br> `navIconColor: false`<br> `headerBackColor: header-default`<br> `navBackColor: navbar-default`<br> `navBrandColor: brand-default`<br> `navBackImage: false`<br> `rtlLayout: false`<br> `navFixedLayout: true`<br> `headerFixedLayout: false`<br> `boxLayout: false`<br> `navDropdownIcon: style1`<br> `navListIcon: style1`<br> `navActiveListColor: sctive-default`<br> `navListTitleColor: title-default`<br> `navListTitleHide: false`                                                                                                                                                                                                                                                                                                                                                            |
| **Horizontal**             | `layout: horizontal`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Pre Build Layout 2**     | `layout: vertical`<br> `preLayout: layout-2`<br> `configBlock: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Pre Build Layout 2-2**   | `layout: vertical`<br> `preLayout: layout-2-2`<br> `configBlock: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Pre Build Layout 3**     | `layout: vertical`<br> `preLayout: layout-3`<br> `configBlock: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Pre Build Layout 4**     | `layout: vertical`<br> `preLayout: layout-4`<br> `configBlock: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Pre Build Layout 4-2**   | `layout: vertical`<br> `preLayout: layout-4-2`<br> `configBlock: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Pre Build Layout 5h**    | `layout: horizontal`<br> `collapseMenu: false`<br> `layoutType: menu-light`<br> `navIconColor: true`<br> `headerBackColor: header-blue`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Pre Build Layout 6**     | `layout: vertical`<br> `preLayout: layout-6`<br> `layoutType: menu-light`<br> `navBrandColor: brand-lightblue`<br> `navFixedLayout: false`<br> `headerFixedLayout: false`<br> `layout6Background: #23b7e5`<br> `layout6BackSize: auto or cover`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Pre Build Layout 8**     | `layout: vertical`<br> `preLayout: layout-8`<br> `layoutType: menu-light`<br> `headerBackColor: header-lightblue`<br> `navBrandColor: brand-lightblue`<br> `navFixedLayout: true`<br> `headerFixedLayout: true`<br> `navActiveListColor: active-lightblue`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Static Layout**          | `layout: vertical`<br> `navFixedLayout: false`<br> `headerFixedLayout: false`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Fixed Layout**           | `layout: vertical`<br> `navFixedLayout: true`<br> `headerFixedLayout: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Navbar Fixed Layout**    | `layout: vertical`<br> `navFixedLayout: true`<br> `headerFixedLayout: false`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Collapse Menu Layout**   | `layout: vertical`<br> `collapseMenu: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Box Layout**             | `layout: vertical`<br> `boxLayout: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **RTL Layout**             | `layout: vertical`<br> `rtlLayout: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Light Layout**           | `layout: vertical`<br> `layoutType: menu-light`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Dark Layout**            | `layout: vertical`<br> `layoutType: dark`<br> `navBackColor: navbar-dark`<br> `navBrandColor: brand-dark`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Color Icon**             | `layout: vertical`<br> `navListTitleColor: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## 11. Configuration du Thème/Style

### Arrière-plan de l'en-tête (Header Background)

| Option             | Configuration dans `src\config\constant.js`                                |
| :----------------- | :------------------------------------------------------------------------- |
| **DEFAULT**        | ```javascript export const CONFIG = { 'headerBackColor': 'header-default' } ``` |
| **BLUE**           | ```javascript export const CONFIG = { 'headerBackColor': 'header-blue' } ```    |
| **RED**            | ```javascript export const CONFIG = { 'headerBackColor': 'header-red' } ```     |
| **PURPLE**         | ```javascript export const CONFIG = { 'headerBackColor': 'header-purple' } ```  |
| **LIGHTBLUE**      | ```javascript export const CONFIG = { 'headerBackColor': 'header-lightblue' } ``` |
| **DARK**           | ```javascript export const CONFIG = { 'headerBackColor': 'header-dark' } ```    |

### Arrière-plan du menu (Menu Background)

| Option             | Configuration dans `src\config\constant.js`                                |
| :----------------- | :------------------------------------------------------------------------- |
| **DEFAULT**        | ```javascript export const CONFIG = { 'navBackColor': 'navbar-default' } ``` |
| **BLUE**           | ```javascript export const CONFIG = { 'navBackColor': 'navbar-blue' } ```    |
| **RED**            | ```javascript export const CONFIG = { 'navBackColor': 'navbar-red' } ```     |
| **PURPLE**         | ```javascript export const CONFIG = { 'navBackColor': 'navbar-purple' } ```  |
| **LIGHTBLUE**      | ```javascript export const CONFIG = { 'navBackColor': 'navbar-lightblue' } ``` |
| **DARK**           | ```javascript export const CONFIG = { 'navBackColor': 'navbar-dark' } ```    |

### Image d'arrière-plan du menu (Menu Background Image)

| Option             | Configuration dans `src\config\constant.js`                                |
| :----------------- | :------------------------------------------------------------------------- |
| **DEFAULT**        | ```javascript export const CONFIG = { 'navBackImage': false } ```        |
| **IMAGE 1**        | ```javascript export const CONFIG = { 'navBackImage': 'navbar-image-1' } ``` |
| **IMAGE 2**        | ```javascript export const CONFIG = { 'navBackImage': 'navbar-image-2' } ``` |
| **IMAGE 3**        | ```javascript export const CONFIG = { 'navBackImage': 'navbar-image-3' } ``` |
| **IMAGE 4**        | ```javascript export const CONFIG = { 'navBackImage': 'navbar-image-4' } ``` |
| **IMAGE 5**        | ```javascript export CONFIG = { 'navBackImage': 'navbar-image-5' } ``` |

### Arrière-plan de l'élément de menu actif (Menu Active Item Background)

| Option             | Configuration dans `src\config\constant.js`                                   |
| :----------------- | :---------------------------------------------------------------------------- |
| **DEFAULT**        | ```javascript export const CONFIG = { 'navActiveListColor': 'active-default' } ``` |
| **BLUE**           | ```javascript export const CONFIG = { 'navActiveListColor': 'active-blue' } ```    |
| **RED**            | ```javascript export const CONFIG = { 'navActiveListColor': 'active-red' } ```     |
| **PURPLE**         | ```javascript export const CONFIG = { 'navActiveListColor': 'active-purple' } ```  |
| **LIGHTBLUE**      | ```javascript export const CONFIG = { 'navActiveListColor': 'active-lightblue' } ``` |
| **DARK**           | ```javascript export const CONFIG = { 'navActiveListColor': 'active-dark' } ```    |

### Couleur du titre du menu (Menu Caption/Title Color)

| Option             | Configuration dans `src\config\constant.js`                                   |
| :----------------- | :---------------------------------------------------------------------------- |
| **DEFAULT**        | ```javascript export const CONFIG = { 'navListTitleColor': 'title-default' } ``` |
| **BLUE**           | ```javascript export const CONFIG = { 'navListTitleColor': 'title-blue' } ```    |
| **RED**            | ```javascript export const CONFIG = { 'navListTitleColor': 'title-red' } ```     |
| **PURPLE**         | ```javascript export const CONFIG = { 'navListTitleColor': 'title-purple' } ```  |
| **LIGHTBLUE**      | ```javascript export const CONFIG = { 'navListTitleColor': 'title-lightblue' } ``` |
| **DARK**           | ```javascript export const CONFIG = { 'navListTitleColor': 'title-dark' } ```    |

## 12. Intégration

Après des années d'expérience dans la création de templates, les développeurs constatent que les utilisateurs sont souvent confus sur la façon d'utiliser les composants avec la plupart des templates d'administration. Des questions telles que :
*   "Comment puis-je utiliser les composants dans le projet ?"
*   "Comment puis-je créer un nouveau projet et configurer le thème/les composants ?"
*   "Puis-je avoir une base de code minimale pour commencer ?"

Datta Able est structuré avec un vaste ensemble de composants prêts à l'emploi. Il vise à fournir autant de composants personnalisables que possible pour une intégration directe dans vos projets.

Ce guide d'intégration explique comment créer un nouveau projet avec une configuration minimale et intégrer certains composants selon vos besoins. Il existe deux façons de démarrer avec une configuration minimale, détaillées dans le chapitre suivant (la version "Seed").

## 13. Version "Seed"

La version "Seed" est le point de départ idéal pour tout nouveau projet React. Si vous maîtrisez bien React, Seed est la version parfaite pour vous.

### Démarrer avec la version Seed

Seed est une structure de dossier créée avec Vite, contenant un minimum de fichiers de la version complète pour vous aider à démarrer. Toutes les dépendances inutilisées sont supprimées de `package.json`, contrairement à la version "skeleton" qui contient le même paquet que la version complète. Tous les fichiers et références inutilisés (routes, sections, contextes, API, données, etc.) ont été supprimés. Vous pouvez vérifier la différence entre "skeleton" et "seed" à la page suivante (voir [Comparaison](#14-comparaison)). La version Seed est conçue pour ceux qui veulent simplement un thème et qui souhaitent ensuite implémenter leurs propres fonctionnalités.

La version Seed n'est disponible qu'après l'achat d'un thème.
Lorsque vous exécutez le projet en utilisant `yarn` ou `npm`, vous verrez un site minimal. Elle fournit une structure très simple et intuitive pour démarrer un nouveau projet. Vous pouvez ajouter de nouveaux composants à partir de la version complète.

### Ajouter des composants au projet "skeleton" ou un nouveau projet

Ajoutons maintenant quelques composants sympas de la version complète au projet que vous venez de créer. Cela vous aidera à concevoir vos pages selon vos besoins.

Considérons un scénario où vous souhaitez ajouter le widget **Total Users** (carte de gauche sur le tableau de bord analytique) de la version complète à la page d'exemple. Pour cela, vous devez effectuer les opérations suivantes dans l'ordre :

1.  Copiez le code suivant et remplacez-le avec le contenu de `sample-page` :
    ```javascript
    import React from 'react';
    import { Row, Col, Card } from 'react-bootstrap';

    const SamplePage = () => {
        return (
            <React.Fragment>
                <Row>
                    <Col xl={6} xxl={4}>
                        <Card className="widget-focus">
                            <Card.Body>
                                <h6 className="mb-4">Daily Sales</h6>
                                <div className="row d-flex align-items-center">
                                    <div className="col-9">
                                        <h3 className="f-w-300 d-flex align-items-center m-b-0">
                                            <i className="feather icon-arrow-up text-c-green f-30 m-r-5" /> $249.95
                                        </h3>
                                    </div>
                                    <div className="col-3 text-end">
                                        <p className="m-b-0">50%</p>
                                    </div>
                                </div>
                                <div className="progress m-t-30" style={{ height: '7px' }}>
                                    <div
                                        className="progress-bar progress-c-theme"
                                        role="progressbar"
                                        style={{ width: '50%' }}
                                        aria-valuenow="50"
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                    />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </React.Fragment>
        );
    };

    export default SamplePage;
    ```
    Cela produira le site comme ci-dessous :
    *(L'image n'est pas fournie dans le texte source, donc cette phrase reste descriptive.)*
2.  Allez dans la version complète, trouvez le composant et copiez-le de la version complète vers "skeleton". C'est tout.

C'est simple et direct, n'est-ce pas ?
Vous pouvez faire de même pour d'autres composants et concevoir vos pages selon vos besoins. Des contrôles communs et réutilisables sont disponibles dans `/src/components`. N'hésitez pas à les consulter également et à commencer à développer votre page.

## 14. Comparaison

Pour comprendre les trois paquets (Full-version, Skeleton et Seed), veuillez consulter la comparaison suivante. Les éléments en gras indiquent la différence pour la version **Seed** par rapport aux autres.

| Caractéristique/Paquet | Seed                                 |
| :--------------------- | :----------------------------------- |
| Packages               | **Removed unused**                   |
| Views/Pages            | **Removed unused**                   |
| Routes                 | **Removed unused**                   |
| References             | **Removed unused**                   |
| Components             | Some Files Same as full-version      |
| Contexts               | **Removed unused**                   |
| Customizer             | **Removed**                          |
| Data (Fake)            | **Removed**                          |
| Layout                 | **Removed unused**                   |
| Menu items             | **Removed unused**                   |
| Authentications        | **Removed unused**                   |
| Store                  | **Removed unused**                   |

## 15. Dépendances

### Dépendances NPM

| Package Name                      | Version  |
| :-------------------------------- | :------- |
| `@amcharts/amcharts5`             | 5.9.1    |
| `@amcharts/amcharts5-geodata`     | 5.1.2    |
| `@auth0/auth0-spa-js`             | 2.1.3    |
| `@ckeditor/ckeditor5-build-balloon` | 41.3.0   |
| `@ckeditor/ckeditor5-build-classic` | 41.3.0   |
| `@ckeditor/ckeditor5-build-decoupled-document` | 41.3.0   |
| `@ckeditor/ckeditor5-build-inline` | 41.3.0   |
| `@ckeditor/ckeditor5-react`       | 6.2.0    |
| `@fullcalendar/core`              | 6.1.11   |
| `@fullcalendar/daygrid`           | 6.1.11   |
| `@fullcalendar/interaction`       | 6.1.11   |
| `@fullcalendar/react`             | 6.1.11   |
| `@fullcalendar/timegrid`          | 6.1.11   |
| `@originjs/vite-plugin-commonjs`  | 1.0.3    |
| `@react-google-maps/api`          | 2.19.3   |
| `@tanem/react-nprogress`          | 5.0.51   |
| `@testing-library/jest-dom`       | 6.4.2    |
| `@testing-library/react`          | 15.0.2   |
| `@testing-library/user-event`     | 14.5.2   |
| `@vitejs/plugin-react`            | 4.2.1    |
| `apexcharts`                      | 3.48.0   |
| `aphrodite`                       | 2.4.0    |
| `axios`                           | 1.6.8    |
| `axios-mock-adapter`              | 1.22.0   |
| `bootstrap`                       | 5.3.3    |
| `chance`                          | 1.1.11   |
| `chart.js`                        | 4.4.2    |
| `chroma-js`                       | 2.4.2    |
| `cropperjs`                       | 1.6.1    |
| `d3`                              | 7.9.0    |
| `deni-react-treeview`             | 1.1.11   |
| `echarts`                         | 5.5.0    |
| `echarts-for-react`               | 3.0.2    |
| `firebase`                        | 10.11.0  |
| `formik`                          | 2.4.5    |
| `highcharts`                      | 11.4.1   |
| `highcharts-react-official`       | 3.2.1    |
| `history`                         | 5.3.0    |
| `install`                         | 0.13.0   |
| `jodit`                           | 4.1.16   |
| `jodit-react`                     | 4.0.25   |
| `jquery`                          | 3.7.1    |
| `jsonwebtoken`                    | 9.0.2    |
| `jwt-decode`                      | 4.0.0    |
| `match-sorter`                    | 6.3.4    |
| `moment`                          | 2.30.1   |
| `nib-core`                        | 2.7.16   |
| `pnotify`                         | 5.2.0    |
| `prism-react-renderer`            | 2.3.1    |
| `process`                         | 0.11.10  |
| `rc-slider`                       | 10.5.0   |
| `rc-tooltip`                      | 6.2.0    |
| `react`                           | 18.2.0   |
| `react-accessible-treeview`       | 2.8.3    |
| `react-animated-tree`             | 1.0.10   |
| `react-apexcharts`                | 1.4.1    |
| `react-app-polyfill`              | 3.0.0    |
| `react-bootstrap`                 | 2.10.2   |
| `react-chartjs-2`                 | 5.2.0    |
| `react-color`                     | 2.19.3   |
| `react-compound-timer`            | 2.0.5    |
| `react-copy-to-clipboard`         | 5.1.0    |
| `react-cropper`                   | 2.3.3    |
| `react-datepicker`                | 6.8.0    |
| `react-datetime`                  | 3.2.0    |
| `react-dom`                       | 18.2.0   |
| `react-dropzone-component`        | 3.2.0    |
| `react-dual-listbox`              | 6.0.3    |
| `react-dynamic-stepper`           | 1.0.3    |
| `react-flot`                      | 1.3.0    |
| `react-google-charts`             | 4.0.1    |
| `react-grid-gallery`              | 1.0.1-alpha.0 |
| `react-hook-form`                 | 7.51.3   |
| `react-hot-toast`                 | 2.4.1    |
| `react-icons`                     | 5.0.1    |
| `react-input-mask`                | 2.0.4    |
| `react-intl`                      | 6.6.5    |
| `react-joyride`                   | 2.8.1    |
| `react-jvectormap`                | 0.0.16   |
| `react-multistep`                 | 5.5.9    |
| `react-nestable`                  | 3.0.2    |
| `react-number-format`             | 5.3.4    |
| `react-perfect-scrollbar`         | 1.5.8    |
| `react-photo-album`               | 2.3.1    |
| `react-rating`                    | 2.0.5    |
| `react-responsive-carousel`       | 3.2.23   |
| `react-responsive-modal`          | 6.4.2    |
| `react-router-dom`                | 6.22.3   |
| `react-select`                    | 5.8.0    |
| `react-slick`                     | 0.30.2   |
| `react-table`                     | 7.8.0    |
| `react-tag-autocomplete`          | 7.2.0    |
| `react-to-print`                  | 2.15.1   |
| `react-trello`                    | 2.2.11   |
| `react-useinterval`               | 1.0.2    |
| `reactour`                        | 1.19.3   |
| `recharts`                        | 2.12.5   |
| `rodal`                           | 2.1.0    |
| `slick-carousel`                  | 1.8.1    |
| `sweetalert2`                     | 11.10.7  |
| `sweetalert2-react-content`       | 5.0.7    |
| `vite`                            | 5.2.0    |
| `vite-jsconfig-paths`             | 2.0.1    |
| `web-vitals`                      | 3.5.2    |
| `yet-another-react-lightbox`      | 3.17.3   |
| `yup`                             | 1.4.0    |

### Dépendances de Développement

| Package Name                            | Version |
| :-------------------------------------- | :------ |
| `@babel/core`                           | 7.24.1  |
| `@babel/eslint-parser`                  | 7.24.1  |
| `@babel/plugin-proposal-private-property-in-object` | 7.21.11 |
| `@babel/preset-react`                   | 7.24.1  |
| `@pnotify/confirm`                      | 5.2.0   |
| `@pnotify/core`                         | 5.2.0   |
| `@pnotify/desktop`                      | 5.2.0   |
| `env-cmd`                               | 10.1.0  |
| `eslint`                                | 8.57.0  |
| `eslint-config-prettier`                | 9.1.0   |
| `eslint-config-react-app`               | 7.0.1   |
| `eslint-plugin-flowtype`                | 8.0.3   |
| `eslint-plugin-import`                  | 2.29.1  |
| `eslint-plugin-jsx-a11y`                | 6.8.0   |
| `eslint-plugin-prettier`                | 4.2.1   |
| `eslint-plugin-react`                   | 7.34.1  |
| `eslint-plugin-react-hooks`             | 4.6.0   |
| `immutable`                             | 4.3.5   |
| `prettier`                              | 3.2.5   |
| `react-error-overlay`                   | 6.0.11  |
| `sass`                                  | 1.75.0  |

## 16. Support

Veuillez noter que notre support est limité uniquement aux personnes ayant acheté notre article.
Nous faisons de notre mieux pour que Datta Able fonctionne comme il se doit (c'est-à-dire comme le site de démonstration). Cependant, nous ne pouvons PAS fournir de personnalisation sur le thème. Merci beaucoup !

### Avant de soumettre un ticket

*   Assurez-vous que vous utilisez la dernière version du thème.
*   Assurez-vous d'avoir examiné attentivement la documentation du thème et d'avoir cherché des tickets publics au cas où quelqu'un d'autre aurait déjà posé la même question.
*   Veuillez regarder les vidéos d'introduction au template, de structure de dossiers et de personnalisation pour voir si vous trouvez la réponse.

### Lors de la soumission du ticket

*   Veuillez être aussi précis que possible lors de la création d'un nouveau ticket. Il nous est très utile d'identifier la cause de votre problème si vous fournissez un lien vers votre site, une capture d'écran de votre message d'erreur, un extrait de code, ou tout cela à la fois.

### Après la soumission du ticket

*   Normalement, nous répondrons aux clients dans les 12 à 24 heures les jours ouvrables.
*   Les tickets seront traités par ordre d'arrivée, sur la base du premier arrivé, premier servi.

Veuillez soumettre votre ticket à [https://codedthemes.support-hub.io/tickets](https://codedthemes.support-hub.io/tickets). Nous serions ravis de vous entendre à tout moment.

## 17. Journal des Modifications (Changelog)

Ce journal des modifications définit les changements.

*   **v18.2.1 - (19-06-2024)**
    *   Suppression de `react-app-polyfill` pour résoudre un problème de compilation.
*   **v18.2.0 - (14-06-2024)**
    *   Migration vers Vite
    *   Mises à jour des chemins d'image
    *   Mises à jour des chemins de police
    *   Redux supprimé
    *   Yarn v4 défini
    *   Mises à niveau des paquets
    *   Erreurs de console corrigées
    *   Ajout de la multi-langue
    *   Ajout du widget de focus au survol
    *   Ajout de commentaires d'importation et du titre de la page
    *   Corrections de bugs
    *   Corrections de bugs en mode sombre
    *   Légende du graphique corrigée en mode RTL
*   **v18.0.0 - (29-09-2023)**
    *   Mise à niveau du paquet vers React 18
    *   Autres mises à niveau de paquets
    *   Corrections de conception mineures
*   **v17.2.0 - (26-06-2023)**
    *   Mise à niveau des paquets
    *   Prettier et Eslint définis
    *   Le fournisseur d'authentification JWT est défini comme connexion par défaut
    *   Mises à jour `.env`
    *   Ajout de la version Seed
    *   Corrections de bugs
    *   Contexte d'authentification corrigé
    *   URL de documentation corrigée
*   **v1.0.0 - (09-01-2019)**
    *   Première version

---