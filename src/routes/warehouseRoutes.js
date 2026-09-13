const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse
} = require('../controllers/warehouseController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getWarehouses).post(createWarehouse);
router.route('/:id').get(getWarehouseById).put(updateWarehouse);

module.exports = router;
