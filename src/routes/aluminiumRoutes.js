const express = require('express');
const router = express.Router();
const {
  getInventory,
  getPurchases,
  createPurchase,
  handleCompletePurchase,
  executeProduction,
  getProductions,
  getLedger
} = require('../controllers/aluminiumController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/inventory', getInventory);
router.get('/purchases', getPurchases);
router.post('/purchases', createPurchase);
router.post('/purchases/:id/complete', handleCompletePurchase);
router.post('/production', executeProduction);
router.get('/productions', getProductions);
router.get('/ledger', getLedger);

module.exports = router;
