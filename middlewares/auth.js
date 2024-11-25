const User = require("../models/userSchema");
const Cart =require('../models/cartScema');
const Wishlist= require('../models/wishlistSchema');

const userAuth = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/logIn');
        }

        const userData = await User.findById(req.session.user);
        if (userData && !userData.isBlocked) {
            req.user = userData; 
            req.session.user = userData;
            return next();
        }
        req.session.destroy((err) => {
            if (err) console.error('Session destruction error:', err);
        });
        
        return res.redirect('/logIn');

    } catch (error) {
        console.error("Error in user Auth Middleware:", error);
        res.status(500).send("Internal Server Error");
    }
};

const adminAuth = async (req, res, next) => {
  if (req.session.admin) {
    try {
      const admin = await User.findOne({ isAdmin: true });
      if (admin) {
        return next();
      } else {
        return res.redirect("/admin/logIn");
      }
    } catch (error) {
      console.log("Error on admin Auth Middleware", error);
      res.status(500).send("Internel server Problem");
    }
  } else {
    res.redirect("/admin/logIn");
  }
};

const headerData = async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user._id);
      const cart = await Cart.findOne({ userId: user._id });
      const wishlist = await Wishlist.findOne({ userId: user._id });

      res.locals.user = user;
      res.locals.cartCount = cart ? cart.items.length : 0;
      res.locals.wishlistCount = wishlist ? wishlist.products.length : 0;
      res.locals.walletBalance = user.wallet?.balance || 0;
      
    } else {
      res.locals.user = null;
      res.locals.walletBalance = 0;
      res.locals.wishlistCount = 0;
      res.locals.cartCount = 0;
    }
    next();
  } catch (error) {
    console.error("Error in header data middleware:", error);
    next(error);
  }
};


module.exports = {
  userAuth,
  adminAuth,
  headerData

};
