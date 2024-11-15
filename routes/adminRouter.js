const express= require('express');
const router= express.Router();
const adminController= require('../controllers/admin/adminController');
const categoryController= require('../controllers/admin/categoryController')
const path= require('path');
const customerController= require('../controllers/admin/customerController')
const {userAuth,adminAuth} = require('../middlewares/auth');
const brandController= require('../controllers/admin/brandController');
const productController= require("../controllers/admin/productController")
const multer= require('multer');
const storage= require('../helpers/multer');
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
router.post('/deleteSingleImage',adminAuth,productController.deleteSingleImage);


module.exports = router;