const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');

const app = express();

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// ===== DATABASE (SQLite) =====
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.log(err);
    else console.log("SQLite Connected");
});

// ===== CREATE TABLES =====
db.run(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT,
    userId INTEGER
)
`);

// ===== SIGNUP =====
app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (row) return res.send("User already exists");

        db.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, password],
            () => res.redirect('/Dashboard.html')
        );
    });
});

// ===== LOGIN =====
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, user) => {
            if (user) {
                req.session.userId = user.id;
                res.redirect('/tasks.html');
            } else {
                res.send("Invalid credentials");
            }
        }
    );
});

// ===== LOGOUT =====
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/Dashboard.html');
});

// ===== ADD TASK =====
app.post('/add-task', (req, res) => {
    if (!req.session.userId) return res.send("Login first");

    db.run(
        "INSERT INTO tasks (task, userId) VALUES (?, ?)",
        [req.body.task, req.session.userId],
        () => res.redirect('/tasks.html')
    );
});

// ===== GET TASKS =====
app.get('/tasks', (req, res) => {
    if (!req.session.userId) return res.json([]);

    db.all(
        "SELECT * FROM tasks WHERE userId = ?",
        [req.session.userId],
        (err, rows) => {
            res.json(rows);
        }
    );
});

// ===== DELETE =====
app.get('/delete-task/:id', (req, res) => {
    db.run(
        "DELETE FROM tasks WHERE id = ?",
        [req.params.id],
        () => res.redirect('/tasks.html')
    );
});

// ===== EDIT PAGE =====
app.get('/edit-task/:id', (req, res) => {
    db.get(
        "SELECT * FROM tasks WHERE id = ?",
        [req.params.id],
        (err, task) => {
            res.send(`
                <h2>Edit Task</h2>
                <form action="/update-task/${task.id}" method="POST">
                    <input type="text" name="task" value="${task.task}" required>
                    <button>Update</button>
                </form>
                <br><a href="/tasks.html">Back</a>
            `);
        }
    );
});

// ===== UPDATE =====
app.post('/update-task/:id', (req, res) => {
    db.run(
        "UPDATE tasks SET task = ? WHERE id = ?",
        [req.body.task, req.params.id],
        () => res.redirect('/tasks.html')
    );
});

// ===== DEFAULT =====
app.get('/', (req, res) => {
    res.redirect('/Dashboard.html');
});

// ===== SERVER =====
app.listen(3000, () => {
    console.log(" Server running at http://localhost:3000");
});