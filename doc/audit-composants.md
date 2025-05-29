# Audit des composants React

Ce document liste les composants qui n'utilisent pas encore entièrement les classes ou wrappers fournis par le thème **Datta Able**.

## Composants identifiés

- **AdminUsers.jsx** : utilise `ui-card`, `ui-card-header`, `ui-card-body`, `admin-panel`, `panel-title`, `form-group`, `btn-icon`.
- **UserSettings.jsx** : `ui-card`, `ui-card-header`, `ui-card-body`, `form-group`, MUI `Box` et `Typography`.
- **AdminRoles.jsx** : `admin-panel`, `panel-title`, `form-group`, `btn-icon`.
- **AdminCategories.jsx** : `btn-icon`, `form-group`.
- **IndividuFiche.jsx** : `button-primary`, `button-secondary`, `form-group`, `form-input-readonly`.
- **ImportData.jsx** : `admin-panel` et composant `Stepper` de MUI.
- **MassAttribution.jsx** : composant `Stepper` de MUI.
- **NouvelIndividu.jsx** : composant `Tabs` de MUI ainsi que `Box` et `Typography`.
- **IndividusList.jsx** : wrapper `content-container`.
- **layout/PageWrapper.jsx** : utilise `Box` de MUI.

## Classes custom à remplacer

- `.ui-card` → `.card`
- `.ui-card-header` → `.card-header`
- `.ui-card-body` → `.card-body`
- `.button-primary` → `.btn btn-primary`
- `.button-secondary` → `.btn btn-secondary`
- `.btn-icon` → `.btn`
- `.admin-panel` → `.card`
- `.panel-title` → `.card-header h5`
- `.content-container` → structure Datta standard
- `.form-group` → `.mb-3`
- `.form-input-readonly` → `.form-control[readonly]`

## Composants MUI à wrapper ou remplacer

- `Box` et `Typography` → éléments HTML avec classes Datta.
- `Tabs`/`Tab` → nouveau composant `DattaTabs`.
- `Stepper`/`Step`/`StepLabel` → nouveau composant `DattaStepper`.

Ces éléments devront être migrés progressivement pour assurer la compatibilité complète avec Datta Able.
