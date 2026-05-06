const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) console.error("Error listing tables:", err);
        else console.log("Tables:", rows.map(r => r.name));
    });
    db.all("SELECT COUNT(*) as count FROM productos", (err, rows) => {
        if (err) console.error("Error counting products:", err);
        else console.log("Product count:", rows[0].count);
    });
    db.all("SELECT * FROM productos LIMIT 1", (err, rows) => {
        if (err) console.error("Error fetching one product:", err);
        else console.log("Sample product:", rows[0]);
    });
});
db.close();
