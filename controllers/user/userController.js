const pageNotFound= async(req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect("/pageNoteFound")
    }
}


const  loadHomepage= async(req,res)=>{
    try {
        return res.render("home")
    } catch (error) {
        console.log("Home page not Found");
        res.status(500).send("server error");
    }
}


module.exports={
    loadHomepage,
    pageNotFound,
}