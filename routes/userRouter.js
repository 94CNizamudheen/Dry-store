
const express= require('express');
const router= express.Router();
const userController= require('../controllers/user/userController')
const path= require("path");
const passport = require('passport');
const { profile } = require('console');
const profileController= require('../controllers/user/profileController');



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
router.get('/userProfile',userController.loadUserProfile);
router.get('/logOut',userController.logOut);
router.get("/productDetails",userController.getProductDetials)

//profile management
router.get('/forgot-password',profileController.getForgotPasswordPage);
router.post('/forgot-email-valid',profileController.forgotEmailValid);
router.post('/verify-passForgot-otp',profileController.verifyPassForgotOtp)
router.get('/reset-password',profileController.getResetPasswordPage);
router.post('/resend-forgot-otp',profileController.resendOtp);
router.post('/reset-password',profileController.postNewPassword);


module.exports=router;
