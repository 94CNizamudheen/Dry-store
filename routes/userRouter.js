
const express= require('express');
const router= express.Router();
const userController= require('../controllers/user/userController');
const profileController= require('../controllers/user/profileController');
const cartController= require('../controllers/user/cartController');
const path= require("path");
const passport = require('passport');
const { profile } = require('console');

const { userAuth } = require('../middlewares/auth');



router.use(express.static('public'))
 
router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHomepage);
router.get('/signUp',userController.loadSignUp);
router.post('/signUp',userController.signUp);
router.get('/shop',userController.loadShopping);
router.get('/logIn',userController.loadLogIn);
router.post('/logIn',userController.logIn);
router.post('/verifyOtp',userController.verifyOtp);
router.get('/resendOtp',userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:["profile","email"]}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:"/signUp"}),(req,res)=>{res.redirect('/')});
router.get('/logOut',userController.logOut);
router.get("/productDetails",userController.getProductDetials)

//profile management

router.get('/forgot-password',profileController.getForgotPasswordPage);
router.post('/forgot-email-valid',profileController.forgotEmailValid);
router.post('/verify-passForgot-otp',profileController.verifyPassForgotOtp)
router.get('/reset-password',profileController.getResetPasswordPage);
router.post('/resend-forgot-otp',profileController.resendOtp);
router.post('/reset-password',profileController.postNewPassword);
router.get('/user-profile',userAuth,profileController.userProfilePage);
router.get('/change-email',userAuth,profileController.changeEmail);
router.post('/change-email',userAuth,profileController.changeEmailValid);
router.get('/new-email',userAuth,profileController.loadNewEmailPage);
router.post('/verify-change-email-otp',userAuth,profileController.verifyEmailChangeOtp);
router.post('/resend-verify-email-otp',userAuth,profileController.resendEmailChangeOtp);
router.post('/update-email',userAuth,profileController.updateEmail);
router.get('/change-password',userAuth,profileController.changePasswordPage);
router.post('/change-password',userAuth,profileController.changePasswordValid);
router.post('/verify-change-password-otp',userAuth,profileController.verifyPasswordChangeOtp);
router.post('/resend-verify-password-otp',userAuth,profileController.resendPasswordChangeOtp);

//address mgt

router.get('/add-address',userAuth,profileController.addAddressPage);
router.post('/add-address',userAuth,profileController.postAddAddress);
router.get('/edit-address',userAuth,profileController.editAddress);
router.post('/edit-address',userAuth,profileController.postEditAddress);
router.get('/delete-address',userAuth,profileController.deleteAddess);

//cart mgt

router.get('/cart',userAuth,cartController.loadCart);
router.post('/add-to-cart',userAuth,cartController.addToCart);
router.post('/update-quantity',userAuth,cartController.updateQuantity);
router.post('/remove-item',userAuth,cartController.removeItem);

module.exports=router;
