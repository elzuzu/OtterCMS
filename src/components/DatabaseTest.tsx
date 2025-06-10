import React, { useState } from 'react';
import { Button, Card, message, Alert } from 'antd';
import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/tauri';

const DatabaseTest: React.FC = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const withDb = async (callback: (db: Database) => Promise<string>) => {
    setLoading(true);
    setResult('');
    try {
      const path: string = await invoke('get_db_path');
      const db = await Database.load(`sqlite:${path}`);
      const text = await callback(db);
      await db.close();
      setResult(text);
      message.success('Opération réussie');
    } catch (e: any) {
      message.error('Erreur: ' + e.message);
      setResult('Erreur: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const test = () =>
    withDb(async (db) => {
      const tables = await db.select("SELECT name FROM sqlite_master WHERE type='table'");
      return `${tables.length} tables`;
    });

  const init = () =>
    withDb(async (db) => {
      await db.execute(
        "INSERT OR IGNORE INTO users (username, password_hash, role, deleted) VALUES ('admin', '', 'admin', 0)"
      );
      return 'DB initialisée';
    });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card title="Test de la Base de Données" className="mb-4">
        <Alert message="Diagnostic" description="Test et initialisation" type="info" showIcon />
        <div className="space-x-4 mt-4">
          <Button type="primary" onClick={test} loading={loading}>Tester la DB</Button>
          <Button onClick={init} loading={loading}>Initialiser la DB</Button>
        </div>
        {result && (
          <Card size="small" title="Résultat" className="mt-4">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default DatabaseTest;
