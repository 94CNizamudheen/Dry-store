const ShippingData= require('../../models/shippingData');


const loadShipping=async(req,res)=>{
    try {
        const shippingDetails= await ShippingData.find();
        res.render('shipping',{shipping:shippingDetails});
    } catch (error) {
        res.redirect('/pageError');
    }
};
const addState=async(req,res)=>{
   try {
    const {state,charge}= req.body;
    const existingState= await ShippingData.findOne({state:state.trim()});

    if(existingState){
        return res.status(400).json({message:"State already existing"});
    };
    const newState= new ShippingData({
        state:state.trim(),
        charge:charge,
    });
    await newState.save();
    res.status(200).json({state:newState.state,charge:newState.charge})
   } catch (error) {
     res.status(500).json({message:"Internal Server error for Add state"});
   }

};
const updateShipping= async(req,res)=>{
    try {
        const {state,charge}=req.body;
        if(!state){
            return res.status(400).json({message:"State not found"});
        }
        const shippingDetails= await ShippingData.findOneAndUpdate({
            state:state,
            charge:charge,
        });
        await shippingDetails.save();
        res.status(200).json({message:"shipping Charge updated Successfully"})

        
    } catch (error) {
        res.status(500).json({message:"Internal server Error"});
    }
}
module.exports={
    loadShipping,
    addState,
    updateShipping,
    
}