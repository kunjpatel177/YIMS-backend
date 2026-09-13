const express = require('express');
const router = express.Router();
const {
  getTransfers,
  getTransferById,
  handleCreateTransfer,
  handleCompleteTransfer,
  handleCancelTransfer
} = require('../controllers/transferController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getTransfers).post(handleCreateTransfer);
router.route('/:id').get(getTransferById);
router.post('/:id/complete', handleCompleteTransfer);
router.post('/:id/cancel', handleCancelTransfer);

module.exports = router;
