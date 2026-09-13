const express = require('express');
const router = express.Router();
const {
  getWarehouseInventory,
  getWarehouseInventorySummary
} = require('../controllers/warehouseInventoryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getWarehouseInventory);
router.get('/summary', getWarehouseInventorySummary);

module.exports = router;
