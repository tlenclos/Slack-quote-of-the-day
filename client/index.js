Session.set('searchCount', 0);
Session.set('searchResults', []);

Template.index.helpers({
    quoteOfTheDay: function() {
        var start = new Date();
        start.setHours(0);
        var end = new Date();
        end.setHours(23);

        var quote = QuotesCollection.findOne({
            day: {
                $gte: start,
                $lte: end
            }
        });

        console.log(quote);
        return quote;
    }
});

Template.search.events({
    'submit form': function (event) {
        event.preventDefault();
        var search = $('input[name=search]').val();

        Meteor.call('slack-search', {query: search}, function(error, data) {
            Session.set('searchCount', data.total);
            Session.set('searchResults', data.matches);
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
    }
});
