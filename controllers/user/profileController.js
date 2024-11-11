const nodemailer = require('nodemailer');
const User = require("../../models/userSchema");
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
        res.redirect('/pageNotFound');  ``
    }
}

module.exports={
    getForgotPasswordPage,
    forgotEmailValid,
    verifyPassForgotOtp,
    getResetPasswordPage,
    resendOtp,
    postNewPassword,
}