const User= require('../models/userSchema');




const useruth= (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
                                    .then(data=>{
                                        if(data && !data.isBlocked){
                                            next();
                                        }
                                        else{
                                            res.redirect('logIn');
                                        }
                                    })
                                    .catch(error=>{
                                        console.log("Error in user auth Middelware",error);
                                        res.status(500).send("Internal Server Error")
                                    })

    }else{
        res.redirect('/logIn');
    }
};

// const adminAuth= (req,res,next)=>{
 
//     User.findOne({isAdmin:true})
//                             .then(data=>{
//                                 if(data){
//                                     next()
//                                 }
//                                 else{
//                                     res.redirect('/admin/logIn')
//                                 }
//                             })
//                             .catch(error=>{
//                                 console.log("Error on admin Auth Middleware",error);
//                                 res.status(500).send("Internel server Problem")
//                             })
// };
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
    useruth,
    adminAuth,
}