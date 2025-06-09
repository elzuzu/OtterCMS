import React, { useState, useEffect } from 'react';
import DattaDataTable from './DattaDataTable';
import DattaAlert from './DattaAlert';

export default function DattaNetworkDataTable({ onLoadData, retryInterval = 5000, ...props }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onLoadData();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      setError(err.message);
      setRetryCount(prev => prev + 1);
      if (retryCount < 3) {
        setTimeout(loadData, retryInterval * Math.pow(2, retryCount));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error && retryCount >= 3) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <DattaAlert type="danger">
            <i className="feather icon-wifi-off me-2"></i>
            Impossible de charger les donnees. Verifiez votre connexion reseau.
          </DattaAlert>
          <button className="btn btn-primary" onClick={loadData}>
            <i className="feather icon-refresh-cw me-2"></i>
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <DattaDataTable
      {...props}
      data={data}
      loading={loading}
      actions={
        <div className="d-flex align-items-center gap-2">
          {props.actions}
          {loading && <div className="spinner-border spinner-border-sm" role="status"></div>}
        </div>
      }
    />
  );
}
