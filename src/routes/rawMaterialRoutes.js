const express = require('express');
const router = express.Router();
const {
  getRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial
} = require('../controllers/rawMaterialController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getRawMaterials).post(createRawMaterial);
router.route('/:id').get(getRawMaterialById).put(updateRawMaterial).delete(deleteRawMaterial);

module.exports = router;
