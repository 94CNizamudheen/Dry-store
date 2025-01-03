
const GoogleStrategy= require('passport-google-oauth20').Strategy;
const User= require("../models/userSchema");
const passport = require('passport');
const env= require('dotenv').config();


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"https://henzasdrystore.shop/auth/google/callback",

},async (accessTocken,refreshTocken,profile,done)=>{
    try {
        let user=await User.findOne({googleId:profile.id});
        if(user){
            return done(null,user); 
            
        }else{
            user= new User({
                name:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,
                rewardPoints:250,
            })
            await user.save();
            return done(null,user)
            req.session.user=user
            
        }
    } catch (error) {
        return done(error,null)
    }
}));

passport.serializeUser((user,done)=>{
    done(null,user.id)
});
passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user => {
        done(null,user);
        console.log("insidePassport;",user)
        
    }).catch(err => {
        done(err,null);
    });
})

module.exports= passport ;