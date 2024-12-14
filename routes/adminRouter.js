const express= require('express');
const router= express.Router();
const adminController= require('../controllers/admin/adminController');
const categoryController= require('../controllers/admin/categoryController')
const path= require('path');
const customerController= require('../controllers/admin/customerController')
const {userAuth,adminAuth} = require('../middlewares/auth');
const brandController= require('../controllers/admin/brandController');
const productController= require("../controllers/admin/productController")
const orderController= require('../controllers/admin/orderController');
const coupenController=require('../controllers/admin/coupenController');
const statiticsController=require('../controllers/admin/statiticsController');
const referralController =require('../controllers/admin/referralCodeController');
const shippingContoller= require('../controllers/admin/shippingController');
const multer= require('multer');
const storage= require('../helpers/multer');
const { rotate } = require('pdfkit');
const uploads= multer({storage:storage});


router.use(express.static('public'))
router.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
//error managment

router.get('/pageError',adminController.pageError);

//admin mgt

router.get('/logIn',adminController.loadLogin);
router.post('/logIn',adminController.logIn);
router.get('/dashboard',adminAuth,adminController.loadashboard);
router.get('/logOut',adminController.logOut);
//customer mgt

router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
router.get('/unBlockCustomer',adminAuth,customerController.customerUnBlocked);

//catogery

router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/category',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer);
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer);
router.get('/listCategory',adminAuth,categoryController.getListCategory);
router.get('/unListCategory',adminAuth,categoryController.getUnListCategory);
router.get('/editCategory',adminAuth,categoryController.getEditCategory);
router.post('/editCategory/:id',adminAuth,categoryController.editCategory);

//brand managment
router.get('/brands',adminAuth,brandController.getBrandPage);
router.get('/addBrands',adminAuth,brandController.getAddBrands);
router.post('/addBrands',adminAuth,uploads.single("image"),brandController.addBrands)
router.get('/blockBrands/:id',adminAuth,brandController.blockBrands);
router.get('/unBlockbrands/:id',adminAuth,brandController.unBlockBrands);
router.get('/deleteBrands/:id',adminAuth,brandController.deleteBrands);

// product managment
router.get('/addProduct',adminAuth,productController.getProductaddPage);
router.post('/addProduct',adminAuth,uploads.array("images",3),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.post('/addProductOffer',adminAuth,productController.addProductOffer);
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer);
router.get('/blockProduct',adminAuth,productController.blockProduct);
router.get('/unBlockProduct',adminAuth,productController.unBlockProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct);
router.post('/editProduct',adminAuth,uploads.array("images",3),productController.editProduct);
router.delete('/deleteSingleImage',adminAuth,productController.deleteSingleImage);
router.get('/inventoryManagement',adminAuth,productController.loadInventoryManagment);
router.patch('/updateInventory/:productId',adminAuth,productController.updateInventory);

// order managment 
router.get('/orderList',adminAuth,orderController.loadOrderDetails);
router.post('/orderList/update-status', adminAuth, orderController.updateOrderStatus);
router.get('/orderList/:orderId',adminAuth,orderController.getOrderDetails);
router.post('/cancelOrder/:orderId',adminAuth,orderController.cancelOrder);
router.patch('/returnRequestHandle',adminAuth,orderController.handleReturnRequest);

//coupon managment 
router.get('/coupon',adminAuth,coupenController.loadCouponPage);
router.post('/coupon',adminAuth,coupenController.createCoupon);
router.put('/coupon/:id',adminAuth,coupenController.updateCoupon);
router.delete('/coupon/:id',adminAuth,coupenController.removeCoupon);

//reports
router.get('/reports',adminAuth,statiticsController.LoadReportsPage);
router.post('/generate',adminAuth,statiticsController.generateReports);
router.get('/download/:type',adminAuth,statiticsController.downloadReports);
router.get('/dashboardData',adminAuth,statiticsController.getDashboardData);
router.get('/paymentData',adminAuth,statiticsController.getOrderPaymentData);
router.get('/ordersSales',adminAuth,statiticsController.getOrderSales);

//referral
router.get('/referralCode',adminAuth,referralController.getReferralPage);
router.patch('/rewards-config',adminAuth,referralController.updateRewardsConfig);

//shipping
router.get('/shipping',adminAuth,shippingContoller.loadShipping);
router.post('/addState',adminAuth,shippingContoller.addState);
router.patch('/updateShipping',adminAuth,shippingContoller.updateShipping);


module.exports = router;        