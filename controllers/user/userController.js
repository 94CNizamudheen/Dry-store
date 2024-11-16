const { json, response } = require("express");
const User= require("../../models/userSchema");
const nodemailer= require('nodemailer');
const bcrypt= require('bcrypt');
const env = require('dotenv').config()
const Category= require('../../models/categorySchema');
const Brand= require('../../models/brandSchema');
const Product = require("../../models/productSchema");



const pageNotFound= async(req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect("/pageNoteFound")
    }
}


const  loadHomepage= async(req,res)=>{
    try {
        const user= req.session.user;
        const categories= await Category.find({isListed:true});
        let productData= await Product.find({
            category:{$in:categories.map(category=>category._id)},quantity:{$gte:0}
        }).populate('category').populate("brand").sort({createdAt:-1});
        productData.sort((a,b)=>new Date(b.createdOn)- new Date(a.createdOn));
        productData=productData.slice(0,4);
        

        if(user){
            const userData= await User.findOne({_id:user._id});
            return res.render("home",{user:userData,products:productData});     
        }
        else{
            return res.render('home',{products:productData})    
        }
    } catch (error) {
        console.log("Home page not Found");
        res.status(500).send("server error");
    }
};


const loadSignUp=async(req,res)=>{
    try {
        return res.render('signUp',);
    } catch (error) {
        console.log("Home page not loading:",error);
        res.status(500).send('Server error');
    }
};

const loadShopping=async(req,res)=>{
    try {
        const userId= req.session.user;
        let userData=null;
        if(userId){
            userData= await User.findById(userId);
        }
        const categories=await Category.find({isListed:true});
        const productData= await Product.find({
            category:{$in:categories.map(category=>category._id)},quantity:{$gte:0},
        }).populate('category').populate('brand').sort({createdAt:-1});
        
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
        
        if(userData){
            return res.render('shop',{
                user:userData,
                products:productData,
                categories:categories
            })
        }else{
            return  res.render('shop',{
                 products:productData,
                 categories:categories
                })
        }


       
    } catch (error) {
        console.log("shopping Page not loading:",error);
        res.status(500).send('Server error');
    }
};


function genarateOtp(){
    return  Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp){
    try {
        const transporter= nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODE_MAILER_EMAIL,
                pass:process.env.NODE_MAILER_PASSWORD,
            }
        });
        const info= await transporter.sendMail({
            from:process.env.NODE_MAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`your OTP is ${otp}`,
            html:`<b> your OTP: ${otp} </b>`,

        })
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending Mail",error);
        return false;

    }
}

const signUp= async(req,res)=>{
    try {
        const{name,phone,email,password,cPassword}= req.body;
        if(password!==cPassword){
            res.render('signUp',{message:"Passwords not matching"});
        }
        const findUser= await User.findOne({email});
        if(findUser){
            return res.render('signUp',{message:"User with this email already exists"})
        }
        const otp= genarateOtp();
        const emailSend= await sendVerificationEmail(email,otp);
        if(!emailSend){
            return res.json("Email error");
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        req.session.userOtp=otp;
        req.session.userData={name,phone,email,password:hashedPassword};
        res.render('verifyOtp');
        console.log("OTP sent",otp);

    } catch (error) {
        console.error("SignUp Error",error);
        res.redirect('/pageNotFound')
    }
};



const logIn= async(req,res)=>{
    try {
        const{email,password}=req.body;
        const findUser= await User.findOne({isAdmin:false,email:email});
        if(!findUser){
            return res.render('logIn',{message:"User Not Found"});
        }
        if(findUser.isBlocked){
            return res.render('logIn',{message:'User Blocked by Admin'});
        }
        const userPass = findUser.password
        const passwordMatch= await bcrypt.compare(password,userPass);
        if(!passwordMatch){
            return res.render('logIn',{message:"Incorrect details please try again"});
        }else{
            req.session.user= findUser;
            return res.redirect('/')
        }
     
    } catch (error) {
        console.error("Login error",error);
        res.render('logIn',{message:'Login failed. Please try again'})

    }
};



const loadLogIn= async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render('logIn',{message:''});
        }else{
            res.redirect('/logIn');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
       
    }
};


const securePassword= async(password)=>{
    try {
        const passwordHash= await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        
    }
}

const verifyOtp=async(req,res)=>{
    try {
        const{otp}= req.body;
        console.log(otp);

        if(otp===req.session.userOtp){
            const user= req.session.userData;
            const passwordHash= await securePassword(user.password);
            const saveUserData= new User({
                name: user.name,
                email:user.email,
                phone:user.phone,
                password:user.password,
            });
            await saveUserData.save();
            req.session.user=saveUserData._id;
            res.json({success:true,redirectUrl:"/"});
        }else{
            res.status(400).json({success:false,message:"Invalid OTP please try again"});
        }
        
    } catch (error) {
        console.error('Error verifying Otp',error);
        res.status(500).json({success:false,message:"An error occured"});
    }
};

const resendOtp= async(req,res)=>{
    try {
        const{email}= req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"});
        }
        const otp = genarateOtp();
        req.session.userOtp=otp;
        const emailSend=sendVerificationEmail(email,otp);
        if(emailSend){
            console.log("Resend Otp:",otp);
            res.status(200).json({success:true,message:"Resend otp successfully"});
        }else{
            res.status(500).json({success:false,message:"Resend otp failed. Please try again"});

        }

    } catch (error) {
        console.error("Resend otp Failed",error);
        res.status(500).json({success:false,message:"Internal server Error. Please try again"})
    }
};

const logOut= async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destry error",err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect('/logIn');
        })
    } catch (error) {
        console.log('logout error',error);
        return res,redirect('/pageNotFound');
    }
}

const getProductDetials = async (req,res) => {
    try {
        const productId=req.query.id;
        const user= req.session.user;
        console.log(user)
        const productData = await Product.findById(productId).populate("category").populate('brand');
        if(productData){
            return res.render("productDetials",{data:productData,user:user})
        }
    } catch (error) {
        console.log("error in product detilas page",error)
    }
}
module.exports={
    loadHomepage,
    pageNotFound,
    loadSignUp,
    loadShopping,
    signUp,
    loadLogIn,
    logIn,
    verifyOtp,
    resendOtp,

    logOut,
    getProductDetials
}