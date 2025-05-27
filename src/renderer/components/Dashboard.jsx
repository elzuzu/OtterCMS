import React, { useEffect, useState, useCallback } from 'react';
import { CardContent, CardActions, Button, Grid, Typography } from '@mui/material';
import DattaCard from './common/DattaCard';
import DattaPageTitle from './common/DattaPageTitle';
import CircularProgress from './common/CircularProgress';
import { IconFolder, IconUsers, IconUserCheck, IconUserX } from '@tabler/icons-react';

export default function Dashboard({ user, onNavigateToMyIndividus, onNavigateToAllIndividus }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Styles kept for backward compatibility although not heavily used
  const valueStyle = {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: 'var(--color-primary-600)',
    lineHeight: '1.2',
    marginBottom: 'var(--spacing-1)',
    textAlign: 'center',
  };
  const labelStyle = {
    fontSize: '0.8rem',
    color: 'var(--text-color-secondary)',
    textAlign: 'center',
    minHeight: '2em',
  };

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user || (!user.id && !user.userId)) {
      setError('Utilisateur invalide. Impossible de charger les statistiques.');
      setLoading(false);
      return;
    }
    const params = { userId: user.id || user.userId, role: user.role };
    try {
      const result = await window.api.getDashboardStats(params);
      if (result && result.success && result.data) {
        setStats(result.data);
      } else {
        setError(result?.error || 'Erreur lors du chargement des statistiques.');
        setStats(null);
      }
    } catch (err) {
      setError(`Erreur de communication avec le serveur: ${err.message}`);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <div>
        <DattaPageTitle title="Tableau de bord" />
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <CircularProgress value={50} label="Chargement..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <DattaPageTitle title="Tableau de bord" />
        <div className="error-message" style={{ margin: 'var(--spacing-4) 0' }}>
          {error}
          <button onClick={loadStats} className="btn-secondary" style={{ marginLeft: 'var(--spacing-3)' }}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DattaPageTitle title="Tableau de bord" />
      {!stats ? (
        <div className="no-data-message" style={{ margin: 'var(--spacing-4) 0' }}>
          Aucune statistique disponible pour le moment.
          <button onClick={loadStats} className="btn-primary" style={{ marginTop: 'var(--spacing-3)' }}>Recharger</button>
        </div>
      ) : (
        <Grid container spacing={2} className="stats-container">
          {stats.mesIndividus !== undefined && (
            <Grid item xs={12} sm={6} md={4}>
              <DattaCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconUserCheck size={32} style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }} />
                  <Typography variant="h5" sx={{ color: 'var(--color-primary-600)' }}>{stats.mesIndividus}</Typography>
                  <Typography variant="body2">Dossiers en charge</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1, mb: 2 }}>
                    Nombre de dossiers relevant de votre responsabilité directe.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button fullWidth variant="contained" onClick={() => typeof onNavigateToMyIndividus === 'function' && onNavigateToMyIndividus()}>
                    Voir mes individus suivis
                  </Button>
                </CardActions>
              </DattaCard>
            </Grid>
          )}

          {stats.totalIndividus !== undefined && (
            <Grid item xs={12} sm={6} md={4}>
              <DattaCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconUsers size={32} style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }} />
                  <Typography variant="h5" sx={{ color: 'var(--color-primary-600)' }}>{stats.totalIndividus}</Typography>
                  <Typography variant="body2">Total des individus</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1, mb: 2 }}>
                    Nombre total d'individus enregistrés dans le système.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button fullWidth variant="contained" onClick={() => typeof onNavigateToAllIndividus === 'function' && onNavigateToAllIndividus()}>
                    Voir tous les individus
                  </Button>
                </CardActions>
              </DattaCard>
            </Grid>
          )}

          {(user.role === 'admin' || user.role === 'manager') && stats.individusNonAttribues !== undefined && (
            <Grid item xs={12} sm={6} md={4}>
              <DattaCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconUserX size={32} style={{ color: 'var(--color-warning-500)', marginBottom: 'var(--spacing-2)' }} />
                  <Typography variant="h5" sx={{ color: stats.individusNonAttribues > 0 ? 'var(--color-warning-500)' : 'var(--color-success-500)' }}>
                    {stats.individusNonAttribues}
                  </Typography>
                  <Typography variant="body2">Individus non attribués</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Individus en attente d'assignation à un responsable.
                  </Typography>
                </CardContent>
              </DattaCard>
            </Grid>
          )}

          <Grid item xs={12} md={4}>
            <DattaCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Vos Informations</Typography>
                <Typography variant="body2">Nom d'utilisateur: {user.username}</Typography>
                <Typography variant="body2">Rôle: {user.role}</Typography>
                <Typography variant="body2">ID Utilisateur: {user.id || user.userId}</Typography>
              </CardContent>
            </DattaCard>
          </Grid>

          {(user.role === 'admin' || user.role === 'manager') && stats.totalUsers !== undefined && (
            <Grid item xs={12} sm={6} md={4}>
              <DattaCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconFolder size={32} style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }} />
                  <Typography variant="h5" sx={{ color: 'var(--color-primary-600)' }}>{stats.totalUsers}</Typography>
                  <Typography variant="body2">Total des utilisateurs</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Nombre total de comptes utilisateurs actifs.
                  </Typography>
                </CardContent>
              </DattaCard>
            </Grid>
          )}

          {user.role === 'admin' && stats.categoriesMasquees !== undefined && stats.categoriesMasquees > 0 && (
            <Grid item xs={12} sm={6} md={4}>
              <DattaCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconFolder size={32} style={{ color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-2)' }} />
                  <Typography variant="h5" sx={{ color: 'var(--color-neutral-500)' }}>{stats.categoriesMasquees}</Typography>
                  <Typography variant="body2">Catégories masquées</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Catégories archivées non disponibles pour de nouvelles saisies.
                  </Typography>
                </CardContent>
              </DattaCard>
            </Grid>
          )}
        </Grid>
      )}
    </div>
  );
}
