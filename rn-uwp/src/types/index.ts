export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'user';
  windows_login?: string;
}

export interface Category {
  id: number;
  nom: string;
  champs: Field[];
  ordre: number;
  deleted: number;
}

export interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'list' | 'checkbox';
  obligatoire: boolean;
  visible: boolean;
  readonly: boolean;
  afficherEnTete: boolean;
  options?: string[];
  maxLength?: number;
  ordre: number;
}

export interface Individu {
  id: number;
  numero_unique: string;
  en_charge?: number;
  en_charge_username?: string;
  categorie_id?: number;
  categorie_nom?: string;
  champs_supplementaires: Record<string, any>;
  deleted: number;
}

export interface DashboardStats {
  totalIndividus: number;
  mesIndividus: number;
  individusNonAttribues: number;
  totalCategories: number;
  totalUsers: number;
}

export interface AuditEntry {
  id: number;
  individu_id: number;
  champ: string;
  ancienne_valeur: string;
  nouvelle_valeur: string;
  utilisateur_id: number;
  utilisateur_username?: string;
  date_modif: string;
  action: string;
  fichier_import?: string;
}
