const User = require("../models/userSchema");

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




module.exports = {
  userAuth,
  adminAuth,
};
