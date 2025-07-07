/**
 * NewsArchive Pro Lambda Entry Point
 * Exports the main handler from the app module
 */

const { handler } = require('./src/app');

exports.handler = handler;