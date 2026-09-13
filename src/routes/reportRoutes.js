const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getPurchaseReport,
  getInventoryReport,
  getLowStockReport,
  getCapacityReport,
  getTransferReport,
  getAluminiumReports
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/sales', getSalesReport);
router.get('/purchases', getPurchaseReport);
router.get('/inventory', getInventoryReport);
router.get('/low-stock', getLowStockReport);
router.get('/capacity', getCapacityReport);
router.get('/transfers', getTransferReport);
router.get('/aluminium', getAluminiumReports);

module.exports = router;
