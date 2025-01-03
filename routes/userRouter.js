
const express= require('express');
const router= express.Router();
const userController= require('../controllers/user/userController');
const profileController= require('../controllers/user/profileController');
const cartController= require('../controllers/user/cartController');
const orderController= require('../controllers/user/userOrderController')
const walletController= require('../controllers/user/walletController')

const path= require("path");
const passport = require('passport');
const { profile } = require('console');


const { userAuth,headerData } = require('../middlewares/auth');



router.use(express.static('public'))
 
router.get('/pageNotFound',userController.pageNotFound);
router.get('/',headerData, userController.loadHomepage);
router.get('/signup',userController.loadSignUp);
router.post('/signup',userController.signup);
router.get('/shop',headerData,userController.loadShopping);
router.get('/logIn',userController.loadLogIn);
router.post('/logIn',userController.logIn);
router.post('/verifyOtp',userController.verifyOtp);
router.get('/resendOtp',userController.resendOtp);
router.get('/auth/google',passport.authenticate('google',{scope:["profile","email"]}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:"/signup"}),(req,res)=>{
    req.session.user=req.user;
    return res.redirect('/')});
router.get('/logOut',userController.logOut);
router.get("/productDetails",headerData,userController.getProductDetials)
router.post('/download-invoice',userAuth,userController.downoladInvoice);
router.post('/submit-review',userAuth,userController.submitReview);
//wallet
router.get('/wallet',headerData,userAuth,walletController.loadWalletPage)
router.post('/create-recharge-order',userAuth,walletController.createRechargeOrder);
router.post('/verify-and-recharge',userAuth,walletController.verifyAndrecharge);
//wishlist
router.get('/wishlist',headerData,userAuth,userController.loadWishlist)
router.patch('/addToWishlist',userController.addToWishlist);
router.delete('/removeFromWishlist',userAuth,userController.removeFromWishlistPage);

//profile management

router.get('/forgot-password',headerData,profileController.getForgotPasswordPage);
router.get('/forgotPassOtp',headerData,profileController.getForgotPasswordOtp);
router.post('/forgot-email-valid',profileController.forgotEmailValid);
router.post('/verify-passForgot-otp',profileController.verifyPassForgotOtp)
router.get('/resetPassword',headerData,profileController.getResetPasswordPage);
router.post('/resend-forgot-otp',profileController.resendOtp);
router.post('/reset-password',profileController.postNewPassword);
router.get('/userProfile',headerData,userAuth,profileController.userProfilePage);
router.get('/change-password',headerData,userAuth,profileController.changePasswordPage);
router.post('/change-password',userAuth,profileController.changePasswordValid);
router.post('/verify-change-password-otp',userAuth,profileController.verifyPasswordChangeOtp);
router.post('/resend-verify-password-otp',userAuth,profileController.resendPasswordChangeOtp);
router.get('/about',profileController.about);

//address mgt

router.get('/add-address',headerData,userAuth,profileController.addAddressPage);
router.post('/addAddress',userAuth,profileController.postAddAddress);
router.get('/edit-address',headerData,userAuth,profileController.editAddress);
router.post('/edit-address',userAuth,profileController.postEditAddress);
router.delete('/delete-address',userAuth,profileController.deleteAddess);

//cart mgt

router.get('/cart',headerData,userAuth,cartController.loadCart);
router.patch('/add-to-cart',headerData,cartController.addToCart);
router.patch('/update-quantity',userAuth,cartController.updateQuantity);
router.post('/remove-item',userAuth,cartController.removeItem);
// coupon mgt
router.post('/apply-coupon',userAuth,cartController.applyCoupon);
router.post('/remove-coupon',userAuth,cartController.removeCoupon);

//ckeck out and order

router.get('/checkout',headerData,userAuth,orderController.loadCheckOutPage);
router.post('/check-out-add-address',userAuth,orderController.postAddAddress);
router.get('/select-address',userAuth,orderController.selectAddress);
router.post('/handle-payment',userAuth,orderController.handlePaymentMethod);
router.post('/place-order',userAuth,orderController.placeOrderForCODandWALLET);
router.get('/orderSuccessPage',userAuth,orderController.loadOrderSuccessPage);
router.get('/cancel-order',userAuth,orderController.cancelOrder);
router.patch('/cancel-order-item',userAuth,orderController.cancelOrderItem);
router.get('/check-order-payment', userAuth, orderController.checkOrderPayment);
router.post('/create-razorpay-order',userAuth,orderController.createRazorpayOrder);
router.post('/verify-payment',userAuth,orderController.verifyRazorpayPaymentAndPlaceOrder);
router.post('/failed-order-save',userAuth,orderController.failedOrderSave);
router.patch('/verify-repay-payment',userAuth,orderController.repayPayment);
router.post('/returnProduct',userAuth,orderController.initializeReturn);

//super coin
router.get('/superCoins',headerData,userAuth,userController.loadSuperCoin);
router.post('/scrachReward',userAuth,userController.scrachReward);




















module.exports=router;
