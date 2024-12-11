const nodemailer = require('nodemailer');
const User = require("../../models/userSchema");
const Address= require('../../models/addressSchema');
const Order= require('../../models/orderSchema');
const bcrypt= require('bcrypt');
const env= require('dotenv').config();
const session= require('express-session');
const { text } = require('express');


function generateOtp(){
    const digits="1234567890";
    let otp="";
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)];
    }
    return otp;
};
const sendVerificationEmail=async(email,otp)=>{
    try {
        const transporter= nodemailer.createTransport({
            service:"gmail",
            port:'587',
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODE_MAILER_EMAIL,
                pass:process.env.NODE_MAILER_PASSWORD
            }
        });

        const mailOptions={
            from:process.env.NODE_MAILER_EMAIL,
            to:email,
            subject:"Your otp for reset Psaaword",
            text:`your OTP is ${otp}`,
            html:`<b><h4>your OTP is ${otp}</h4><br></b>`
        }
        const info= await transporter.sendMail(mailOptions);
        console.log("email sent",info);
        return true;

    } catch (error) {
        console.error("rrror for sending email",error);
        return false;
    }
};

const securePassword=async(password)=>{
    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        return hashedPassword;
    } catch (error) {
        console.error("Error hashing password:", error);
    }
}


const getForgotPasswordPage= async(req,res)=>{
    try {
        res.render('forgot-password');
    } catch (error) {
        res.redirect('/pageNotFound')
    }
};

const forgotEmailValid=async(req,res)=>{
    try {
        const {email}=req.body;
        const findUser= await User.findOne({email:email});
        if(findUser){
            const otp= generateOtp();
            const emailSend= await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp= otp,
                req.session.email=email,
                res.render('forgotPass-otp');
                console.log("otp:",otp);
            }else{
                res.json({success:false,message:"Failed to send Otp. Please try again"});
            }
        }else{
            res.render('forget-password',{
                message:"User with this email does Not exist"
            })
        }
    } catch (error) {
       res.redirect('/pageNotFound');
       
    }
};

const verifyPassForgotOtp= async(req,res)=>{
    try {
        const enteredOtp= req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
            res.json({success:false,message:"Otp not Matching"});
        }
        
    } catch (error) {
        res.status(500).json({success:false,message:"An error Occured. Please try Again"})
    }
};

const getResetPasswordPage=async(req,res)=>{
    try {
        res.render('reset-password');
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const resendOtp= async(req,res)=>{
    try {
        const otp= generateOtp();
        req.session.userOtp=otp;
        const email= req.session.email;
        console.log("resending Otp to :",email );
        const emailSend= await sendVerificationEmail(email,otp)
        if(emailSend){
            console.log('resended Otp:',otp);
            res.status(200).json({success:true,message:"Resend message succussful"})

        }
    } catch (error) {
        console.error("Error in resend Otp",error);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

const postNewPassword=async(req,res)=>{
    try {
        const {newPassword,confirmPassword} =req.body;
        const email=req.session.email;
        console.log(req.session.email);
        if(newPassword===confirmPassword){
            const hashedPassword=await securePassword(newPassword);
            const update = await User.findOneAndUpdate({ email:email},{$set:{password:hashedPassword}},{ new: true });
            console.log("upddate",update);
            
            res.redirect('/logIn')

            console.log(newPassword);
        }else{
            res.render('reset-password',{
                message:"Password not Matching"
            })
        }
        
    } catch (error) {
        res.redirect('/pageNotFound');  
    }
};

    const userProfilePage= async(req,res)=>{
        try {
            const userId= req.session.user; 
           
            const userData= await User.findById(userId);
            const addressData= await Address.findOne({userId:userId});
            const orders = await Order.find({ user: userId }).populate({
                path: 'orderedItems.product',
                select: 'productName productImage price',
            }).populate({
                path:'partialCancelledDetails.product',
                select:'productName productImage price'
            })
            .sort({ createdOn: -1 });
            
            
            res.render('user-profile',{
                user:userData,
                userAddress:addressData,
                userOrders:orders,
            });

          

            // const coupons
            
        } catch (error) {
            console.error('Error for retrive profile Data. ',error);
            res.redirect('/pageNotFound')
        }
    }
const changeEmail=async(req,res)=>{
    try {
        res.render('change-email')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
};


const changeEmailValid=async(req,res)=>{
    try {
        const {email}= req.body;
        const existUser= await User.findOne({email});
        if(existUser){
            const otp= generateOtp();
            const emailSend= await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp= otp;
                req.session.userData=req.body;
                req.session.email=email;
                res.render('change-email-otp');
                console.log("email send:",email);
                console.log("otp: ",otp);
            }else{
                res.json('email Error');
            }
        }else{
            res.render('change-email',{message:"user with this mail not exist"})
        }

    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const verifyEmailChangeOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, message: "OTP verified successfully", redirectUrl: "/new-email" });
        } else {
            res.json({ success: false, message: "OTP not matching" });
        }
    } catch (error) {
        console.error("Error in verifyEmailChangeOtp:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again later." });
    }
};

const resendEmailChangeOtp=async(req,res)=>{
    try {
        const otp= generateOtp();
        req.session.userOtp=otp;
        const email= req.session.email;
        console.log("resending Otp to :",email );
        const emailSend= await sendVerificationEmail(email,otp)
        if(emailSend){
            console.log('resended Otp:',otp);
            res.status(200).json({success:true,message:"Resend message succussful"})

        }
    } catch (error) {
        console.error("Error in resend Otp",error);
        res.status(500).json({success:false,message:"Internal server error"})
    }
};

const loadNewEmailPage=async(req,res)=>{
    try {
        res.render('new-email');
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const updateEmail=async(req,res)=>{
    try {
        const userId=req.session.user;
        // const currentEmail= req.session.email;
        const newEmail=req.body.newEmail;
        await User.findByIdAndUpdate(userId,{email:newEmail})
        res.redirect('/user-profile')
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const changePasswordPage=async(req,res)=>{
    try {
        res.render('change-password')
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};
const changePasswordValid=async(req,res)=>{
    try {
        const {email}= req.body;
        const existUser= await User.findOne({email});
        if(existUser){
            const otp= generateOtp();
            const emailSend= await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp=otp,
                req.session.userData=req.body;
                req.session.email=email,
                res.render('change-password-otp');
                console.log("Otp is:",otp);
            }else{
                res.json({
                    success:false,
                    message:"Failed to Send Otp. Pleasetry Again"
                });
            }
        }else{
            res.render("change-password",{
            message:"user with This email nt exist",
            })
        }
    } catch (error) {
        console.log("error in change password validation",error);
        res.redirect('/pageNotFound');
    }
};
const verifyPasswordChangeOtp=async(req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,message:"Otp verification success",redirectUrl:"/reset-password"});
        }else{
            res.json({success:false,message:"Otp not Matching"});
        }
    } catch (error) {
        console.error("error for verify Otp in change password",error);
        res.status(500).json({success:false,message:"Internal server Error.Please try again"})
       
    }
};

const resendPasswordChangeOtp=async(req,res)=>{
    try {
        const otp= generateOtp();
        req.session.userOtp=otp;
        const email=req.session.email;
        console.log("resnding otp to:",email);
        const emailSend= await sendVerificationEmail(email,otp);
        if(emailSend){
            res.status(200).json({success:true,message:"Otp reseding success"});
            console.log("otp is: ",otp);
        }
    } catch (error) {
        console.error("Error for resending otp",error);
        res.status(500).json({success:false,message:"Internal server error"})
    }
};
const addAddressPage=async(req,res)=>{
    try {
        const user=req.session.user;
        res.render('add-address',{user:user})
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};
const postAddAddress=async(req,res)=>{
    try {
        const userId= req.session.user;
        const userData= await User.findOne({_id:userId});
        const {addressType, name, city, landmark, state, pincode, phone, altPhone}=req.body;
        const userAddress= await Address.findOne({userId:userData._id})
        if(!userAddress){
            const newAddress= new Address({
                userId:userData._id,
                address:{addressType, name, city, landmark, state, pincode, phone, altPhone}
            });
            await newAddress.save();
        }else{
            userAddress.address.push({addressType, name, city, landmark, state, pincode, phone, altPhone});
            await userAddress.save();
        }
        res.redirect('/user-profile');
    } catch (error) {
        console.error("Error for adding Address",error);
        res.redirect('/pageNotFound')
    }
};

const editAddress= async(req,res)=>{
    try {
        const addressId= req.query.id;
        const user= req.session.user;
        const currentAddress= await Address.findOne({
            "address._id":addressId,
        });
        if(!currentAddress){
            return res.redirect('/pageNotFount')
        }
        const addressData= currentAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString();
        })
        if(!addressData){
            return res.redirect('/pageNotFount');
        }
        res.render('edit-address',{
            address:addressData,
            user:user
        })


    } catch (error) {
        console.error("Error for rendering edit address page",error);
        res.redirect('/pageNotFound')
    }
};

const postEditAddress=async(req,res)=>{
    try {
        console.log("edit address invoked");
        const data=req.body;
        const addressId=req.query.id;
        const user= req.session.user;
        const findAddress=await Address.findOne({
            "address._id":addressId,
        });
        if(!findAddress){
            return res.redirect('/pageNotFount');
        }
        await Address.updateOne(
            {"address._id":addressId},
            {$set:{
                "address.$":{
                    _id:addressId,
                    addressType:data.addressType,
                    name:data.name,
                    city:data.city,
                    landmark:data.landmark,
                    state:data.state,
                    pincode:data.pincode,
                    phone:data.phone,
                    altPhone:data.altPhone,
                }

            }}
        )
        res.redirect('/user-profile');

    } catch (error) {
        console.error("error for edit Profile page",error);
        res.redirect('/pageNotFound')
    }
};

const deleteAddess=async(req,res)=>{
    try {
  
        const addressId=req.query.id;
        const findAddress= await Address.findOne({"address._id":addressId});

        if(!findAddress){
            return res.status(404).send("Address not Found")
        }
        await Address.updateOne({"address._id":addressId},{$pull:{address:{_id:addressId}}})
        res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
        console.error('error for delete address',error);
        res.redirect('/pageNotFound');
    }
}


module.exports={
    getForgotPasswordPage,
    forgotEmailValid,
    verifyPassForgotOtp,
    getResetPasswordPage,
    resendOtp,
    postNewPassword,
    userProfilePage,
    changeEmail,
    changeEmailValid,
    verifyEmailChangeOtp,
    resendEmailChangeOtp,
    loadNewEmailPage,
    updateEmail,
    changePasswordPage,
    changePasswordValid,
    verifyPasswordChangeOtp,
    resendPasswordChangeOtp,
    addAddressPage,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddess
}