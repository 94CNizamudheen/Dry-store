const { json, response, application } = require("express");
const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const { name } = require("ejs");
const Cart = require("../../models/cartScema");
const Wishlist = require("../../models/wishlistSchema");
const ReferralOffer = require("../../models/referralOfferSchema");
const Config= require('../../models/configSchema');
const Order = require("../../models/orderSchema");
const { quadraticCurveTo } = require("pdfkit");
const {generateOrderInvoice}= require('../../utilities/pdf');
const Review =require('../../models/reviewSchema');


async function getMostPopularProducts(limit=5){
    try {
        const popularProducts= Order.aggregate([
            {$unwind:"$orderedItems"},
            {$group:{_id:"$orderedItems.product",totalQuantity:{$sum:"$orderedItems.quantity"}}},
            {$sort:{totalQuantity:-1}},
            {$limit:limit},
            {$lookup:{from:"products",localField:"_id",foreignField:"_id",as:"productDetails"}},
            {$unwind:"$productDetails"},
            {$project:{
                _id:0,
                productId:"$productDetails._id",
                productName:"$productDetails.productName",
                description:"$productDetails.description",
                salePrice:"$productDetails.salePrice",
                regularPrice:"$productDetails.regularPrice",
                productImage:"$productDetails.productImage",
                totalQuantitySold:"$totalQuantity",
                quantity:"$productDetails.quantity",
                category:"$productDetails.category",
                brand:"$productDetails.brand",
                status:"$productDetails.status",
                productOffer:"$productDetails.productOffer"
            }}
        ]);
        return popularProducts
    } catch (error) {
        throw error;
    }
}
async function getAverageRating(productId){
    try {
        const reviews= await Review.find({productId:productId}).populate('userId',"name")
        let totalRating = 0;
        let reviewCount = reviews.length;

        if (reviewCount > 0) {
            totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
        }
        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
        return averageRating;
        return reviews;
        
    } catch (error) {
        throw new Error(error);
        
    }
}


async function getOrderDetails(orderId){
    try {
        const order= await Order.findById(orderId).populate('orderedItems.product').populate('user')
        return{
            orderId:order._Id,
            customerName:order.shippingAddress.name,
            totalPrice:order.totalPrice,
            discount:order.discount,
            finalAmount:order.finalAmount,
            paymentMethod:order.paymentDetails.method,
            orderDate:order.createdOn,
            status:order.status,
            items:order.orderedItems.forEach(item=>({
                productName:item.product.productName,
                quantity: item.quantity,Brand,
                price:item.price,

            })),
            shippingAddress:`${order.shippingAddress.addressType},${order.shippingAddress.city},${order.shippingAddress.state},${order.shippingAddress.pincode}`,
            expectedDeliveryDate:order.expectedDeliveryDate,
        }
    } catch (error) {
        throw new Error(error.message||"Error fetching order details")
    }
}

const addReferralReward=async(userId)=>{
    const user= await User.findById(userId).populate('referredBy');
    const config= await Config.findOne();
    if(user.referredBy){
       
        const referrer=user.referredBy;
        const referrerReward=config. referrerReward;
        const newUserReward=config.newUserReward;


        user.wallet.balance +=newUserReward;
        user.wallet.transaction.push({
            type:'credit',
            amount:newUserReward,
            description:"Referral Reward for signing up.",
        });
        
        referrer.wallet.balance += referrerReward;
        referrer.wallet.transaction.push({
            type:'credit',
            amount:referrerReward,
            description:`Referral reward for referring ${user.name}`
        });
        let rewardAmount=referrerReward+newUserReward;
        await ReferralOffer.findOneAndUpdate(
            {referralCode:user.referralCode},
            {status:'REWARDED',
                completedAt: new Date(),
                rewardAmount:rewardAmount,
                referrer:referrer._id,
                referred:user.id,

            },
                {upsert:true, new:true}
        )
        await user.save();
        await referrer.save();
    }
};

const pageNotFound = async (req, res) => {
    try {
        res.render("404");
    } catch (error) {
        res.redirect("/pageNoteFound");
    }
};

const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user;

        const categories = await Category.find({ isListed: true });
        const brands= await Brand.find({isBlocked:false})
        let productData = await Product.find({
            category: { $in: categories.map((category) => category._id) },
            quantity: { $gte: 0 },
            isBlocked:false,
        })
            .populate("category")
            .populate("brand")
            .sort({ createdAt: -1 });
        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        productData = productData.slice(0, 4);
        const mostPopularProducts = await getMostPopularProducts(5)
        
        
        if (user) {
            const userData = await User.findOne({ _id: user._id });
            return res.render("home", { 
                user: userData,
                 products: productData,
                 brands:brands,
                 popularProducts:mostPopularProducts
                 });
        } else {
            return res.render("home", {
                products: productData,
                brands:brands,
                popularProducts:mostPopularProducts
            });
        }
    } catch (error) {
        res.status(500).send("server error");
    }
};

const loadSignUp = async (req, res) => {
    try {
        return res.render("signup",{message:""});
    } catch (error) {
        res.status(500).send("Server error");
    }
};

const loadShopping = async (req, res) => {
    try {
        const userId = req.session.user;
        const { sort = "newest", category, minPrice, maxPrice ,page=1,search} = req.query;
        const limit=9;
        const skip=(page-1)*limit;
        let userData = null;
        if (userId) {
            userData = await User.findById(userId);
        }
        const categories = await Category.find({ isListed: true });

        const filterQuery = {
            category: { $in: categories.map((category) => category._id) },
            quantity: { $gte: 0 },
            isBlocked:false,
        };

        if (category) {
            filterQuery.category = category;
        }
        if (minPrice !== undefined && maxPrice !== undefined) {
            filterQuery.salePrice = {
                $gte: Number(minPrice),
                $lte: Number(maxPrice),
            };
        }
        if(search){
            filterQuery.$or=[
                {productName:{$regex: new RegExp(search,"i")}},
                {description:{$regex: new RegExp(search,"i")}},
            ]
        }

        let sortQuery = {};
        switch (sort) {
            case "price-asc":
                sortQuery.salePrice = 1;
                break;
            case "price-desc":
                sortQuery.salePrice = -1;
                break;
            case "popularity":
                sortQuery.totalSales = -1;
                break;
            case "rating":
                sortQuery.averageRating = -1;
                break;
            case "name-asc":
                sortQuery.productName = 1;
                break;
            case "name-desc":
                sortQuery.productName = -1;
                break;

            default:
                sortQuery.createdAt = -1;
        }
        const productData = await Product.find(filterQuery)
            .populate("category")
            .populate("brand")
            .sort(sortQuery).limit(limit).skip(skip);

        const priceRanges = [
            { min: 0, max: 200 },
            { min: 200, max: 400 },
            { min: 400, max: 600 },
            { min: 600, max: 800 },
            { min: 800, max: Infinity },
        ];

        const categoryGroups = await Product.aggregate([
            { $match: { quantity: { $gte: 0 } } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryInfo",
                },
            },
            { $unwind: "$categoryInfo" },
            {
                $project: {
                    name: "$categoryInfo.name",
                    count: 1,
                },
            },
        ]);
        const brands= await Brand.find();
        const totalProducts= await Product.countDocuments(filterQuery);
        const totalPage= Math.ceil(totalProducts/limit)
        if (userData) {
            return res.render("shop", {
                products: productData,
                categories: categories,
                categoryGroups,
                priceRanges,
                currentSort: sort,
                currentCategory: category,
                currentPriceRange: { min: minPrice, max: maxPrice },
                user: userData,
                currentPage:Number(page),
                totalPage,
                search:search||'',
                brands,
                
            });
        } else {
            return res.render("shop", {
                products: productData,
                categories: categories,
                categoryGroups,
                priceRanges,
                currentSort: sort||'newest',
                currentCategory: category||'',
                currentPriceRange: { min: minPrice, max: maxPrice },
                currentPage:Number(page),
                totalPage,
                search:search||'',
                brands
            });
        }
    } catch (error) {
        res.status(500).send("Server error");
    }
};

function genarateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODE_MAILER_EMAIL,
                pass: process.env.NODE_MAILER_PASSWORD,
            },
        });
        const info = await transporter.sendMail({
            from: process.env.NODE_MAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `your OTP is ${otp}`,
            html: `<b> your OTP: ${otp} </b>`,
        });
        return info.accepted.length > 0;
    } catch (error) {
        return false;
    }
}

const signup = async (req, res) => {
    try {
        const { name, phone, email, password, cPassword, referralCode  } = req.body;
        if (password !== cPassword) {
            res.render("signup", { message: "Passwords not matching" });
        }
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", {
                message: "User with this email already exists",
            });
        }
        let referredBy=null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (!referrer) {
                return res.render("signup", {
                    message: "Invalid referral code",
                });
            }
            referredBy=referrer._id;
        }
        const genaratedReferralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const otp = genarateOtp();
        
        const emailSend = await sendVerificationEmail(email, otp,);
        if (!emailSend) {
            return res.json("Email error");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        
        req.session.userOtp = otp;
        console.log("otp is:",req.session.userOtp)
        req.session.userData = { name, phone, email, password: hashedPassword ,referralCode:genaratedReferralCode,referredBy};
        res.render("verifyOtp");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const logIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: false, email: email });
        if (!findUser) {
            return res.render("logIn", { message: "User Not Found" });
        }
        if (findUser.isBlocked) {
            return res.render("logIn", { message: "User Blocked by Admin" });
        }
        const userPass = findUser.password;
        const passwordMatch = await bcrypt.compare(password, userPass);
        if (!passwordMatch) {
            return res.render("logIn", {
                message: "Incorrect details please try again",
            });
        } else {
            req.session.user = findUser;
            return res.redirect("/");
        }
    } catch (error) {
        res.render("logIn", { message: "Login failed. Please try again" });
    }
};

const loadLogIn = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("logIn", { message: "" });
        } else {
            res.redirect("/logIn");
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        throw new Error(error);
        
    }
};

const verifyOtp = async (req, res) => {
    try {
        if(req.session.user){
            return res.redirect('/home');
        }
        const { otp,referrerCode } = req.body;

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: user.password,
                referralCode:user.referralCode,
                referredBy:user.referredBy,
                rewardPoints:250,


            });
            if(referrerCode){
                const referrer= await User.findOne({referralCode:referrerCode});
                if(referrer){
                    saveUserData.referredBy=referrer._id;
                    referrer.totalReferrals +=1;
                    await referrer.save();

                    const referralOffer=new ReferralOffer({
                        referrer:referrer.id,
                        referred:saveUserData.id,
                        referralCode:referrerCode,
                        status:"PENDING",
                    });
                    await referralOffer.save();
                }
            }
            await saveUserData.save();
            await addReferralReward(saveUserData._id); 
            req.session.user = saveUserData;
            return res.status(200).json({ 
                success: true,
                redirectUrl: '/' 
            });
          
        } else {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid OTP please try again" 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occured" });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res
                .status(400)
                .json({ success: false, message: "Email not found in session" });
        }
        const otp = genarateOtp();
        req.session.userOtp = otp;
        const emailSend = sendVerificationEmail(email, otp);
        if (emailSend) {
            res
                .status(200)
                .json({ success: true, message: "Resend otp successfully" });
        } else {
            res.status(500).json({
                success: false,
                message: "Resend otp failed. Please try again",
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server Error. Please try again",
        });
    }
};

const logOut = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/logIn");
        });
    } catch (error) {
        return res, redirect("/pageNotFound");
    }
};

const getProductDetials = async (req, res) => {
    try {
        const productId = req.query.id;
        const user = req.session.user;
    
        const productData = await Product.findById(productId)
            .populate("category", "name categoryOffer")
            .populate("brand","brandName");

        const reviews= await Review.find({productId:productId}).populate('userId',"name")
        const averageRating= await getAverageRating(productId);
        
        
        if (productData) {
            return res.render("productDetails", {
                data: productData,
                user: user,
                reviews,
                averageRating,
            });
        }
    } catch (error) {
        throw new Error(error);
        
    }
};
const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const wishlist = await Wishlist.findOne({ userId })
            .populate("products.productId")
            .lean();

        if (!wishlist) {
            return res.render("wishlist", { products: [] });
        }
        const products = wishlist.products.map((item) => ({
            ...item.productId,
            addedOn: item.addedOn,
        }));
        res.render("wishlist", { products });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};
const addToWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login to add items to your wishlist.",
            });
        }

        const userId = req.session.user._id;
        const { productId } = req.body;

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId,
                products: [{ productId }],
            });
            await wishlist.save();

            return res.status(200).json({
                success: true,
                message: "Product added to wishlist.",
                isExisting: false,
                wishlistCount: 1, // New wishlist, so count is 1
            });
        }

        const productExists = wishlist.products.some(
            (product) => product.productId.toString() === productId
        );

        if (productExists) {
            return res.status(400).json({
                success: false,
                message: "Product already exists in wishlist.",
                isExisting: true,
                wishlistCount: wishlist.products.length, // Return current count
            });
        }

        wishlist.products.push({ productId });
        await wishlist.save();

        return res.status(200).json({
            success: true,
            message: "Product added to wishlist.",
            isExisting: false,
            wishlistCount: wishlist.products.length, // Return updated count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update the wishlist.",
        });
    }
};

const removeFromWishlistPage=async(req,res)=>{
    try {
        const userId= req.session.user;
        const {productId}=req.body;
        const wishlist= await Wishlist.findOne({userId});
        if(!wishlist){
            return res.status(404).json({
                message:"wishlist not found",
            })
        }
        wishlist.products= wishlist.products.filter((item)=>item.productId.toString()!==productId);
        await wishlist.save();
        res.status(200).json({message:"Product removed from wishlist"})
    } catch (error) {
        res.status(500).json({message:"Internal Server Error"})
    }
};
const downoladInvoice= async(req,res)=>{
    try {
        const {orderId}=req.body;
        const order = await Order.findOne({ orderId })
            .populate('orderedItems.product', 'productName')
            .populate('user');

        if(!order){
            return res.status(404).json({message:"order not found"});
        }
        const pdfBuffer=await generateOrderInvoice(order);
         // Sending the PDF as a download
         res.setHeader('Content-Type',"application/json");
         res.setHeader('Content-Disposition',`attachment;filename=invoice-${orderId}.pdf`);
         res.send(pdfBuffer);

    } catch (error) {
        res.status(500).json({suceess:false,message:"internal server Error genarate invoice"});

    }
};
const loadSuperCoin=async(req,res)=>{
    try {
        const userId=req.session.user;
        const userData = await User.findById(userId)
        res.render('superCoins',{
            user:userData
        })
        
    } catch (error) {
        res.redirect('/404');
    }
};
const scrachReward = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        
        if(user.rewardPoints < 250) {
            return res.json({
                success: false, 
                message: "Sorry, you don't have enough balance for Scratch. Shop and earn more Coins"
            });
        }
        
        const rewards = Array.from({length: 90}, (_, i) => ({
            amount: i + 10,

        }));
        
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        
        user.rewardPoints -= 250;
        user.wallet.balance += reward.amount;
        await user.save();
        const remainWalletBalance=  user.wallet.balance;
        const remainRewardPoints=user.rewardPoints;

        res.json({
            success: true,
            remainWalletBalance,
            remainRewardPoints,
            reward: {
                amount: reward.amount,
                message: reward.message
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred. Please try again later."
        });
    }
};
const submitReview=async(req,res)=>{
    try {
        const{productId,comment,rating}=req.body;
        const userId= req.session.user;
        const review = new Review({
            productId:productId,
            comment:comment,
            userId:userId,
            date:new Date,
            rating:rating,
            userName:req.session.user.name
        });
        await review.save();
        await Product.findByIdAndUpdate(productId,{$push:{reviews:review._id}});
        res.redirect(`/productDetails?id=${productId}`);
    } catch (error) {
        res.status(500).send('An error occurred while submitting your review.');
    }
};


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignUp,
    loadShopping,
    signup,
    loadLogIn,
    logIn,
    verifyOtp,
    resendOtp,
    loadWishlist,
    logOut,
    getProductDetials,
    addToWishlist,
    removeFromWishlistPage,
    downoladInvoice,
    loadSuperCoin,
    scrachReward,
    submitReview
 
};
