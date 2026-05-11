INSERT INTO modulos (curso_id, titulo, tipo, contenido, orden, calificacion_minima, tiempo_limite_minutos) 
VALUES (1, 'Quiz: Introducción', 'quiz', 
'[
  {
    "id": 1,
    "tipo": "seleccion_multiple",
    "pregunta": "¿Cuál es el objetivo principal de ALUMCO?",
    "opciones": [
      {"id": "a", "texto": "Plataforma de video", "es_correcta": false},
      {"id": "b", "texto": "Plataforma de capacitaciones internas", "es_correcta": true},
      {"id": "c", "texto": "Red social", "es_correcta": false}
    ]
  },
  {
    "id": 2,
    "tipo": "respuesta_escrita",
    "pregunta": "Describe brevemente qué es ALUMCO",
    "respuestaModelo": "ALUMCO es una plataforma de capacitación interna para el desarrollo profesional"
  }
]'::jsonb, 2, 60, 30);
