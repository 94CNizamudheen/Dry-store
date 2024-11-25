const User= require('../../models/userSchema');
const Order= require('../../models/orderSchema');
const Product= require('../../models/productSchema');
const Brand= require('../../models/brandSchema');
const {genaratePDF}= require('../../utilities/pdf');
const {genarateExcel}= require('../../utilities/excel');


const LoadReportsPage=async(req,res)=>{
    try {
        const orders= await Order.find();
        const products= await Product.find();
        const users= await User.find();
        res.render('reports',{
            orders,products,users
        })
    } catch (error) {
        console.error('error for load reports page',error);
        res.redirect('/pageError')
    }
}



module.exports={
    LoadReportsPage,
}