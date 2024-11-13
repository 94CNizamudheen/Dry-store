const User= require('../../models/userSchema');
const Product= require('../../models/productSchema');
const Cart= require('../../models/cartScema');


const loadCart= async (req,res)=>{
    try {
        const useriId=req.session.userId;
        const cartedProducts= await Cart.findOne({userId:useriId}).populate("Product");
        
        res.render('cart',{
            cart:cartedProducts,
        })
    } catch (error) {
        
    }
}
const addToCart=async(req,res)=>{
    try {
        const userId= req.session.user._id;
        const {productId}=req.body;
        console.log(userId,productId);
        const quantity=req.body.quantity||1;
        const product= await Product.findOne({_id:productId});
        if(!product){
            return res.status(404).json({message:"Product Not Found"})
        }
        let cart= await Cart.findOne({userId});
        if(cart){
            const itemIndex= cart.items.findIndex(item=>item.productId.equals(productId));
            if( itemIndex> -1 ){
                cart.items[itemIndex].quantity +=quantity;
                cart.items[itemIndex].totalPrice += product.salePrice*quantity;
            }else{
                cart.items.push({
                    productId,
                    quantity,
                    price:product.salePrice,
                    totalPrice:product.salePrice*quantity,
                })
            }
        }else{
            cart= new Cart({
                userId,
                items:[{
                    productId,
                    price:product.salePrice,
                    totalPrice:product.salePrice*quantity
                }]
                
            });
        }
        await cart.save();
        res.json({message:"Item added to cart Successfully",})

    } catch (error) {
        console.error("error for add to cart",error);
        res.status(500).json({message:"Internal server error"})
    }
}


module.exports={
    loadCart,
    addToCart,
}
