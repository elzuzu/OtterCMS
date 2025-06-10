import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { Button, Input, Select, message, Modal, Form, Table, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/tauri';

const { Option } = Select;

interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  windows_login?: string;
  deleted: number;
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const path: string = await invoke('get_db_path');
        const database = await Database.load(`sqlite:${path}`);
        setDb(database);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
        message.error('Erreur lors de l\'initialisation de la base de données');
      }
    };
    init();
  }, []);

  const fetchUsers = async () => {
    if (!db) return;
    try {
      const dbUsers: DbUser[] = await db.select(
        'SELECT * FROM users WHERE deleted = 0 ORDER BY username'
      );
      const formatted: User[] = dbUsers.map(u => ({
        id: u.id.toString(),
        name: u.username,
        email: u.windows_login || '',
        isAdmin: u.role === 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setUsers(formatted);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      message.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (db) fetchUsers();
  }, [db]);

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: User) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.name,
      role: record.isAdmin ? 'admin' : 'user',
      windows_login: record.email,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await db.execute('UPDATE users SET deleted = 1 WHERE id = $1', [parseInt(id)]);
      message.success('Utilisateur supprimé avec succès');
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async () => {
    if (!db) return;
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await db.execute(
          'UPDATE users SET username = $1, role = $2, windows_login = $3 WHERE id = $4',
          [values.username, values.role, values.windows_login || null, parseInt(editingUser.id)]
        );
        message.success('Utilisateur modifié avec succès');
      } else {
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash(values.password, 10);
        await db.execute(
          'INSERT INTO users (username, password_hash, role, windows_login, deleted) VALUES ($1, $2, $3, $4, 0)',
          [values.username, hash, values.role, values.windows_login || null]
        );
        message.success('Utilisateur créé avec succès');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const columns: ColumnsType<User> = [
    { title: 'Nom d\'utilisateur', dataIndex: 'name', key: 'name' },
    { title: 'Login Windows', dataIndex: 'email', key: 'email', render: t => t || 'Non défini' },
    { title: 'Rôle', dataIndex: 'isAdmin', key: 'isAdmin', render: val => (val ? 'Administrateur' : 'Utilisateur') },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Modifier</Button>
          <Popconfirm title="Êtes-vous sûr ?" onConfirm={() => handleDelete(record.id)} okText="Oui" cancelText="Non">
            <Button danger icon={<DeleteOutlined />}>Supprimer</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!user?.isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Accès non autorisé. Seuls les administrateurs peuvent gérer les utilisateurs.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Nouvel Utilisateur</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table columns={columns} dataSource={users} rowKey="id" loading={loading} />
      </div>

      <Modal title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} open={isModalVisible} onOk={handleSubmit} onCancel={() => setIsModalVisible(false)} okText="Sauvegarder" cancelText="Annuler">
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Nom d'utilisateur" rules={[{ required: true, message: 'Veuillez entrer un nom d\'utilisateur' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="windows_login" label="Login Windows (optionnel)">
            <Input placeholder="DOMAIN\\username ou username" />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="Mot de passe" rules={[{ required: true, message: 'Veuillez entrer un mot de passe' }]}> <Input.Password /> </Form.Item>
          )}
          <Form.Item name="role" label="Rôle" rules={[{ required: true, message: 'Veuillez sélectionner un rôle' }]}> <Select><Option value="admin">Administrateur</Option><Option value="manager">Manager</Option><Option value="user">Utilisateur</Option></Select></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
