const PREFIX = '[MAIN]';

function log(...args) {
  console.log(PREFIX, ...args);
}

function logError(operation, error) {
  log(`[ERROR] Operation: ${operation}, Code: ${error.code || 'N/A'}, Message: ${error.message}`, error.stack);
}

function logIPC(name, ...args) {
  const loggedArgs = args.map(arg => {
    if (arg && typeof arg === 'object') {
      if (arg.fileContent) return { ...arg, fileContent: `[File content of ${arg.fileContent?.length || 0} bytes]` };
      if (arg.password) return { ...arg, password: '***' };
      if (name === 'attribuerIndividusEnMasse' && arg.individuIds) return { ...arg, individuIds: `[${arg.individuIds.length} IDs]` };
    }
    return arg;
  });
  console.log(`[IPC-MAIN] ${name} called with:`, ...loggedArgs);
  return args;
}

module.exports = { log, logError, logIPC };
