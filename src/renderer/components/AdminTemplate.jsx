import React from 'react';
import DattaPageTitle from './common/DattaPageTitle';
import BorderTemplateAdmin from './common/BorderTemplateAdmin';

export default function AdminTemplate({ user }) {
  // L'ancienne gestion des thèmes couleur a été retirée

  return (
    <div className="pc-content">
      <DattaPageTitle title="Configuration des Templates" />
      {/* La sélection de thème a été supprimée */}
      <BorderTemplateAdmin user={user} />
    </div>
  );
}
