const Brand= require('../../models/brandSchema');
const Product= require('../../models/productSchema');
const { countDocuments } = require('../../models/userSchema');
const fs= require('fs');
const path= require('path');


const getBrandPage=async(req,res)=>{
    try {
        const page= parseInt(req.query.page)||1;
        const limit=4;
        const skip= (page-1)*limit;
        const brandData= await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages= Math.ceil(totalBrands/limit);
        const reverseBrand=brandData.reverse();
        res.render('brands',{
            data:reverseBrand,
            currentPage:page,
            totalPages:totalPages,
            totalBrands:totalBrands,
        })
    } catch (error) {
        res.redirect("/pageError");
    }
};
const getAddBrands = async (req, res) => {
    try {
        const brands = await Brand.find(); 
        return res.render('add-brands', { data: brands, error: null }); 
    } catch (error) {
        res.redirect('/pageError');
    }
};

const addBrands= async(req,res)=>{
    try {
        const brand=req.body.name;
        const findBrand= await Brand.findOne({brandName:brand});
        const brands= await Brand.find({})
        if(findBrand){
            return res.render('add-brands',{
                data:brands,
                error:{name:"Brand already exists. Please choose a different name."},
               
            })
        }  
        if(brand && req.file){
            const image=req.file.filename;
            const newBrand= new Brand({
                brandName:brand,
                brandImage:image,
            });
            await newBrand.save();
            res.redirect('/admin/addBrands')
        }else{
            return res.render('add-brands',{
                data:brands,
                error:{image:"Brand name or image is missing."},
              
            }) 
        } 
    } catch (error) {
        res.redirect('/pageError')
    }
};

const blockBrands= async(req,res)=>{
    try {
        const id= req.params.id;
        
        await Brand.findOneAndUpdate({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/addBrands")
    } catch (error) {
        res.redirect('/pageError')
    }
}

const unBlockBrands= async(req,res)=>{
    try {
        const id= req.params.id;
        await Brand.findOneAndUpdate({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/addBrands');
    } catch (error) {
        res.redirect("/pageError")
    }
}

const deleteBrands = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).redirect("/pageError");
        }

        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).redirect("/pageError");
        }

        
        const brandImage = Array.isArray(brand.brandImage) ? brand.brandImage[0] : brand.brandImage;

        if (brandImage) {
            const imagePath = path.join(__dirname, "/uploads/images", brandImage); 
           

            if (fs.existsSync(imagePath)) {
                await fs.unlinkSync(imagePath);
               
            }
        } 
        await Brand.deleteOne({ _id: id });
        res.redirect("/admin/addBrands");

    } catch (error) {
        console.error("Error deleting brand:", error);
        res.status(500).redirect("/pageError");
    }
};




module.exports={
    getBrandPage,
    getAddBrands,
    addBrands,
    blockBrands,
    unBlockBrands,
    deleteBrands
}