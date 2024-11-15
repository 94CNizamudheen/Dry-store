const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    return res.render("admin-logIn", { message: null });
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
                    return res.render("admin-logIn", { message: "invalid details" });
                }
            } else {
                return res.render("admin-logIn", {
                    message: "Invalid details",
                });
            }
        } else {
            return res.render("admin-logIn", {
                message: "Admin not found with this email",
            });
        }
    } catch (error) {
        console.log("Admin Login error", error);
        return res.redirect("/pageError");
    }
};

const loadashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            return res.render("dashboard");
        } catch (error) {
            res.redirect("/pageError");
        }
    }
};

const pageError = async (req, res) => {
    res.render("pageError");
};

const logOut = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("error for session destroy");
                return res.redirect("/pageError");
            }
            res.redirect("/admin/logIn");
        });
    } catch (error) {
        console.log("Error for logOut", error);
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
