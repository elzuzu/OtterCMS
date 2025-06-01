const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class CryptoService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyPath = path.join(__dirname, '../../config/encryption.key');
    this.key = this.getOrCreateKey();
  }

  getOrCreateKey() {
    try {
      if (fs.existsSync(this.keyPath)) {
        return fs.readFileSync(this.keyPath);
      } else {
        const key = crypto.randomBytes(32);
        fs.writeFileSync(this.keyPath, key);
        return key;
      }
    } catch (error) {
      console.error('Erreur gestion clé de cryptage:', error);
      return crypto.randomBytes(32);
    }
  }

  encrypt(text) {
    if (!text) return null;
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      cipher.setAAD(Buffer.from('oracle-config'));
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
    } catch (error) {
      console.error('Erreur cryptage:', error);
      return null;
    }
  }

  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(encryptedData.iv, 'hex'));
      decipher.setAAD(Buffer.from('oracle-config'));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Erreur décryptage:', error);
      return null;
    }
  }
}

module.exports = new CryptoService();
