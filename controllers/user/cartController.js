const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartScema");
const { CommandSucceededEvent } = require("mongodb");
const Coupon = require("../../models/couponSchema");

const loadCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/logIn");
        }
        const userId = req.session.user;

        const cartedProducts = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            model: "Product",
            select: "productName productImage salePrice description regularPrice",
        });
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart) {
            return res.render("cart", {
                isEmpty: !cartedProducts || cartedProducts.items.length === 0,
            });
        }

        let cartTotal = 0;
        if (cartedProducts && cartedProducts.items.length > 0) {
            cartTotal = cartedProducts.items.reduce((total, item) => {
                return total + item.price * item.quantity;
            }, 0);
        }
        
        

        const subtotal = parseFloat(cartTotal.toFixed(2));
        const shipping = 0;
        const total = subtotal + shipping;
        const totalDiscount = cart.items.reduce((sum, item) => {
            const regularPrice = item.productId?.regularPrice || 0;
            const salePrice = item.productId?.salePrice || 0;
            const quantity = item.quantity || 0;
            return sum + ((regularPrice - salePrice) * quantity);
        }, 0);
        res.render("cart", {
            cart: cartedProducts,
            isEmpty: !cartedProducts || cartedProducts.items.length === 0,
            cartTotal: cartTotal.toFixed(2),
            user: req.user,
            total: total,
            subtotal: subtotal,
            totalDiscount: totalDiscount,
        
        });
    } catch (error) {
        console.error("Error loading cart page:", error);
        res.status(500).redirect("/pageNotfound");
    }
};

const addToCart = async (req, res) => {
    try {
        const user = req.session.user;
        console.log(user)
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Please login to add items to the cart",
            });
        }

        const userId = req.session.user._id;
        const { productId, quantity } = req.body;
        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID or quantity",
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        let cart = await Cart.findOne({ userId });

        if (cart) {
            const existingItem = cart.items.find(
                (item) => item.productId.toString() === productId.toString()
            );

            if (existingItem) {
                return res.json({
                    success: true,
                    isExisting: true,
                    message: "This product is already in your cart.",
                    cartCount: cart.items.length,
                });
            }
        }

        if (quantity > product.quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.quantity} items are available in stock`,
            });
        }
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        cart.items.push({
            productId,
            quantity: parseInt(quantity),
            // price: product.salePrice,
            totalPrice: product.salePrice * parseInt(quantity),
        });

        await cart.save();
        const remainingStock = product.quantity - quantity;

        res.status(200).json({
            success: true,
            isExisting: false,
            message: "Product added to cart successfully",
            cartCount: cart.items.length,
            remainingStock,
        });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add item to cart",
        });
    }
};

const updateQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            model: "Product",
            select: "salePrice ",
        });
        const code = req.session.couponCode;
        const coupon = await Coupon.findOne({ code });
        if (coupon) {
            return res.status(400).json({
                success: false,
                error: "you can't update the cart. Remove coupon for update cart",
            });
        }
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }
        console.log('productId',productId);
        const item = cart.items.find(
            (item) => productId);
        if (!item) {
            return res.status(404).json({ error: "Product not found in cart" });
        }
        if (item) {
            const product = await Product.findById(productId);

            if (
                action === "increase" &&
                item.quantity < 5 &&
                item.quantity < product.quantity
            ) {
                item.quantity += 1;
            } else if (action === "decrease" && item.quantity > 1) {
                item.quantity -= 1;
            } else if (action === "increase" && item.quantity >= 5) {
                return res.status(400).json({
                    error: "Maximum cart limit reached (5 items per product)",
                });
            } else if (action === "increase" && item.quantity >= product.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock. Only ${product.quantity} available in stock.`,
                });
            } else if (action === "decrease" && item.quantity <= 1) {
                return res.status(400).json({
                    error: "Minimum quantity reached (1)",
                });
            }
            item.totalPrice = item.productId.salePrice * item.quantity;
            await cart.save();
            const subtotal = cart.items.reduce(
                (acc, item) => acc + item.totalPrice,
                0
            );
            
            const shipping = 0;
            const total = subtotal + shipping;
            const totalDiscount = cart.items.reduce((sum, item) => {
                const regularPrice = item.productId?.regularPrice || 0;
                const salePrice = item.productId?.salePrice || 0;
                return sum + ((regularPrice - salePrice) * item.quantity);
            }, 0);

            res.json({
                success: true,
                message: "Quantity updated",
                newQuantity: item.quantity,
                newTotalPrice: item.totalPrice,
                subtotal,
                total,
                totalDiscount: totalDiscount.toFixed(2),
            });
        } else {
            res.status(404).json({ error: "Product not found in cart" });
        }
    } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ error: "Server error" });
    }
};

const removeItem = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId
        );
        if (itemIndex !== -1) {
            cart.items.splice(itemIndex, 1);
            await cart.save();

            // Calculate new cart totals
            const subtotal = cart.items.reduce(
                (acc, item) => acc + item.totalPrice,
                0
            );
            const shipping = 0;
            const total = subtotal + shipping;

            res.json({
                success: true,
                message: "Item removed successfully",
                subtotal,
                total,
            });
        } else {
            res.status(404).json({ error: "Product not found in cart" });
        }
    } catch (error) {
        console.error("Error removing item:", error);
        res.status(500).json({ error: "Server error" });
    }
};

const applyCoupon = async (req, res) => {
    try {
        console.log("apply copon invoked");
        const { code, totalAmount } = req.body;
        const userId = req.session.user;

        const coupon = await Coupon.findOne({ code, userId: { $ne: userId } });
        if (!coupon) {
            return res
                .status(404)
                .json({
                    success: false,
                    message: "Invalid Coupen code. Or You are already used this coupon ",
                });
        }
        const currentDate = new Date();
        if (currentDate > coupon.expiryOn) {
            return res
                .status(400)
                .json({ message: "This Coupen has expired", success: false });
        }
        if (coupon.minimumPrice && totalAmount < coupon.minimumPrice) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ${coupon.minimumPrice} required for this coupon `,
            });
        }

        // if(coupon.usageLimit<=0){
        //     return res.status(400).json({message:"coupon usage limit Exceeded",success:false});
        // };
        let discount = 0;
        if (coupon.discountType === "percentage") {
            discount = (coupon.discountValue / 100) * totalAmount;
        } else {
            discount = coupon.discountValue;
        }
        const discountedTotal = totalAmount - discount;
        req.session.discountedTotal = discountedTotal;
        req.session.discount = discount;
        req.session.couponCode = code;
        res
            .status(200)
            .json({
                success: true,
                discountedTotal,
                discount,
                message: "Coupen applied successfully",
            });
    } catch (error) {
        console.error("Error for appling coupon", error);
        res
            .status(500)
            .json({
                message: "Internal server Error.Please try again",
                success: false,
            });
    }
};
const removeCoupon = async (req, res) => {
    try {
        req.session.discount = 0;
        req.session.discountedTotal = 0;
        delete req.session.couponCode;

        req.session.save((err) => {
            if (err) {
                console.error("session save error", err);
                return res
                    .status(500)
                    .json({ success: false, message: "Error remove coupen" });
            }
            res.json({ success: true, message: "Coupon removed Successfully" });
        });
    } catch (error) {
        console.error("Error for remove coupon", error);
        res.json({ success: false, message: "Internal server Error" });
    }
};

module.exports = {
    loadCart,
    addToCart,
    updateQuantity,
    removeItem,
    removeCoupon,
    applyCoupon,
};
