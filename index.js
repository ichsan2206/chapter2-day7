const { request, query } = require('express');
const express = require('express');
const moment = require('moment');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const upload = require('./connection/fileUpload')

const app = express()
const port = process.env.PORT || 8000

app.use(flash())
app.use(session({
    secret: 'sesiStorage',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 3 * 60 * 60 * 1000 // 3 JAM
     }
}))
const db = require('./connection/db');

app.set('view engine', 'hbs') // set view engine hbs

app.use('/assets', express.static(__dirname + '/assets')) 
app.use('/upload', express.static(__dirname + '/upload')) 
app.use(express.urlencoded({extended: false}))

db.connect(function(err, client, done){
    if (err) throw err // menampilkan error koneksi database


app.get('/register', function(request, response){
    response.render('register')
})

app.post('/register', function(request, response){

    let {inputNames, inputEmail, inputPassword} = request.body

    const hashedPassword = bcrypt.hashSync(inputPassword, 10)

    const query = `INSERT INTO public.tb_user(
       name, email, password)
        VALUES ('${inputNames}', '${inputEmail}','${hashedPassword}');`
 
     client.query(query, function(err, result){
         if(err) throw err
 
         response.redirect('/login')
     }) 
 })


 app.get('/login', function(request, response){
    response.render('login')
})

app.post('/login', function(request, response){

let {inputEmail, inputPassword} = request.body


// if (request.body.swpw) {
//     inputPassword.type = "text";
// } else {
//     inputPassword.type = "password";
// }

const query = `SELECT * FROM tb_user WHERE email='${inputEmail}'`

  client.query(query, function(err, result){
    if(err) throw err
    
    if(result.rows.length == 0){
        request.flash('danger', 'Email belum terdaftar')
        return response.redirect('/login')
    }


  const Match = bcrypt.compareSync(inputPassword, result.rows[0].password)

            if(Match){
                // Memasukan data kedalam session
                request.session.isLogin = true
                request.session.user = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email,
                }

                request.flash('success', 'Anda Berhasil Login')
                response.redirect('/')

            } else {
                // console.log('Password salah');
                request.flash('danger', 'Periksa Kembali Password Anda')
                response.redirect('/login')
            }
        })

})


app.get('/', function(request, response){

let query = `SELECT tb_projects.id, tb_projects.name, tb_user.name as author, tb_projects.start_date, tb_projects.end_date, tb_projects.description, tb_projects.technologies, tb_projects.image, tb_projects.author_id
FROM tb_projects LEFT JOIN tb_user ON tb_projects.author_id = tb_user.id
ORDER BY start_date DESC`

        client.query(query, function(err, result){
           
            if (err) throw err

            let data = result.rows

            let  dataProjects= data.map(function(item){
                return {
                    ...item,
                    durasi: duration(item.start_date, item.end_date),
                    isLogin: request.session.isLogin

                }
            })

            let filterPostID
            if(request.session.user){
                filterPostID = dataProjects.filter(function(item) {
                    return item.author_id === request.session.user.id
                })
            }

            let resultBlog = request.session.user ? filterPostID : dataProjects 

            response.render('index',{ projects: resultBlog, user: request.session.user, isLogin: request.session.isLogin})
        })
    })

app.get('/logout', function(request, respons){
    request.session.destroy()

    respons.redirect('/')
})

app.get('/contact', function(request, response){
    response.render('contact',{user: request.session.user, isLogin: request.session.isLogin})
})


app.get('/myproject', function(request, response){
    response.render('myproject',{user: request.session.user, isLogin: request.session.isLogin})
})

app.post('/myproject',upload.single('inputImage'), function(request, response){
    
    const data = request.body
    const image = request.file.filename
    const technologies = []
    const authorId = request.session.user.id

    if (data.node) {
        technologies.push('node');
    } else {
        technologies.push('')
    }
    if (data.react) {
        technologies.push('react');
    } else {
        technologies.push('')
    }
    if (data.android) {
        technologies.push('android');
    } else {
        technologies.push('')
    }
    if (data.java) {
        technologies.push('java');
    } else {
        technologies.push('')
    }

    const query = `INSERT INTO tb_projects(
       name, start_date, end_date, description, technologies, image, author_id)
        VALUES ( '${data.inputTitle}', '${data.startDate}', '${data.endDate}', '${data.inputDescription}', Array ['${technologies[0]}', '${technologies[1]}','${technologies[2]}', '${technologies[3]}'],'${image}','${authorId}');`

    client.query(query, function(err, result){
        if(err) throw err

        response.redirect('/')
    })
})

app.get('/detail-project/:id', function(request, response){

    let id = request.params.id
    
    const query =  `SELECT * FROM public.tb_projects WHERE id=${id}`
    client.query(query, function(err,result){
    if(err) throw err;

    const detail = result.rows[0];
    detail.start_date = moment(detail.start_date).format('DD MMM YYYY')
    detail.end_date = moment(detail.end_date).format('DD MMM YYYY')
    detail.durasi = duration(detail.start_date, detail.end_date);
    response.render("detail-project",{detailP: detail, id, user: request.session.user, isLogin: request.session.isLogin})
    })
})

app.get('/delete-project/:id', function(request, response){
   
    const id = request.params.id
    const query = `DELETE FROM public.tb_projects   WHERE id=${id};`

    client.query(query, function(err, result){
        if(err) throw err

        response.redirect('/')
    })
})

app.get('/update/:id', function(request, response){

    let id = request.params.id
    const query =  `SELECT * FROM public.tb_projects WHERE id=${id}`
    client.query(query, function(err,result){
    if(err) throw err;

    const dataUpdate = result.rows[0];
    dataUpdate.start_date = moment(dataUpdate.start_date).format('YYYY-MM-DD')
    dataUpdate.end_date = moment(dataUpdate.end_date).format('YYYY-MM-DD')
    response.render("update",{update: dataUpdate, id, user: request.session.user, isLogin: request.session.isLogin})
});
})

app.post('/update/:id', function(request, response){

let id = request.params.id;
data = request.body;

 const technologies = []

    if (data.node) {
        technologies.push('node');
    } else {
        technologies.push('')
    }
    if (data.react) {
        technologies.push('react');
    } else {
        technologies.push('')
    }
    if (data.android) {
        technologies.push('android');
    } else {
        technologies.push('')
    }
    if (data.java) {
        technologies.push('java');
    } else {
        technologies.push('')
    }

    const query = `UPDATE tb_projects 
    SET name = '${data.inputTitle}', start_date = '${data.startDate}', end_date = '${data.endDate}', description = '${data.inputDescription}', technologies = Array ['${technologies[0]}', '${technologies[1]}','${technologies[2]}', '${technologies[3]}'], image='${data.inputImage}' 
    WHERE id=${id};`

 client.query(query, function(err, result){
     if(err) throw err

response.redirect('/');
});
})

app.listen(port, function(){
    console.log(`Server running on port ${port}`);
})

})

function duration(startDate, endDate) {
    let startM = new Date (startDate).getMonth();
       let endM = new Date (endDate).getMonth()
       let startY = new Date (startDate).getFullYear();
       let endY= new Date (endDate).getFullYear();
       let selisihHasil = (startM+12*endY)-(endM+12*startY);
     return  Math.abs(selisihHasil);
}
