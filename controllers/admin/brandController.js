const Brand= require('../../models/brandSchema');
const Product= require('../../models/productSchema');
const { countDocuments } = require('../../models/userSchema');


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
        const brands = await Brand.find(); // Fetch existing brands
        return res.render('add-brands', { data: brands, error: null }); // Pass brands to template
    } catch (error) {
        console.error("Error fetching brands:", error);
        res.redirect('/pageError');
    }
};

const addBrands= async(req,res)=>{
    try {
        const brand=req.body.name;
        const findBrand= await Brand.findOne({brandName:brand});
        if(findBrand){
            return res.render('add-brands',{
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

const deleteBrands= async(req,res)=>{
    try {
        const {id}= req.params;
        if(!id){
            return res.status(400).redirect("/pageError")
        }
        await Brand.deleteOne({_id:id});
        res.redirect("/admin/addBrands");
    } catch (error) {
        console.error("error for deleting brands",error);
        res.status(500).redirect("/pageError")
    }
}



module.exports={
    getBrandPage,
    getAddBrands,
    addBrands,
    blockBrands,
    unBlockBrands,
    deleteBrands
}