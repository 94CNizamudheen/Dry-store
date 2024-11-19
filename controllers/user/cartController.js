const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartScema");

const loadCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/logIn");
        }
        const userId = req.session.user;
        const cartedProducts = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            model: "Product",
            select: "productName productImage salePrice description",
        });

        let cartTotal = 0;
        if (cartedProducts && cartedProducts.items.length > 0) {
            cartTotal = cartedProducts.items.reduce((total, item) => {
                return total + item.price * item.quantity;
            }, 0);
        }
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart) {
            return res.status(404).json({ error: "Cart not Found" });
        }
        const subtotal = cart.items.reduce((acc, item) => {
            return acc + item.totalPrice;
        }, 0);

        const shipping = 0;
        const total = subtotal + shipping;

        res.render("cart", {
            cart: cartedProducts,
            isEmpty: !cartedProducts || cartedProducts.items.length === 0,
            cartTotal: cartTotal.toFixed(2),
            user: req.user,
            total: total,
            subtotal: subtotal,
        });
    } catch (error) {
        console.error("Error loading cart page:", error);
        res.status(500).redirect("/pageNotfound");
    }
};

const addToCart = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Please login to add items to the cart",
            });
        }

        const userId = req.user._id;
        const { productId, quantity } = req.body;

        // Validate product ID
        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID or quantity",
            });
        }

        // Fetch product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        let cart = await Cart.findOne({ userId });

        // Check if product is already in the cart
        if (cart) {
            const existingItem = cart.items.find(
                item => item.productId.toString() === productId.toString()
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

        // Check stock availability
        if (quantity > product.quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.quantity} items are available in stock`,
            });
        }

        // Add product to cart
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        cart.items.push({
            productId,
            quantity: parseInt(quantity),
            price: product.salePrice,
            totalPrice: product.salePrice * parseInt(quantity),
        });

        await cart.save();

        // Update stock on frontend
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
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }

        const item = cart.items.find(
            (item) => item.productId.toString() === productId
        );
        if (item) {
            // Find the product in the database
            const product = await Product.findById(productId);
        
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
        
            // Update item total price
            item.totalPrice = item.price * item.quantity;
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
                message: "Quantity updated",
                newQuantity: item.quantity,
                newTotalPrice: item.totalPrice,
                subtotal,
                total,
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

module.exports = {
    loadCart,
    addToCart,
    updateQuantity,
    removeItem,
};
