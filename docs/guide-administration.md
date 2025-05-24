# Guide d'administration

## Gérer les catégories

Cette section explique comment créer et configurer des catégories pour les individus. Chaque catégorie peut contenir plusieurs **champs** de différents types (texte, nombre, date, liste déroulante, case à cocher, etc.). Les champs permettent de décrire finement les individus suivis.

### Ajouter une catégorie

1. Accédez à l'onglet **Gérer les catégories** depuis la barre latérale.
2. Cliquez sur **Ajouter une catégorie**.
3. Saisissez un nom et un ordre d'affichage (optionnel).
4. Ajoutez les champs nécessaires en précisant leur type, leur clé et leurs options (obligatoire, visible, lecture seule...).
5. Validez pour enregistrer la catégorie.

### Modifier ou masquer une catégorie

- Utilisez les boutons **Éditer** et **Masquer** à droite de chaque catégorie pour mettre à jour ou masquer la catégorie sélectionnée.

### Champs disponibles

Par défaut, plusieurs types de champs sont proposés :

- **Texte** : chaîne de caractères libre avec longueur maximale optionnelle.
- **Nombre** : valeur numérique entière.
- **Date** : sélection de date au format calendrier.
- **Liste déroulante** : choix parmi plusieurs options prédéfinies.
- **Case à cocher** : valeur booléenne (oui/non).

### Nouveau : Champ dynamique

Il est désormais possible d'ajouter un **champ dynamique**. Ce type de champ affiche une valeur calculée à partir d'autres champs de la catégorie. Vous pouvez définir une petite expression conditionnelle, par exemple :

```
if {champ1} > 0 then "Actif" else "Inactif"
```

Lors de la saisie ou de la consultation d'un individu, le champ dynamique affichera automatiquement le résultat de l'expression. Les champs dynamiques peuvent être triés et utilisés dans les listes comme les autres champs.

Pour créer un champ dynamique :

1. Dans la fenêtre d'édition d'une catégorie, cliquez sur **Ajouter un champ**.
2. Sélectionnez le type **Dynamique**.
3. Saisissez l'expression à évaluer dans le champ **Formule** (les autres champs de la catégorie sont référencés par leur clé entre accolades).
4. Définissez les options habituelles (ordre, visibilité, etc.), puis enregistrez.

Ainsi, les champs dynamiques enrichissent la description des individus sans saisie supplémentaire de la part des utilisateurs.
