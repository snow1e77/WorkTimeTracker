// New DatabaseService that uses PostgreSQL through API
// This replaces the old SQLite-based DatabaseService

import { ApiDatabaseService } from './ApiDatabaseService';

// Export the ApiDatabaseService as DatabaseService for backward compatibility
export const DatabaseService = ApiDatabaseService;
export default ApiDatabaseService;
