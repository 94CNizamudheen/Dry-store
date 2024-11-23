const { default: mongoose } = require('mongoose');
const Coupon= require('../../models/couponSchema');


const loadCouponPage= async(req,res)=>{
    try {
        const page= parseInt(req.query.page)||1;
        const limit= parseInt(req.query.limit)||10;
        const skip= (page-1)*limit;
        const totalCoupons= await Coupon.countDocuments();
        const coupons= await Coupon.find({}).sort({createdOn:-1}).skip(skip).limit(limit);
        res.render('coupon',{
            coupons:coupons,
            totalPages:Math.ceil(totalCoupons/limit),
            currentPage:page,
        });
    } catch (error) {
        res.redirect('/pageError');
    }
};
const createCoupon=async(req,res)=>{
    try {
        console.log("create coupen invoked");
        const{code,expiryOn,discountType,discountValue,minimumPrice,usageLimit,isList}=req.body;
        console.log("form :",{code,expiryOn,discountType,discountValue,minimumPrice,usageLimit,isList});
        if(!code||!expiryOn||!discountType||!discountValue||!usageLimit){
            return res.status(400).json({message:"All required feilds must be filled."});
        }
        const existingCoupen=await Coupon.findOne({code});

        if(existingCoupen){
            return res.status(409).json({message:"Coupen already exists."});
        }
        const coupon= new Coupon({
            code,
            expiryOn: new Date(expiryOn),
            discountType,
            discountValue,
            minimumPrice: minimumPrice||0,
            usageLimit,
            isList:isList||false,
        })
        await coupon.save();
        
        res.status(201).json({message:"Coupen created successfully!"});
        
    } catch (error) {
        console.error('Error for creating coupen',error);
        res.status(500).json({message:"Server error. Please try again"});
    }
};

const updateCoupon=async(req,res)=>{
    try {
        console.log('update Coupen invoked');
        const {id}=req.params;
        const{code,expiryOn,discountType,discountValue,minimumPrice,usageLimit,isList}=req.body;
        const coupon= await Coupon.findById(id);
        if(!coupon){
            return res.status(404).json({message:"Coupon Not Found"});
        }
        coupon.code= code||coupon.code;
        coupon.expiryOn= expiryOn||coupon.expiryOn;
        coupon.discountType=discountType||coupon.discountType;
        coupon.discountValue=discountValue!==undefined ? discountValue :coupon.discountValue;
        coupon.minimumPrice=minimumPrice!==undefined ?minimumPrice: coupon.minimumPrice;
        coupon.usageLimit= usageLimit!==undefined ? usageLimit : coupon.usageLimit;
        coupon.isList= isList!==undefined ? isList : coupon.isList;

        await coupon.save();
        res.status(200).json({message:"Coupon updated successfully"})
    } catch (error) {
        console.error("Error for updating Coupon",error);
        res.status(500).json({message:"Internal server Error"})
    }

};
const removeCoupon= async(req,res)=>{
    try {

        console.log('remove Coupen invoked');
        const {id}= req.params;
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({message:"Invalid coupon Id"})
        }
        const coupon= await Coupon.findByIdAndDelete(id);
        if(!coupon){
            return res.status(404).json({message:"Coupon not Found"});
        }
        res.status(200).json({message:"Coupen Removed Successfully"});
    } catch (error) {
        console.error('Error for remove coupen',error);
        res.status(500).json({message:"Internal server error"});
    }
}


module.exports={
loadCouponPage,
createCoupon,
updateCoupon,
removeCoupon
}