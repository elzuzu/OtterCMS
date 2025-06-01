import React, { useState } from 'react';
import DattaPageTitle from './common/DattaPageTitle';
import DattaCard from './common/DattaCard';
import DattaButton from './common/DattaButton';
import DattaModal from './common/DattaModal';
import DattaEmptyState from './common/DattaEmptyState';

const AdminCategoriesDatta = () => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');

  const handleAdd = e => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const newCat = { id: Date.now(), nom: newCategoryName.trim() };
    setCategories([...categories, newCat]);
    setNewCategoryName('');
  };

  const openEdit = cat => {
    setEditingCategory(cat);
    setEditName(cat.nom);
    setIsEditOpen(true);
  };

  const saveEdit = e => {
    e.preventDefault();
    setCategories(categories.map(c => (c.id === editingCategory.id ? { ...c, nom: editName } : c)));
    setIsEditOpen(false);
  };

  const removeCat = id => setCategories(categories.filter(c => c.id !== id));

  return (
    <div className="pc-content">
      <DattaPageTitle title="Gestion des Catégories" />
      <div className="row">
        <div className="col-lg-4 col-md-12">
          <DattaCard title="Ajouter une Nouvelle Catégorie">
            <form onSubmit={handleAdd}>
              <div className="mb-3">
                <label htmlFor="catName" className="form-label">Nom</label>
                <input id="catName" className="form-control" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
              </div>
              <DattaButton type="submit" variant="primary" icon="ti ti-plus">Ajouter</DattaButton>
            </form>
          </DattaCard>
        </div>
        <div className="col-lg-8 col-md-12">
          <DattaCard title={`Catégories Existantes (${categories.length})`}>
            {categories.length === 0 ? (
              <DattaEmptyState message="Aucune catégorie" />
            ) : (
              <ul className="list-group list-group-flush">
                {categories.map(cat => (
                  <li key={cat.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>{cat.nom}</span>
                    <div>
                      <DattaButton variant="light-primary" size="sm" className="me-2" title="Modifier" onClick={() => openEdit(cat)}>
                        <i className="ti ti-edit" />
                      </DattaButton>
                      <DattaButton variant="light-danger" size="sm" title="Supprimer" onClick={() => removeCat(cat.id)}>
                        <i className="ti ti-trash" />
                      </DattaButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DattaCard>
        </div>
      </div>
      {isEditOpen && (
        <DattaModal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier la Catégorie">
          <form onSubmit={saveEdit}>
            <div className="mb-3">
              <label htmlFor="editName" className="form-label">Nom</label>
              <input id="editName" className="form-control" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="text-end">
              <DattaButton type="button" variant="light" onClick={() => setIsEditOpen(false)} className="me-2">Annuler</DattaButton>
              <DattaButton type="submit" variant="primary">Enregistrer</DattaButton>
            </div>
          </form>
        </DattaModal>
      )}
    </div>
  );
};

export default AdminCategoriesDatta;
