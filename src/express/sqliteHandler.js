// sqliteHandler.js
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require("fs");
const appName = 'NoveloService'; // use your app name
const baseDir = process.env.ProgramData || 'C:\\ProgramData';
const dbDir = path.join(baseDir, appName);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'Novelo.sqlite');
const db = new Database(dbPath);
let sqlLogger = false;
console.info("Database Path:", dbPath);


const sqliteHandler = {
    settings: ({ logSql }) => {
        sqlLogger = logSql;
    },
    close: async () => {
        db.close();
        console.log('SQLite database closed');
    },

    executeSql: async (sql, args = [], operation) => {
        if (sqlLogger)
            console.info('Sql Operation:', operation, sql, args);

        try {
            switch (operation) {
                case 'Bulk':
                    db.exec(sql); // Runs multiple statements at once
                    return;

                case 'READ': {
                    const stmt = db.prepare(sql);
                    const rows = stmt.all(...args);
                    return rows;
                }

                case 'WRITE': {
                    const stmt = db.prepare(sql);
                    const info = stmt.run(...args);
                    return { lastInsertRowId: info.lastInsertRowid };
                }

                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }
        } catch (err) {
            console.error('SQLite Error:', err.message);
            throw err;
        }
    },
};

module.exports = sqliteHandler;
