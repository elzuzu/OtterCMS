/**
 * Module Logger pour Indi-Suivi
 * Module de logging simple pour l'application Electron
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLevel = this.logLevels.INFO;
        this.logFile = null;
        this.initLogFile();
    }
    
    initLogFile() {
        try {
            // Créer le dossier de logs dans le dossier userData
            const userDataPath = app ? app.getPath('userData') : './logs';
            const logsDir = path.join(userDataPath, 'logs');
            
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            // Fichier de log avec date
            const today = new Date().toISOString().split('T')[0];
            this.logFile = path.join(logsDir, `indi-suivi-${today}.log`);
        } catch (error) {
            console.error("Impossible d'initialiser le fichier de log:", error);
            this.logFile = null;
        }
    }
    
    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        const pid = process.pid;
        return `[${timestamp}] [${level}] [PID:${pid}] ${message}`;
    }
    
    writeToFile(formattedMessage) {
        if (this.logFile) {
            try {
                fs.appendFileSync(this.logFile, formattedMessage + '\n');
            } catch (error) {
                console.error('Erreur écriture log:', error);
            }
        }
    }
    
    log(level, message, ...args) {
        const levelNum = this.logLevels[level];
        if (levelNum <= this.currentLevel) {
            const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : message;
            const formattedMessage = this.formatMessage(level, fullMessage);
            
            // Affichage console avec couleurs
            switch (level) {
                case 'ERROR':
                    console.error(formattedMessage);
                    break;
                case 'WARN':
                    console.warn(formattedMessage);
                    break;
                case 'DEBUG':
                    console.debug(formattedMessage);
                    break;
                default:
                    console.log(formattedMessage);
            }
            
            // Écriture dans le fichier
            this.writeToFile(formattedMessage);
        }
    }
    
    error(message, ...args) {
        this.log('ERROR', message, ...args);
    }
    
    warn(message, ...args) {
        this.log('WARN', message, ...args);
    }
    
    info(message, ...args) {
        this.log('INFO', message, ...args);
    }
    
    debug(message, ...args) {
        this.log('DEBUG', message, ...args);
    }
    
    setLevel(level) {
        if (typeof level === 'string' && this.logLevels.hasOwnProperty(level)) {
            this.currentLevel = this.logLevels[level];
            this.info(`Niveau de log changé vers: ${level}`);
        }
    }
}

// Instance singleton
const logger = new Logger();

// Export pour CommonJS et ES6
module.exports = {
    Logger: logger,
    logger,
    // Méthodes directes pour compatibilité
    error: (msg, ...args) => logger.error(msg, ...args),
    warn: (msg, ...args) => logger.warn(msg, ...args),
    info: (msg, ...args) => logger.info(msg, ...args),
    debug: (msg, ...args) => logger.debug(msg, ...args),
    setLevel: (level) => logger.setLevel(level)
};

// Log de démarrage
logger.info('Module Logger initialisé');
