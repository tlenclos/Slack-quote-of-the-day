FlowRouter.route('/', {
    action: function() {
        FlowLayout.render('layout', { top: "header", main: "search" });
    }
});

FlowRouter.route('/all', {
    subscriptions: function(params, queryParams) {
        this.register('quotes', Meteor.subscribe('quotes', Meteor.user().profile.team_id));
    },
    action: function() {
        FlowLayout.render('layout', { top: "header", main: "all" });
    }
});
