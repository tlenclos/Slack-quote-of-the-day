// TODO Write schemas
TeamCollection = new Meteor.Collection("team");
QuotesCollection = new Meteor.Collection("quotes");
TeamMemberCollection = new Meteor.Collection("team_member");

AchievementsCollection = new Meteor.Collection("achievements");
AchievementsCollection.attachSchema(new SimpleSchema({
    name: {
        type: String,
        label: "Name",
    },
    description: {
        type: String,
        label: "Description"
    },
    teamId: {
        type: String
    }
}));
