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

// Global variables (needs tp be put in its own middleware)
app.use(function(req, res, next){
    res.locals.errors = null; // the global var 'errors'
    next();
})

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

app.get('/update_blog_entry/:id', function(req, res){

    db_blog_entries.blog_entries.findOne({
        _id: mongojs.ObjectId(req.params.id)
    }, function(err, doc){

        // Can immediately pass title, date and entry text as is, but it's 
        // better to parse the tags into one string before sending

        if(doc.entry_tags.length > 0){
            var all_tags = '~' + doc.entry_tags.join(' ~')
        }
        else{
            var all_tags = '';
        }
        console.log(all_tags)

        var entry_data = {
            entry_title: doc.entry_title,
            entry_date: doc.entry_date,
            entry_text: doc.entry_text,
            entry_tags: all_tags
        }

        console.log(doc);

        res.render('update_blog_entry', {
            title: 'Update blog entry',
            entry_data: entry_data
        });

    })
});

app.get('/filter_entries_by_tag/:tag', function(req, res){

    console.log("filtering by tag")
    console.log(req.params.tag)

    db_blog_entries.blog_entries.find({
        entry_tags: req.params.tag
    }, function(err, docs){
        console.log(docs);
        res.render('filter_entries_by_tag', {
            title: 'Filtering entries by tag',
            blog_entries: docs,
            tag: req.params.tag
        });
    })

});

// Post function
app.post('/create_new_blog_entry', function(req, res){

    req.checkBody('new_entry_title', 'Entry title is required').notEmpty();
    req.checkBody('new_entry_date', 'Entry date is required').notEmpty();
    req.checkBody('new_entry_text', 'Entry text is required').notEmpty();

    var errors = req.validationErrors();

    console.log('Tags are coming next:')
    console.log(req.body.new_entry_tags);

    // Now need to parse the tags text input into an array of the 
    // individual tags

    if(req.body.new_entry_tags.length > 0){
        var all_tags = req.body.new_entry_tags + ' ' // added a blank to the
        // end to make the below code simpler
    }
    else{
        var all_tags = req.body.new_entry_tags
    }

    console.log(all_tags)
    var tags_array = [];
    var string_array = []
    for(var x = 0; x < all_tags.length; x++){
        if(all_tags.charAt(x) == ' ' && all_tags.charAt(x-1) != ' '){
            // Then we have started a new word or we have come to the end of the
            // tags, so turn string array into an actual string before resetting 
            // it to be [] again

            var converted_string = string_array.join("");
            tags_array.push(converted_string);
            string_array = [];
        }
        else if(all_tags.charAt(x) != '~' && all_tags.charAt(x) != ' '){
            // Then we are inside a tag, so add the character to string_array
            string_array.push(all_tags.charAt(x))
        }
    }

    console.log('Tags array is:')
    console.log(tags_array)

    if(errors){
        // If there are any errors, log to console and refresh the page
        console.log('ERRORS');
        console.log(errors);
        res.render('create_new_blog_entry', {
            title: 'Create new blog entry',
            errors: errors
        });
    }
    else {

        var new_blog_entry = {
            entry_title: req.body.new_entry_title,
            entry_date: req.body.new_entry_date,
            entry_text: req.body.new_entry_text,
            entry_tags: tags_array
        }

        console.log(new_blog_entry);

        // Now insert this into the database

        db_blog_entries.blog_entries.insert(new_blog_entry, function(err, result){
            if(err){
                console.log(err);
            }
            res.redirect('/')
        })

    }

})

// Used for updating/editing existing blog entries
app.post('/update_blog_entry/:id', function(req, res){

    console.log("Editing/updating blog entry")

    // Same code as in the create_blog entry post route to parse the tags 
    // text input into an array of the individual tags

    if(req.body.update_entry_tags != ""){
        var all_tags = req.body.update_entry_tags + ' ' // added a blank to the
        // end to make the below for loop simpler
    }
    else{
        var all_tags = req.body.update_entry_tags
    }

    var tags_array = [];
    var string_array = [];

    for(var x = 0; x < all_tags.length; x++){
        if(all_tags.charAt(x) == ' ' && all_tags.charAt(x-1) != ' '){
            // Then we have started a new word or we have come to the end of the
            // tags, so turn string array into an actual string before resetting 
            // it to be [] again

            var converted_string = string_array.join("");
            tags_array.push(converted_string);
            string_array = [];
        }
        else if(all_tags.charAt(x) != '~' && all_tags.charAt(x) != ' '){
            // Then we are inside a tag, so add the character to string_array
            string_array.push(all_tags.charAt(x))
        }
    }

    req.checkBody('update_entry_title', 'Entry title is required').notEmpty();
    req.checkBody('update_entry_date', 'Entry date is required').notEmpty();
    req.checkBody('update_entry_text', 'Entry text is required').notEmpty();

    var errors = req.validationErrors();

    if(errors){
        // Log to console and refresh the page to show the errors in the
        // view
        console.log(errors);

        // Still also need to fetch the original blog entry data again
        // to display the data after the page refresh

        db_blog_entries.blog_entries.findOne({
            _id: mongojs.ObjectId(req.params.id)
        }, function(err, doc){

            console.log(doc);

            res.render('update_blog_entry', {
                title: 'Update blog entry',
                entry_data: doc,
                errors: errors
            });

        })

    }
    else {

        // No errors, so we can update the entry in the database

        var updated_blog_entry = {
            entry_title: req.body.update_entry_title,
            entry_date: req.body.update_entry_date,
            entry_text: req.body.update_entry_text,
            entry_tags: tags_array
        }

        db_blog_entries.blog_entries.findAndModify({
            query: {_id: mongojs.ObjectId(req.params.id)},
            update: {$set: updated_blog_entry},
            new: true
        }, function(err, doc, lastErrorObject){
            if(err){
                console.log(err);
            }
            res.redirect('/')
        })

    }

})

// Delete functions
app.delete('/delete_blog_entry/:id', function(req, res){

    console.log('deleting entry')

    db_blog_entries.blog_entries.remove({
        _id: mongojs.ObjectId(req.params.id)
    }, function(err, result){
        if(err){
            console.log(err)
        }
        res.redirect('/')
    })

})

app.listen(3000, function(){
    console.log('Server started on port 3000');
});