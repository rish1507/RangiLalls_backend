const express = require('express');
const router = express.Router();
const { registerForAuction, getUserRegistrations, getRegistrationDetails,checkAuctionAccess,getRegisteredAuctions } = require('../controllers/auctionRegistrationController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(protect); // Authentication middleware

router.post('/register',protect,upload.fields([
    { name: 'pancardFile', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'paymentReceipt', maxCount: 1 }
  ]),registerForAuction);
router.get('/registrations',protect,getUserRegistrations);
router.get('/registration/:id',protect,getRegistrationDetails);
router.get('/check-access/:auctionId', protect,checkAuctionAccess);
router.get('/my-registrations', protect, getRegisteredAuctions);

module.exports = router;