

const fs= require('fs');
const path= require('path');
const sharp =require('sharp');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');






const getProductaddPage=async(req,res)=>{
    try {
        const category= await Category.find({isListed:true});
        const brand =await Brand.find({isBlocked:false});
        res.render('add-product',{
            cat:category,
            brand:brand,
        })
         
    } catch (error) {
        res.redirect('/pageError');
    }
};

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        const images = [];
        if (req.files && req.files.length > 0) {
            const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg','image/webp'];
            for (let file of req.files) {
                if (!validImageTypes.includes(file.mimetype)) {
                    return res.status(400).json("Only image files (PNG, JPEG, JPG, webp) are allowed.");
                }
                const originalImagePath = file.path;
                const resizedImagePath = path.join("public", "uploads", "product-images", file.filename);
                await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                images.push(file.filename);
            }
        }
        
        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            return res.status(400).json("Invalid Category Name");
        }
        const existingProduct= await Product.findOne({productName:products.productName})
        if(existingProduct){
            return res.status(400).json("Product already Exists");
        }

        // Creating a new product
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand,
            category: categoryId._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            createdON: new Date(),
            quantity: products.quantity,
            productImage: images,
            status: "Available",
        });

        await newProduct.save();
        return res.redirect('/admin/addProduct');
    } catch (error) {
        console.error("Error saving product:", error);
        res.redirect("/admin/pageError");
    }
};

const getAllProducts= async(req,res)=>{
    try {
        const search= req.query.search|| '';
        const page= parseInt(req.query.page,10)||1;
        let limit= 4;
        const productData= await Product.find({
            $or:[
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ],
        })  .limit(limit*1)
           .skip((page-1)*limit)
           .populate('category')
           .sort({createdAt:-1})
           

        const count= await Product.find({
            $or:[
                {productName:{$regex:   new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}},
            ]
        }).countDocuments();

        const category= await Category.find({isListed:true});
        const brand= await Brand.find({isBlocked:false});
        if(category && brand){
            res.render('products',{
                data:productData,
                currentpage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                brand:brand,
                search,
            })
        }else{
            res.render('page-404');
        }


    } catch (error) {
        res.redirect('/pageError');
    }
};

const addProductOffer = async (req, res) => {
    try {
        const { percentage, productId } = req.body;
        console.log(percentage);

        const findProduct = await Product.findOne({ _id: productId });
        const findCategory = await Category.findOne({ _id: findProduct.category });

        if (findCategory.categoryOffer >= percentage) {
            return res.json({ status: false, message: 'This product already has a Category Offer and is and its more than this % ' });
        }

        findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);

        await findProduct.save();

        findCategory.categoryOffer = 0;
        await findCategory.save();

        return res.json({ status: true });

    } catch (error) {
        console.error(error);

        if (!res.headersSent) {
            res.redirect('/pageError'); 
            return res.status(500).json({ message: "Internal server error" });
        }
    }
};

const removeProductOffer=async(req,res)=>{
    try {
        const{productId}= req.body;
        const findProduct= await Product.findOne({_id:productId});
        const percentage= findProduct.productOffer;
        findProduct.salePrice=  findProduct.salePrice + Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer=0;
        await findProduct.save();
        res.json({status:true})
    } catch (error) {
        res.redirect('/pageError');

    }
};

const blockProduct=async(req,res)=>{
    try {
        let id= req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/products')

    } catch (error) {
        res.redirect('/pageError')
    }
};

const unBlockProduct=async(req,res)=>{
    try {
        let id= req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageError')
    }
};

const getEditProduct = async (req, res) => {
    try {
        const id= req.query.id;
        const product = await Product.findById(id);
        const category = await Category.find();
        const brand = await Brand.find({});
        res.render('edit-product', {
            product: product,
            cat: category,
            brand: brand,
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageError');
    }
};

const editProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const data = req.body;

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id },
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Entered same Name. Please try another name." });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        const category = await Category.findOne({name:data.category})

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: category._id,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
        };

 
        const updateQuery = images.length > 0 
            ? { ...updateFields, $push: { productImage: { $each: images } } }
            : updateFields;

        await Product.findByIdAndUpdate(id, updateQuery, { new: true });
        
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.redirect('/pageError');
    }
};

const deleteSingleImage= async(req,res)=>{
    try {
        const{imageNameToServer,productIdToServer}=req.body;
        const product= await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath=path.join("public","upload","product-images",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`image ${imageNameToServer} successfully deleted`);
        }else{
            console.log(`image ${imageNameToServer} not found`);
        }
        res.send({status:true,})

    } catch (error) {
        res.redirect('/pageError');
    }
};
 const loadInventoryManagment= async(req,res)=>{
    try {
        const page= parseInt(req.query.page)||1;
        const limit= parseInt(req.query.limit)||8;
        const skip= (page-1)*limit;
        const totalProducts= await Product.countDocuments();
        const products= await Product.find({}).populate('category').skip(skip).limit(limit).sort({createdAt:-1});
        if(!products){
            return res.status(400).json({message:"No products"});
        }
        res.render('inventoryManagement',{
            products:products,
            totalPages:Math.ceil(totalProducts/limit),
            currentPage:page,
        })
        
    } catch (error) {
        console.error("error for loading invetory");
        res.redirect('/pageError');
    }
 };

 const updateInventory = async(req,res)=>{
    try {
        console.log("Inventory updation Invoked");
        const {productId}= req.params;
        const {quantityChange,reason,notes}= req.body;
        if(!quantityChange ||!reason){
            return res.status(400).json({message:"Quantity and Reason are required"});
        }
        const product= await Product.findById(productId);
        if(!product){
            return res.status(400).json({message:"Product not Found"});
        }
        const newQuantity= product.quantity +=quantityChange;
        if (newQuantity<0){
            return res.status(400).json({message:"Insufficient Stock"});
        }

        product.quantity= newQuantity;
        product.status= newQuantity>0 ? "Available" :"Out of stock";

        product.stockHistory.push({
            quantity:quantityChange,
            reason,
            notes,
        });
        await product.save();
        res.status(200).json({message:"Inventory updated SuccessFully.",product});

    } catch (error) {
        console.error('Error for stock updation',error);
        res.status(500).json({error:"Internal server error while updating product inventory"});
    }
 };


module.exports={
    getProductaddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    loadInventoryManagment,
    updateInventory
}