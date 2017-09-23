var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var expressValidator = require('express-validator');
var mongojs = require('mongojs');

var db_blog_entries = mongojs('blog-app', ['blog_entries']);

var app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for body-parser
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: false
}));

// Set path for static resources (css files etc.)
app.use(express.static(path.join(__dirname, 'public')))

// express-validator middleware
app.use(expressValidator({
    errorFormatter: function(param, msg, value){
        var namespace = param.split('.')
        , root = namespace.shift()
        , formParam = root;

        while(namespace.length){
            formParam += '[' + namespace.shift() + ']';
        }

        return {
            param: formParam,
            msg: msg,
            value: value
        }
    }
}))

// Functions used for redirecting between pages
app.get('/', function(req, res){

    db_blog_entries.blog_entries.find(function(err, docs){
        console.log(docs);
        res.render('index', {
            title: 'Blog app',
            blog_entries: docs
        });
    })

});

app.get('/create_new_blog_entry', function(req, res){
    res.render('create_new_blog_entry', {
        title: 'Create new blog entry'
    });
});

// Post function
app.post('/create_new_blog_entry', function(req, res){

    var new_blog_entry = {
        entry_title: req.body.new_entry_title,
        entry_date: req.body.new_entry_date,
        entry_text: req.body.new_entry_text
    }

    console.log(new_blog_entry);

    // Now insert this into the database

    db_blog_entries.blog_entries.insert(new_blog_entry, function(err, result){
        if(err){
            console.log(err);
        }
        res.redirect('/')
    })
})

app.listen(3000, function(){
    console.log('Server started on port 3000');
});