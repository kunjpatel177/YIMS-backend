const express = require('express');
const router = express.Router();
const {
  getBOMs,
  getBOMByProduct,
  getCapacitySummary,
  createBOMEntry,
  updateBOMEntry,
  deleteBOMEntry,
  duplicateBOM
} = require('../controllers/bomController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/capacity-summary', getCapacitySummary);
router.post('/duplicate', duplicateBOM);
router.get('/product/:productId', getBOMByProduct);

router.route('/').get(getBOMs).post(createBOMEntry);
router.route('/:id').put(updateBOMEntry).delete(deleteBOMEntry);

module.exports = router;
