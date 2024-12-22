const User= require('../../models/userSchema');
const ReferralOffer=require('../../models/referralOfferSchema');
const Config= require('../../models/configSchema');




const getReferralPage=async(req,res)=>{
    try {
        const totalReferrals= await ReferralOffer.countDocuments({status:{$in:['COMPLETED', 'REWARDED']}})
        const totalRewardPaid= await ReferralOffer.aggregate([
            {$match:{status:"REWARDED"}},
            {$group:{_id:null,total:{$sum:'$rewardAmount'}}}
        ]);
        const config= await Config.findOne({key:'referralReward'});

        res.render('referralCode',{
            totalReferrals,
            totalRewardPaid:totalRewardPaid[0]?.total||0,
            config:config,
        });
    } catch (error) {
        res.redirect('/pageError');

    }
}
//==========================================================
const updateRewardsConfig=async(req,res)=>{
    try {
        const {referrerReward,newUserReward}=req.body;
        await Config.findOneAndUpdate({key:'referralReward'},{
            referrerReward: Number(referrerReward),
            newUserReward: Number(newUserReward),
        },{upsert:true,new:true});

        res.status(200).json({success:true,message:'Reward Configuration updated successfully'})
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update rewards configuration.' });
    }
}


module.exports={
getReferralPage,
updateRewardsConfig,

}