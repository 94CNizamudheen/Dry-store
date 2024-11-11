const User= require('../../models/userSchema');


const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }
        
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page, 10); // Ensure page is an integer
        }
        
        const limit = 3;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } }, // Case-insensitive search
                { email: { $regex: '.*' + search + '.*', $options: 'i' } }
            ]
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ]
        });

        const totalPages = Math.ceil(count / limit);

        // Pass the required data to the view
        res.render('customers', { data: userData, totalPages, currentPage: page });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};

const customerBlocked=async(req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}},{new:true});
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect('/pageError')
    }
};
const customerUnBlocked=async(req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}},{new:false});
        res.redirect('/admin/users');
    } catch (error) {
        res.redirect('/pageError')
    }
};


module.exports={
    customerInfo,
    customerBlocked,
    customerUnBlocked
}
