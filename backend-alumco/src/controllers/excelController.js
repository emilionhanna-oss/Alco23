const excelService = require('../services/excelService');

const importarUsuarios = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const buffer = req.file.buffer;
    const resultados = await excelService.importarUsuarios(buffer);

    res.json(resultados);
  } catch (error) {
    console.error('Error importando excel:', error);
    res.status(500).json({ error: 'Error procesando el archivo Excel' });
  }
};

const exportarUsuarios = async (req, res) => {
  try {
    const buffer = await excelService.exportarUsuarios();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios_alumco.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando usuarios:', error);
    res.status(500).json({ error: 'Error al generar Excel' });
  }
};

const exportarReporteDashboard = async (req, res) => {
  try {
    const buffer = await excelService.exportarReporteDashboard();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_dashboard_alumco.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando dashboard:', error);
    res.status(500).json({ error: 'Error al generar Excel' });
  }
};

module.exports = {
  importarUsuarios,
  exportarUsuarios,
  exportarReporteDashboard
};
