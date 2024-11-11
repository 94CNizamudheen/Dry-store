const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        
        const categoryData = await Category.find({})
                                           .sort({ mfg: -1 })
                                           .skip(skip)
                                           .limit(limit);
                                           
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        
        res.render('category', {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
        });
    } catch (error) {
        console.error("Error fetching category info:", error);
        res.redirect('/pageError');
    }
};

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const existingCategory = await Category.findOne({ name });
        
        if (existingCategory) {
            return res.status(409).json({ error: 'Category already exists' });
        }
        
        const newCategory = new Category({
            name,
            description,
        });
        
        await newCategory.save();
        return res.json({ message: "Category added successfully" });
        
    } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const addCategoryOffer= async(req,res)=>{
    try {
        console.log("add category offer enterd")
        const percentage= parseInt(req.body.percentage);
        const categoryId= req.body.categoryId;
        console.log(`percnetage ${percentage}`);
        console.log(`cat ${categoryId}`);

        if (isNaN(percentage) || percentage <= 0) {
            return res.status(400).json({ status: false, message: "Invalid percentage value" });
        }

        const category= await Category.findById(categoryId);
        console.log(category);
        
        if(!category){
            return res.status(404).json({status:false,message:"category not found"})
        }
        const products= await Product.find({category:category._id});
        const hasProductOffer= products.some((product)=>product.productOffer > percentage);
        if(hasProductOffer){
            return res.json({status:false,message:"Product within this category already have a product offers" })
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});
        for(const product of products){
            product.productOffer=0;
            product.salePrice=product.regularPrice;
            await product.save();

        } 
        res.json({status:true ,message: "Category offer added successfully"});
    
    }catch (error) {
        res.status(500).json({status:false,message:"Internal server Error"})
    }
};


const removeCategoryOffer=async(req,res)=>{
    try {
        const categoryId= req.body.categoryId;
        const category= await Category.findById(categoryId);
        if(!category){
           return res.status(404).json({status:false,message:"Category not Found"});
        }
        const percentage=category.categoryOffer;
        const products=await Product.find({category:categoryId});
        if(products.length>0){
            for(const product of products){
                product.salePrice +=Math.floor(product.regularPrice*(percentage/100));
                product.productOffer=0;
                await product.save();
            }
        }
        category.categoryOffer=0;
        await category.save();
        res.json({status:true, message: "Category offer removed successfully"});


    } catch (error) {
        return res.status(500).json({status:false,message:"Internal server error"});

    }
};
const getListCategory=async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect('/pageError');
    }
};
const getUnListCategory=async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect('/pageError');
    }
};

const getEditCategory= async(req,res)=>{
    try {
        const id=req.query.id;
        const category=  await Category.findOne({_id:id});
        return res.render('edit-category',{category:category})
    } catch (error) {
        res.redirect('/pageError')
    }
};
const editCategory=async(req,res)=>{
    try {
        let id= req.params.id;
        const {name,description}=req.body;
        const existing= await Category.findOne({name:name});
        if(existing){
            return res.status(400).json({error:"name already exists please choose another Name"});
        }
        const updateCategory= await Category.findByIdAndUpdate({_id:id},{$set:{name:name,description:description}},{new:true});
        if(updateCategory){
            return res.json({ success: true, redirectUrl: '/admin/category' });
        }else{
            return res.status(400).json({ error: "Category not found" });
        }
    } catch (error) {
        res.status(500).json({error:"Internal Server error"});
    }
}


module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnListCategory,
    getEditCategory,
    editCategory
};
