Application Electron Node.js Modulaire**

### Objectif

Développer une application Electron Node.js modulaire dédiée à Windows 10/11, facilitant le suivi personnalisable et collaboratif d'individus. L'application doit être réutilisable facilement dans divers contextes, avec gestion intuitive depuis une interface utilisateur moderne.

### Spécifications techniques à implémenter par Codex :

**1. Structure Electron Node.js**

* Utiliser Electron pour créer une application desktop autonome compatible Windows.
* Initialiser l’application avec Electron Forge ou Electron Builder.

**2. Gestion des droits utilisateurs :**

* Mettre en place trois niveaux de droits via une authentification sécurisée (identifiants chiffrés stockés localement) :

  * **Admin :** accès complet à tous les paramètres et données.
  * **Manager :** possibilité d'attribuer et gérer les données des utilisateurs.
  * **Utilisateur :** accès limité aux données spécifiquement assignées.
* Possibilité de rattacher un compte à un login Windows local (sans le domaine) pour une connexion automatique.

**3. Base de données :**

* Implémenter SQLite ou similaire pour stockage réseau (fichier partagé sur réseau).
* Utiliser un fichier de configuration JSON pour définir dynamiquement le chemin réseau vers la base de données (patch configurable).
* Gérer les conflits multi-utilisateurs avec mécanismes simples de verrouillage ou gestion transactionnelle des accès concurrents.

**4. Interface Utilisateur Moderne et Modulaire :**

* Navigation principale comprenant :

  * **Dashboard d'accueil :** affichage rapide des statistiques et des tâches urgentes.
  * **Gestion des Individus :** vue en liste avec filtres et recherche dynamique, détails individuels via une fiche modulaire.
  * **Administration des Catégories et Champs :** interface dynamique pour créer, modifier et masquer des champs ou catégories.
  * **Importation et Attribution :** gestion intuitive des imports CSV/Excel et attributions massives via une interface visuelle moderne.
  * **Paramètres Utilisateurs et Profils :** gestion des droits et association login Windows.
* Interface utilisant des composants modernes (React, Vue.js, Angular) pour une expérience fluide et ergonomique.
* Implémenter une gestion de suppression logique permettant de masquer temporairement ou définitivement des champs sans suppression physique.

**7. Historisation visuelle des valeurs :**

* Nouveau type de champ **Historique numérique** permettant de stocker plusieurs paires {date, valeur}.
* Saisie dynamique via l'interface et import possible en fournissant un tableau JSON.
* Affichage en fiche individuelle sous forme de tableau et de courbe pour une lecture rapide de l'évolution.

**5. Schéma de données obligatoire :**

* Numéro d'individu unique (type entier).
* Attribution à un utilisateur (« en charge » obligatoire).

**6. Importation et attribution de masse :**

* Fonctionnalité d'import CSV/Excel avec mapping interactif des colonnes et sauvegarde sous forme de templates JSON.
* Interface intuitive pour attribution massive selon critères définis par l’utilisateur avec sauvegarde et réutilisation des critères.

### Livrables attendus :

Voici un guide pour compiler votre application Electron et la rendre transportable pour Windows, en utilisant PowerShell.

Votre projet utilise Electron Forge, qui simplifie grandement ce processus.

### Guide de Compilation pour Windows (Application Transportable)

Ce guide vous expliquera comment utiliser les commandes définies dans votre `package.json` et configurées dans `forge.config.js` pour créer une version distribuable de votre application pour Windows.

**Prérequis :**

1.  **Node.js et npm installés :** Assurez-vous d'avoir Node.js (qui inclut npm) installé sur votre machine.
2.  **Dépendances du projet installées :** Si ce n'est pas déjà fait, ouvrez PowerShell à la racine de votre projet et exécutez :
    ```powershell
    npm install
    ```

**Étapes de compilation :**

1.  **Ouvrir PowerShell :**
    Naviguez jusqu'au répertoire racine de votre projet Electron dans une fenêtre PowerShell.

2.  **Lancer la commande de compilation :**
    Votre `package.json` contient un script `make` qui utilise Electron Forge pour construire l'application. Pour l'exécuter, tapez la commande suivante dans PowerShell :

    ```powershell
    npm run make
    ```

    Cette commande va utiliser la configuration spécifiée dans votre fichier `forge.config.js` pour créer les paquets pour les plateformes cibles.

3.  **Attendre la fin du processus :**
    Electron Forge va maintenant empaqueter votre application. Cela peut prendre plusieurs minutes en fonction de la taille de votre projet et des performances de votre machine. Vous verrez de nombreuses informations s'afficher dans la console pendant le processus.

4.  **Localiser les fichiers compilés :**
    Une fois la commande terminée avec succès, les versions compilées de votre application se trouveront dans un nouveau dossier nommé `out` à la racine de votre projet.

5.  **Choisir la version transportable :**
    Votre configuration `forge.config.js` est paramétrée pour générer plusieurs types de paquets, notamment :

      * Un installateur Squirrel (`@electron-forge/maker-squirrel`)
      * Une archive ZIP (`@electron-forge/maker-zip`) spécifiquement pour Windows (`win32`)

    Pour une **application transportable** (souvent appelée "portable"), l'archive **ZIP** est généralement le meilleur choix.

      * Cherchez dans le dossier `out/make/zip/win32/...` (le chemin exact peut légèrement varier en fonction de l'architecture, par exemple `ia32` ou `x64`).
      * Vous y trouverez un fichier `.zip` contenant votre application.

6.  **Utiliser l'application transportable :**

      * Décompressez ce fichier `.zip` où vous le souhaitez sur un ordinateur Windows.
      * À l'intérieur du dossier décompressé, vous trouverez l'exécutable de votre application (par exemple, `indi-suivi-nodejs.exe` ou le nom spécifié dans votre `forge.config.js` sous `packagerConfig.name` ou `makers.config.name`).
      * Vous pouvez lancer cet exécutable directement sans avoir besoin d'installer l'application. L'ensemble du dossier décompressé est nécessaire au fonctionnement de l'application.

**Configuration de l'icône :**

Votre fichier `forge.config.js` spécifie déjà une icône pour l'application : `icon: "src/assets/app-icon.ico"` dans `packagerConfig`. Cette icône devrait être utilisée pour l'exécutable généré. Assurez-vous que ce fichier existe bien à cet emplacement.

**En résumé, dans PowerShell :**

```powershell
# Naviguez vers le dossier de votre projet
cd chemin\vers\votre\projet

# Installez les dépendances (si pas déjà fait)
npm install

# Lancez la compilation
npm run make

# Explorez le dossier "out" pour trouver votre .zip
# Généralement dans out\make\zip\win32\...
```

C'est tout \! Vous avez maintenant une version de votre application que vous pouvez facilement transporter et exécuter sur d'autres machines Windows sans installation préalable.