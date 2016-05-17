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

Schemas = {};
Schemas.achievementSelect = new SimpleSchema({
    achievement: {
        type: String,
        label: "Achievement"
    },
    userId: {
        type: String,
        autoform: {
            omit: true
        }
    }
});

FlowersCollection = new Meteor.Collection("flowers");
FlowersCollection.attachSchema(new SimpleSchema({
    name: {
        type: String,
        label: "Name",
    },
    waterNeedsDayInterval: {
        type: Number,
        label: "Interval for water"
    },
    latestCallForWater: {
        type: Date,
        label: "Latest call for water",
        optional: true
    }
}));
