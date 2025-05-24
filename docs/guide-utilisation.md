# Guide d'utilisation

Ce guide explique les étapes principales pour prendre en main l'application **Indi-Suivi**.

## Premier lancement

1. Exécutez l'application générée après l'installation ou le packaging.
2. Connectez-vous avec le compte administrateur initial :
   - **Utilisateur** : `admin`
   - **Mot de passe** : `admin`
   Changez ce mot de passe lors de la première utilisation.

## Gestion des utilisateurs et des rôles

- Les rôles prédéfinis `admin`, `manager` et `user` possèdent des droits différents.
- Depuis l'onglet **Utilisateurs**, ajoutez de nouveaux comptes et assignez-leur un rôle.
- Vous pouvez associer un compte au login Windows local pour une connexion automatique.

## Création des catégories

Reportez-vous au [guide d'administration](guide-administration.md) pour définir des catégories et des champs dynamiques adaptés à votre contexte.

## Ajout d'individus

1. Choisissez la catégorie dans laquelle enregistrer la personne.
2. Remplissez les champs obligatoires et facultatifs. Les champs dynamiques sont calculés automatiquement.
3. Validez pour créer l'enregistrement. Un audit est généré à chaque modification.

## Import de données

L'application prend en charge l'import de fichiers CSV ou Excel. Utilisez le modèle disponible dans l'interface pour vous assurer que les colonnes sont correctes.

## Tableau de bord et rapports

Le tableau de bord affiche un résumé des statistiques ainsi que l'historique des actions récentes. Vous pouvez filtrer les données par catégorie ou par responsable.

