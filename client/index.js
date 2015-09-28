Accounts.ui.config({
    requestPermissions: {
        slack: ['identify', 'read']
    }
});

Template.registerHelper("Schemas", Schemas);

// Loader from http://codepen.io/anon/pen/EjmjLP
Session.set('searchCount', 0);
Session.set('searchResults', []);
Session.set('searchLoading', false);

var formatMessage = function(message) {
    return message
        .replace("<!channel>", "@channel")
        .replace("<!group>", "@group")
        .replace("<!everyone>", "@everyone")
        .replace(/<#(C\w*)>/g, function(match, channelId) {
            return "#" + channelId; // TODO Replace with channel name
        }).replace(/<@(U\w*)>/g, function(match, userId) {
            return "@" + userId; // TODO Replace with username
        }).replace(/<(\S*)>/g, function(match, link) {
            return '<a href="'+link+'">'+link+'</a>';
        });
};

Template.registerHelper('loggedUser', function() {
    return Meteor.user();
});
Template.registerHelper('formatDate', function(date) {
    return moment(date).format('LL');
});
Template.registerHelper('formatTimestamp', function(ts) {
    return moment.unix(ts.split('.')[0]).format('LLLL');
});
Template.registerHelper('formatMessage', function(message) {
    return formatMessage(message);
});
Template.registerHelper('quoteOfTheDay', function() {
    if (!Meteor.user())
        return;

    var start = new Date();
    start.setHours(0);
    start.setMinutes(0);
    start.setSeconds(0);
    var end = new Date();
    end.setHours(24);
    end.setMinutes(0);
    end.setSeconds(0);

    return QuotesCollection.findOne({
        teamId: Meteor.user().profile.team_id,
        day: {
            $gte: start,
            $lte: end
        }
    });
});
Template.registerHelper('avatar', function(memberId) {
    var member = TeamMemberCollection.findOne({
        id: memberId,
        teamId: Meteor.user().profile.team_id
    });

    return member ? member.profile.image_48 : null;
});
Template.registerHelper('team', function() {
    return TeamCollection.findOne({id: Meteor.user().profile.team_id});

});
Template.quote.created = function () {
    var self = this;
    this.ready = new ReactiveVar(false);

    this.autorun(function () {
        // Subscribe on login
        if (Meteor.user()) {
            self.subscription = Meteor.subscribe('quoteOfTheDay', Meteor.user().profile.team_id);
            if (self.subscription.ready()) {
                self.ready.set(true);
            } else {
                self.ready.set(false);
            }
        }
    }.bind(this));
};

Template.quote.helpers({
    isReady: function () {
        return Template.instance().ready.get();
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

        if (search == '') {
            return;
        }

        Session.set('searchLoading', true);
        Meteor.call('slack-search', {query: search, sort: 'timestamp'}, function(error, data) {
            if (!error && data) {
                // TODO Only display message for today
                Session.set('searchCount', data.total);
                Session.set('searchResults', data.matches);
            }

            Session.set('searchLoading', false);
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

Template.quotes.helpers({
    isReady: function() {
        return FlowRouter.subsReady("quotes")
    },
    quotes: function() {
        return QuotesCollection.find(
            {
                teamId: Meteor.user().profile.team_id
            },
            {sort: {day: -1}}
        );
    }
});

Template.members.helpers({
    isReady: function() {
        return FlowRouter.subsReady("members")
    },
    members: function() {
        return TeamMemberCollection.find(
            {
                teamId: Meteor.user().profile.team_id
            }
        );
    }
});

Template.member.helpers({
    member: function() {
        return TeamMemberCollection.findOne({
            teamId: Meteor.user().profile.team_id,
            _id: FlowRouter.getParam('userId')
        });
    }
});

Template.achievements.events({
    'click #removeAchievement': function(event, context) {
        event.preventDefault();

        var deleteConfirmed = confirm('Are you sure to delete this achievement ?');
        if (deleteConfirmed) {
            Meteor.call('deleteAchievement', this._id, function(error, result) {
                if (error) {
                    // TODO Handle error
                }
            });
        }
    },
});

Template.achievements.helpers({
    isReady: function() {
        return FlowRouter.subsReady("achievements")
    },
    achievements: function() {
        var achievements = AchievementsCollection.find({ teamId: Meteor.user().profile.team_id });
        return achievements;
    },
    unlockedBy: function() {
        return TeamMemberCollection.find({achievements: {$in: [this._id]}}).fetch();
    }
});

Template.addAchievement.helpers({
    achievementsData: function () {
        return AchievementsCollection.find().map(function (c) {
            return {label: c.name + ' - ' + c.description, value: c._id};
        });
    }
});

AutoForm.hooks({
    achievementForm: {
        before: {
            insert: function (doc, template) {
                if (Meteor.user()) {
                    doc.teamId = Meteor.user().profile.team_id;
                    return doc;
                } else {
                    return false;
                }
            }
        }
    },
    achievementSelect: {
        onSubmit: function (data) {
            var self = this;
            data.userId = FlowRouter.getParam('userId');
            Meteor.call('unlockAchievement', data, function(error, result) {
                if (error) {
                    self.done(new Error(error));
                } else {
                    self.done();
                }
            });

            return false;
        }
    }
});

Template.unlockedAchievements.helpers({
    achievements: function() {
        var member = TeamMemberCollection.findOne({_id: FlowRouter.getParam('userId')});

        if (member.achievements) {
            return AchievementsCollection.find({_id: {$in: member.achievements}});
        }
    }
});

Template.unlockedAchievements.events({
    'click #removeToUser': function(event, context) {
        event.preventDefault();

        var deleteConfirmed = confirm('Are you sure to remove this achievement ?');
        if (deleteConfirmed) {
            Meteor.call('removeAchievementForUser', this._id, FlowRouter.getParam('userId'));
        }
    },
});

Template.parameters.events({
    'submit #parameters': function(event) {
        event.preventDefault();
        Meteor.call('setHook', event.target.webhook.value);
    }
});
