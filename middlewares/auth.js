const User= require('../models/userSchema');




const userAuth=async (req,res,next)=>{
    
        try {
            if(req.session.user){

                const user= await User.findById(req.session.user);
                if(user && !user.isBlocked){
                    return next();
                }else{
                    return res.redirect("/logIn");
                }
            }else{
                return res.redirect("/logIn");
            }
          
            
        } catch (error) {
            console.log("Error in user Auth Middlewre");
            res.status(500).send("Internal Server Error");
        }
    
   
};


const adminAuth= async(req,res,next)=>{
    if(req.session.admin){
        try {
            const admin= await User.findOne({isAdmin:true});
            if(admin){
                return next();
            }else{
                return res.redirect('/admin/logIn')
            }
            
        } catch (error) {
            console.log("Error on admin Auth Middleware",error);
             res.status(500).send("Internel server Problem")
        }
    }else{
        res.redirect('/admin/logIn')
    }
}   


module.exports={
    userAuth,
    adminAuth,
}