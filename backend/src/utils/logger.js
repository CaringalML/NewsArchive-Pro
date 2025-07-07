/**
 * Logger Utility
 * Provides structured logging for the application
 */

const config = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[config.app.logLevel] || LOG_LEVELS.info;

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} data - Additional data
 * @returns {string} Formatted log message
 */
const formatLog = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    level,
    message,
    ...data
  };
  return JSON.stringify(log);
};

/**
 * Logger object with level-specific methods
 */
exports.logger = {
  error: (message, data) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatLog('error', message, data));
    }
  },

  warn: (message, data) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, data));
    }
  },

  info: (message, data) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.info(formatLog('info', message, data));
    }
  },

  debug: (message, data) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(formatLog('debug', message, data));
    }
  }
};