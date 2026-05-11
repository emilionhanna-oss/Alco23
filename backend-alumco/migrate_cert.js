const db = require('./src/db');
db.query('CREATE TABLE IF NOT EXISTS certificados_emitidos (id SERIAL PRIMARY KEY, hash VARCHAR(64) UNIQUE NOT NULL, usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE, curso_id INT REFERENCES cursos(id) ON DELETE CASCADE, emitido_en TIMESTAMP DEFAULT NOW());')
.then(() => { console.log('Tabla creada'); process.exit(0); })
.catch((err) => { console.error(err); process.exit(1); });
