// Loader from http://codepen.io/anon/pen/EjmjLP
// TODO Better display
// TODO Add icons of user

Session.set('searchCount', 0);
Session.set('searchResults', []);
Session.set('searchLoading', false);

// Subscribe on login
Deps.autorun(function(){
    if (Meteor.user()) {
        Meteor.subscribe('quotes', Meteor.user().profile.team_id);
    }
});

UI.registerHelper('loggedUser', function() {
    return Meteor.user();
});

Template.quote.helpers({
    quoteOfTheDay: function() {
        var start = new Date();
        start.setHours(0);
        start.setMinutes(0);
        start.setSeconds(0);
        var end = new Date();
        end.setHours(24);
        end.setMinutes(0);
        end.setSeconds(0);

        var quote = QuotesCollection.findOne({
            teamId: Meteor.user().profile.team_id,
            day: {
                $gte: start,
                $lte: end
            }
        });

        return quote;
    }
});

Template.quote.events({
    'click #removeQuote': function(event, context) {
        event.preventDefault();

        var deleteConfirmed = confirm('Are you sure to delete the quote "'+this.quote.text+'"');
        if (deleteConfirmed) {
            Meteor.call('deleteQuote', this._id, function(error, result) {
                if (error) {
                    // TODO Handle error
                }
            });
        }
    },
});

Template.search.events({
    'click #submit': function (event) {
        event.preventDefault();
        var search = $('input[name=search]').val();

        Session.set('searchLoading', true);
        Meteor.call('slack-search', {query: search}, function(error, data) {
            Session.set('searchCount', data.total);
            Session.set('searchResults', data.matches);
            Session.set('searchLoading', false)

            console.log(data.matches[0]);
        });
    },
    'click .markAsQuote': function(event) {
        event.preventDefault();
        Meteor.call('setQuote', this);
    }
});

Template.results.helpers({
    count: function () {
        return Session.get('searchCount') + ' résultats';
    },
    results: function() {
        return Session.get('searchResults');
    },
    loading: function() {
        return Session.get('searchLoading')
    }
});
