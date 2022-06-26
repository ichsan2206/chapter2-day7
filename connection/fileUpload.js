const multer = require('multer')
const storage = multer.diskStorage({
    destination: function(request, response, result){
        result(null, "upload")
    },
    filename: function(request, file, result){
        result(null, Date.now() + '-' + file.originalname)
    }
})

const upload = multer({storage})

module.exports = upload
