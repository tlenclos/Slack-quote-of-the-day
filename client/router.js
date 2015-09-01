FlowRouter.subscriptions = function() {
    if (!Meteor.user())
        return;

    this.register('team', Meteor.subscribe('team', Meteor.user().profile.team_id));
};

FlowRouter.route('/', {
    action: function() {
        FlowLayout.render('layout', { top: "header", main: "search" });
    }
});

FlowRouter.route('/quotes', {
    subscriptions: function(params, queryParams) {
        this.register('quotes', Meteor.subscribe('quotes', Meteor.user().profile.team_id));
        this.register('members', Meteor.subscribe('members', Meteor.user().profile.team_id));
    },
    action: function() {
        FlowLayout.render('layout', { top: "header", main: "quotes" });
    }
});

FlowRouter.route('/team', {
    subscriptions: function(params, queryParams) {
        this.register('members', Meteor.subscribe('members', Meteor.user().profile.team_id));
    },
    action: function() {
        FlowLayout.render('layout', { top: "header", main: "team" });
    }
});
