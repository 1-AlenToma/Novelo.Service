// sqliteHandler.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'Novel.sqlite');
const db = new Database(dbPath);

const sqliteHandler = {
    close: async () => {
        db.close();
        console.log('SQLite database closed');
    },

    executeSql: async (sql, args = [], operation) => {
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
