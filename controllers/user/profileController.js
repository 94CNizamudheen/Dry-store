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
        return true;

    } catch (error) {
        return false;
    }
};

const securePassword=async(password)=>{
    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        return hashedPassword;
    } catch (error) {
     throw new Error(error);
     
    }
}


const getForgotPasswordPage= async(req,res)=>{
    try {
        res.render('forgotPassword');
    } catch (error) {
        res.redirect('/pageNotFound')
    }
};

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email });
        
        if (findUser) {
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email, otp);
            
            if (emailSend) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.json({
                    success: true,
                    message: "OTP sent successfully"
                });
            } else {
                res.json({
                    success: false,
                    message: "Failed to send OTP. Please try again"
                });
            }
        } else {
            res.json({
                success: false,
                message: "User with this email does not exist"
            });
        }
    } catch (error) {
        res.json({
            success: false,
            message: "An unexpected error occurred"
        });
    }
};
const getForgotPasswordOtp= async(req,res)=>{
    try {
        res.render('forgotPassOtp')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const verifyPassForgotOtp= async(req,res)=>{
    try {
        const enteredOtp= req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/resetPassword"})
        }else{
            res.json({success:false,message:"Otp not Matching"});
        }
        
    } catch (error) {
        res.status(500).json({success:false,message:"An error Occured. Please try Again"})
    }
};

const getResetPasswordPage=async(req,res)=>{
    try {
        const currentEmail= 
        res.render('resetPassword');
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const resendOtp= async(req,res)=>{
    try {
        const otp= generateOtp();
        req.session.userOtp=otp;
        const email= req.session.email;
        const emailSend= await sendVerificationEmail(email,otp)
        if(emailSend){
            res.status(200).json({success:true,message:"Resend message succussful"})

        }
    } catch (error) {
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

const postNewPassword=async(req,res)=>{
    try {
        const {newPassword,confirmPassword} =req.body;
        const email=req.session.email;
        if(newPassword===confirmPassword){
            const hashedPassword=await securePassword(newPassword);
            const update = await User.findOneAndUpdate({ email:email},{$set:{password:hashedPassword}},{ new: true });

            return res.redirect('/logIn')
        }else{
            res.render('resetPassword',{
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
            
            
            res.render('userProfile',{
                user:userData,
                userAddress:addressData,
                userOrders:orders,
            });   
        } catch (error) {
            res.redirect('/pageNotFound')
        }
    }

const changePasswordPage=async(req,res)=>{
    try {
        res.render('changePassword')
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
                res.render('changePasswordOtp');
            }else{
                res.json({
                    success:false,
                    message:"Failed to Send Otp. Pleasetry Again"
                });
            }
        }else{
            res.render("changePassword",{
            message:"user with This email nt exist",
            })
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};
const verifyPasswordChangeOtp=async(req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,message:"Otp verification success",redirectUrl:"/resetPassword"});
        }else{
            res.json({success:false,message:"Otp not Matching"});
        }
    } catch (error) {
        res.status(500).json({success:false,message:"Internal server Error.Please try again"})
       
    }
};

const resendPasswordChangeOtp=async(req,res)=>{
    try {
        const otp= generateOtp();
        req.session.userOtp=otp;
        const email=req.session.email;
        const emailSend= await sendVerificationEmail(email,otp);
        if(emailSend){
            res.status(200).json({success:true,message:"Otp reseding success"});
        }
    } catch (error) {
        res.status(500).json({success:false,message:"Internal server error"})
    }
};
const addAddressPage=async(req,res)=>{
    try {
        const user=req.session.user;
        res.render('addAddress',{user:user})
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
        res.redirect('/userProfile');
    } catch (error) {
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
        res.render('editAddress',{
            address:addressData,
            user:user
        })


    } catch (error) {
        res.redirect('/pageNotFound')
    }
};

const postEditAddress=async(req,res)=>{
    try {
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
        res.redirect('/userProfile');

    } catch (error) {
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
        res.redirect('/pageNotFound');
    }
}
const about=async(req,res)=>{
    try {
        res.render('about')
    } catch (error) {
        res.redirect('/404')
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
    changePasswordPage,
    changePasswordValid,
    verifyPasswordChangeOtp,
    getForgotPasswordOtp,
    resendPasswordChangeOtp,
    addAddressPage,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddess,
    about
}