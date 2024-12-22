const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartScema");
const { CommandSucceededEvent } = require("mongodb");
const Coupon = require("../../models/couponSchema");


const calculateCartTotals = (cart) => {
    const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
    const cartRegularPriceTotal = cart.items.reduce((acc, item) => {
        const regularPrice = item.productId.regularPrice || 0;
        return acc + (regularPrice * item.quantity);
    }, 0);
    const cartSalePriceTotal = cart.items.reduce((acc, item) => {
        const salePrice = item.productId.salePrice || 0;
        return acc + (salePrice * item.quantity);
    }, 0);
    const totalDiscount = cartRegularPriceTotal - cartSalePriceTotal;

    return { subtotal, total: subtotal, totalDiscount };
};


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


        const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice || 0, 0);
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
            user: req.user,
            total: total,
            subtotal: subtotal,
            totalDiscount: totalDiscount,

        });
    } catch (error) {
        res.status(500).redirect("/pageNotfound");
    }
};

const addToCart = async (req, res) => {
    try {
        const user = req.session.user;
        
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
            select: "salePrice quantity regularPrice", // Selecting only needed fields for efficiency
        });

        const code = req.session.couponCode;
        const coupon = await Coupon.findOne({ code });
        if (coupon) {
            req.session.discount = 0;
            req.session.discountedTotal = 0;
            delete req.session.couponCode;
        }

        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }
        const item = cart.items.find((item) => item.productId._id.toString() === productId);

        if (!item) {
            return res.status(404).json({ error: "Product not found in cart" });
        }

        const product = item.productId;
        if (action === "increase" && item.quantity < 5 && item.quantity < product.quantity) {
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
        item.totalPrice = product.salePrice * item.quantity;
        await cart.save();

        const data= await calculateCartTotals (cart);
       

        res.json({
            success: true,
            message: "Quantity updated",
            newQuantity: item.quantity,
            newTotalPrice: item.totalPrice,
            subtotal:data.subtotal,
            total:data.total,
            totalDiscount: data.totalDiscount
        });
    } catch (error) {
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
        const code = req.session.couponCode;
        const coupon = await Coupon.findOne({ code });
        if (coupon) {
            req.session.discount = 0;
            req.session.discountedTotal = 0;
            delete req.session.couponCode;

        }

        const itemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId
        );
        if (itemIndex !== -1) {
            cart.items.splice(itemIndex, 1);
            await cart.save();

          const data= await calculateCartTotals (cart);

            res.json({
                success: true,
                message: "Item removed successfully",
                subtotal:data.subtotal,
                total:data.total,
                totalDiscount: data.totalDiscount,
                isExisting: false,
                cartCount: cart.items.length,
            });
        } else {
            res.status(404).json({ error: "Product not found in cart" });
        }
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { code, totalAmount } = req.body;
        const userId = req.session.user;
        const selectedAddressId=req.session.selectedAddress;
        if (!selectedAddressId) {
            return res.status(400).json({ message: "Please select a delivery address" });
        }
        const currentShippingCharge = req.session.shippingCharge || 0;

        const coupon = await Coupon.findOne({ code, userId: { $ne: userId } });
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Invalid Coupen code. Or You are already used this coupon ",
            });
        }

        const currentDate = new Date();
        if (currentDate > coupon.expiryOn) {
            return res.status(400).json({ 
                message: "This Coupen has expired", 
                success: false 
            });
        }

        if (coupon.minimumPrice && totalAmount < coupon.minimumPrice) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ${coupon.minimumPrice} required for this coupon `,
            });
        }

        let discount = 0;
        if (coupon.discountType === "percentage") {
            discount = (coupon.discountValue / 100) * totalAmount;
        } else {
            discount = coupon.discountValue;
        }
        const discountedTotal = totalAmount - discount;

        const shipping = discountedTotal >= 1000 ? 0 : currentShippingCharge;

        req.session.discountedTotal = discountedTotal;
        req.session.discount = discount;
        req.session.couponCode = code;
        req.session.shippingCharge = shipping;

        res.status(200).json({
            success: true,
            discountedTotal,
            discount,
            shipping,
            message: discountedTotal >= 1000
                ? "Coupon applied successfully. Free shipping!"
                : "Coupon applied successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal server Error. Please try again",
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
                return res
                    .status(500)
                    .json({ success: false, message: "Error remove coupen" });
            }
            res.json({ success: true, message: "Coupon removed Successfully" });
        });
    } catch (error) {
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
