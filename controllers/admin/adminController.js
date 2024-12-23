const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Order = require("../../models/orderSchema");
const Category = require('../../models/categorySchema');

const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    return res.render("adminLogIn", { message: null });
};

const logIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email: email, isAdmin: true });

        if (admin) {
            if (password && admin.password) {
                const passwordMatch = await bcrypt.compare(password, admin.password);

                if (passwordMatch) {
                    req.session.admin = true;
                    return res.redirect("/admin/dashboard");
                } else {
                    return res.render("adminLogIn", { message: "invalid details" });
                }
            } else {
                return res.render("adminLogIn", {
                    message: "Invalid details",
                });
            }
        } else {
            return res.render("adminLogIn", {
                message: "Admin not found with this email",
            });
        }
    } catch (error) {
        return res.redirect("/pageError");
    }
};

const loadashboard = async (req, res) => {
    try {
        const admins = await User.find({ isAdmin: true });
        const ordersCount = await Order.countDocuments();
        // const products= await Product.find();
        const productCount = await Product.countDocuments();
        // const category= await Category.find();
        const categoryCount = await Category.countDocuments();
        const brandCount = await Brand.countDocuments();
        // const brand= await Brand.find();
        const totalRevenue = await Order.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } }]);

        const topTenproduct = await Order.aggregate([
            { $unwind: "$orderedItems" },
            { $group: { _id: "$orderedItems.product", totalQuantityOrdered: { $sum: "$orderedItems.quantity" }, orderCount: { $sum: 1 } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
            { $unwind: "$productDetails" },
            { $sort: { totalQuantityOrdered: -1 } },
            { $limit: 10 },
            { $project: { productId: "$_id", productName: "$productDetails.productName", totalQuantityOrdered: 1, orderCount: 1, brand: "$productDetails.brand", category: "$productDetails.category" } }
        ]);
        const topCategories = await Order.aggregate([
            { $unwind: "$orderedItems" },
            { $group: { _id: "$orderedItems.product", totalQuantityOrdered: { $sum: "$orderedItems.quantity" } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
            { $unwind: "$productDetails" },
            { $lookup: { from: "categories", localField: "productDetails.category", foreignField: "_id", as: "categoryDetails" } },
            { $unwind: "$categoryDetails" },
            { $group: { _id: "$categoryDetails._id", name: { $first: "$categoryDetails.name" }, totalQuantityOrdered: { $sum: "$totalQuantityOrdered" } } },
            { $sort: { totalQuantityOrdered: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, name: 1, totalQuantityOrdered: 1 } }

        ]);
        const topBrands = await Order.aggregate([
            { $unwind: "$orderedItems" },
            { $group: { _id: "$orderedItems.product", totalQuantityOrdered: { $sum: "$orderedItems.quantity" } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
            { $unwind: "$productDetails" },
            { $lookup: { from: "brands", localField: "productDetails.brand", foreignField: "brandName", as: "brandDetails" } },
            { $unwind: "$brandDetails" },
            { $group: { _id: "$brandDetails.brandName", totalQuantityOrdered: { $sum: "$totalQuantityOrdered" } } },
            { $sort: { totalQuantityOrdered: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, brandName: "$_id", totalQuantityOrdered: 1 } },
        ]);

        const revenue = totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0;
        return res.render("dashboard", {
            ordersCount,
            categoryCount,
            productCount,
            brandCount,
            totalRevenue: revenue,
            topProducts: topTenproduct,
            topCategories,
            topBrands,
            admins,
        });
    } catch (error) {
        res.redirect("/pageError");
    }

};

const pageError = async (req, res) => {
    res.render("pageError");
};

const logOut = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.redirect("/pageError");
            }
            res.redirect("/admin/logIn");
        });
    } catch (error) {
        res.redirect("/pageError");
    }
};

module.exports = {
    loadLogin,
    logIn,
    loadashboard,
    pageError,
    logOut,
};
