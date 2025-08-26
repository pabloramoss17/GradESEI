const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');


const DocxMergerLib = require('docx-merger');
const DocxMerger = DocxMergerLib && DocxMergerLib.default ? DocxMergerLib.default : DocxMergerLib;


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/plantillas')),
  filename: (req, file, cb) => {
    const raw = (req.query.tipo || req.body.tipo || 'diploma').toLowerCase();
    const tipo = raw === 'entrada' ? 'entradas' : raw;
    cb(null, `plantilla_${req.params.actoId}_${tipo}.docx`);
  }
});
const upload = multer({ storage });

router.post('/plantilla/:actoId', upload.single('plantilla'), (req, res) => {
  res.json({ mensaje: 'Plantilla subida correctamente' });
});

router.get('/word/:actoId', async (req, res) => {
  const actoId = req.params.actoId;
  const rawTipo = (req.query.tipo || 'diploma').toLowerCase();
  const tipo = rawTipo === 'entrada' ? 'entradas' : rawTipo; 

  try {
    // 1) Obtener datos de alumnos
    let alumnos = [];
    try {
      const [rows] = await db.promise().query(
        `SELECT a.nombre, a.apellidos, t.nombre AS titulacion,
                COALESCE(a.acompanantes_concedidos, 0)           AS c1,
                COALESCE(a.acompanantes_concedidos_segunda, 0)   AS c2
           FROM alumnos a
           JOIN titulaciones t ON a.titulacion_id = t.id
          WHERE t.graduacion_id = ?
          ORDER BY a.apellidos, a.nombre`,
        [actoId]
      );
      alumnos = rows || [];
    } catch {
      const [rows] = await db.promise().query(
        `SELECT a.nombre, a.apellidos, t.nombre AS titulacion,
                COALESCE(a.acompanantes_concedidos, 0) AS c1
           FROM alumnos a
           JOIN titulaciones t ON a.titulacion_id = t.id
          WHERE t.graduacion_id = ?
          ORDER BY a.apellidos, a.nombre`,
        [actoId]
      );
      alumnos = (rows || []).map(r => ({ ...r, c2: 0 }));
    }

    if (!alumnos.length) {
      return res.status(400).json({ error: 'No hay alumnos para este acto.' });
    }

    // 2) Leer plantilla del tipo
    const plantillaPath = path.join(__dirname, '../../uploads/plantillas', `plantilla_${actoId}_${tipo}.docx`);
    if (!fs.existsSync(plantillaPath)) {
      return res.status(400).json({ error: `No hay plantilla subida para este acto y tipo (${tipo}).` });
    }
    const plantillaBuffer = fs.readFileSync(plantillaPath);

    // 3) Generar documentos por tipo
    const docsBuffers = [];

    if (tipo === 'entradas') {
      // Entradas: generar un doc por cada invitación concedida a cada alumno
      for (const a of alumnos) {
        const c1 = parseInt(a.c1, 10) || 0;
        const c2 = parseInt(a.c2, 10) || 0;
        const total = c1 + c2;
        if (total <= 0) continue;

        for (let i = 1; i <= total; i++) {
          const zipDoc = new PizZip(plantillaBuffer);
          const doc = new Docxtemplater(zipDoc, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '[[', end: ']]' }
          });
          try {
            doc.render({
              Nombre: a.nombre,
              Apellidos: a.apellidos,
              Titulacion: a.titulacion,
              Numero: i
            });
            docsBuffers.push(doc.getZip().generate({ type: 'nodebuffer' }));
          } catch (e) {
            console.error('Docxtemplater render error (entradas):', e);
          }
        }
      }

      if (!docsBuffers.length) {
        return res.status(400).json({ error: 'No hay invitaciones concedidas para generar.' });
      }

    } else if (tipo === 'pegatina') {
      // Pegatinas: agrupar de 4 en 4 alumnos
      for (let i = 0; i < alumnos.length; i += 4) {
        const grupo = alumnos.slice(i, i + 4);
        const data = {
          Pegatina1: grupo[0] ? `${grupo[0].apellidos}, ${grupo[0].nombre}` : '',
          Pegatina2: grupo[1] ? `${grupo[1].apellidos}, ${grupo[1].nombre}` : '',
          Pegatina3: grupo[2] ? `${grupo[2].apellidos}, ${grupo[2].nombre}` : '',
          Pegatina4: grupo[3] ? `${grupo[3].apellidos}, ${grupo[3].nombre}` : ''
        };

        const zipDoc = new PizZip(plantillaBuffer);
        const doc = new Docxtemplater(zipDoc, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '[[', end: ']]' }
        });
        try {
          doc.render(data);
          docsBuffers.push(doc.getZip().generate({ type: 'nodebuffer' }));
        } catch (e) {
          console.error('Docxtemplater render error (pegatina):', e);
        }
      }

    } else {
      // Diplomas: un documento por alumno
      for (const a of alumnos) {  
        const zipDoc = new PizZip(plantillaBuffer);
        const doc = new Docxtemplater(zipDoc, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '[[', end: ']]' }
        });
        try {
          doc.render({
            Nombre: a.nombre,
            Apellidos: a.apellidos,
            Titulacion: a.titulacion
          });
          docsBuffers.push(doc.getZip().generate({ type: 'nodebuffer' }));
        } catch (e) {
          console.error('Docxtemplater render error (diploma):', e);
        }
      }
    }

    if (!docsBuffers.length) {
      return res.status(500).json({ error: 'No se pudo generar ningún documento.' });
    }

    // Unir todos en un único DOCX
    const merger = new DocxMerger({}, docsBuffers);
    return merger.save('nodebuffer', (data) => {
      const buf = Buffer.from(data);

      const filename = `documentos_${actoId}_${tipo}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Content-Encoding', '');
      res.end(buf);
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error generando documentos Word' });
  }
});

module.exports = router;