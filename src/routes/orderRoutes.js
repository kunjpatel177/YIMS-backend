const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  handleCompleteOrder,
  handleCancelOrder,
  deleteOrder
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getOrders).post(createOrder);
router.route('/:id').get(getOrderById).delete(deleteOrder);
router.post('/:id/complete', handleCompleteOrder);
router.post('/:id/cancel', handleCancelOrder);

module.exports = router;
